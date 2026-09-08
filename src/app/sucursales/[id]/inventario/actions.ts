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

  if (!insumo_id || (tipo !== "entrada" && tipo !== "salida") || !cantidad || cantidad <= 0) {
    return { error: "Completá insumo, tipo y una cantidad mayor a cero." };
  }

  const { error } = await supabase.from("movimientos_inventario").insert({
    sucursal_id: sucursalId,
    insumo_id,
    tipo,
    cantidad,
    precio,
    importe_total: precio ? precio * cantidad : null,
    registrado_por: user?.id,
  });

  if (error) {
    return { error: error.message };
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
      registrado_por: user?.id,
    })),
  );

  if (error) {
    return { error: error.message, guardado: false };
  }

  revalidatePath(`/sucursales/${sucursalId}/inventario`);
  return { error: null, guardado: true };
}

export async function actualizarUnidadInsumo(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const insumoId = String(formData.get("insumo_id") ?? "");
  const unidad = String(formData.get("unidad") ?? "").trim();
  if (!insumoId || !unidad) return;

  await supabase.from("insumos").update({ unidad }).eq("id", insumoId);

  revalidatePath("/sucursales/[id]/inventario", "page");
}

export async function actualizarCategoriaInsumo(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const insumoId = String(formData.get("insumo_id") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
  if (!insumoId || !["medicos", "varios"].includes(categoria)) return;

  await supabase.from("insumos").update({ categoria }).eq("id", insumoId);

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
