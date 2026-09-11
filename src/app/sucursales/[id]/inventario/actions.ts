"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RegistrarMovimientoEstado = { error: string | null };

export async function registrarMovimiento(
  sucursalId: string,
  _estado: RegistrarMovimientoEstado,
  formData: FormData,
): Promise<RegistrarMovimientoEstado> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insumo_id = String(formData.get("insumo_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const cantidad = Number(formData.get("cantidad") ?? 0);
  const precioRaw = String(formData.get("precio") ?? "");
  const precio = precioRaw ? Number(precioRaw) : null;
  const residente_id = String(formData.get("residente_id") ?? "") || null;
  const imputarResidente = formData.get("imputar_residente") === "on" && tipo === "salida";

  if (!insumo_id || (tipo !== "entrada" && tipo !== "salida") || !cantidad || cantidad <= 0) {
    return { error: "Completá insumo, tipo y una cantidad mayor a cero." };
  }

  const importe_total = precio ? precio * cantidad : null;

  if (imputarResidente && (!residente_id || !importe_total)) {
    return {
      error: "Para imputar el gasto a un residente, elegí el residente y completá un precio.",
    };
  }

  const { data: movimiento, error } = await supabase
    .from("movimientos_inventario")
    .insert({
      sucursal_id: sucursalId,
      insumo_id,
      tipo,
      cantidad,
      precio,
      importe_total,
      residente_id,
      registrado_por: user?.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    return { error: error.message };
  }

  if (imputarResidente && residente_id && importe_total) {
    const { data: insumo } = await supabase
      .from("insumos")
      .select("nombre, unidad")
      .eq("id", insumo_id)
      .single<{ nombre: string; unidad: string }>();

    const { error: errorCargo } = await supabase.from("cargos_extra_residente").insert({
      residente_id,
      sucursal_id: sucursalId,
      movimiento_inventario_id: movimiento?.id ?? null,
      concepto: `${insumo?.nombre ?? "Insumo"} — ${cantidad} ${insumo?.unidad ?? "unidades"}`,
      monto: importe_total,
      registrado_por: user?.id ?? null,
    });

    if (errorCargo) {
      return { error: `Movimiento guardado, pero no se pudo imputar el gasto: ${errorCargo.message}` };
    }

    revalidatePath(`/residentes/${residente_id}/cuenta-corriente`);
  }

  revalidatePath(`/sucursales/${sucursalId}/inventario`);
  return { error: null };
}

export type CargaInicialEstado = { error: string | null; guardado: boolean };

export async function cargarStockInicial(
  sucursalId: string,
  _estado: CargaInicialEstado,
  formData: FormData,
): Promise<CargaInicialEstado> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const itemsRaw = String(formData.get("items") ?? "[]");
  let items: { insumo_id: string; cantidad: number }[] = [];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    items = [];
  }

  const movimientos = items.filter((i) => i.insumo_id && Number(i.cantidad) > 0);

  if (movimientos.length === 0) {
    return { error: "Cargá una cantidad mayor a cero en al menos un insumo.", guardado: false };
  }

  const { error } = await supabase.from("movimientos_inventario").insert(
    movimientos.map((m) => ({
      sucursal_id: sucursalId,
      insumo_id: m.insumo_id,
      tipo: "entrada" as const,
      cantidad: m.cantidad,
      precio: null,
      importe_total: null,
      es_inicial: true,
      registrado_por: user?.id,
    })),
  );

  if (error) {
    return { error: error.message, guardado: false };
  }

  revalidatePath(`/sucursales/${sucursalId}/inventario`);
  return { error: null, guardado: true };
}

export async function actualizarInsumo(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const insumoId = String(formData.get("insumo_id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const unidad = String(formData.get("unidad") ?? "").trim();
  const stockMinimoRaw = String(formData.get("stock_minimo") ?? "");
  const stockMinimo = stockMinimoRaw ? Number(stockMinimoRaw) : 0;
  const precioReferenciaRaw = String(formData.get("precio_referencia") ?? "").trim();
  const precio_referencia = precioReferenciaRaw ? Number(precioReferenciaRaw) : null;
  if (!insumoId || !nombre || !unidad) return;

  await supabase
    .from("insumos")
    .update({ nombre, unidad, stock_minimo: stockMinimo, precio_referencia })
    .eq("id", insumoId);

  revalidatePath("/sucursales/[id]/inventario", "page");
}

export type CrearInsumoEstado = { error: string | null };

export async function crearInsumo(
  _estado: CrearInsumoEstado,
  formData: FormData,
): Promise<CrearInsumoEstado> {
  const supabase = await createClient();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "");
  const unidad = String(formData.get("unidad") ?? "").trim() || "unidades";

  if (!nombre || !["medicos", "varios"].includes(categoria)) {
    return { error: "Completá nombre y categoría." };
  }

  const { error } = await supabase
    .from("insumos")
    .insert({ nombre, categoria, unidad, activo: true });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/sucursales/[id]/inventario", "page");
  return { error: null };
}

export async function eliminarInsumo(insumoId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("insumos").update({ activo: false }).eq("id", insumoId);
  revalidatePath("/sucursales/[id]/inventario", "page");
}
