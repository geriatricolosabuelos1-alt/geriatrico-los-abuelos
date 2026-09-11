"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type InsumoMedicoConStock = {
  id: string;
  nombre: string;
  unidad: string;
  precio_referencia: number | null;
  stock: number;
};

export async function listarInsumosMedicosConStock(
  sucursalId: string,
): Promise<InsumoMedicoConStock[]> {
  const supabase = await createClient();

  const [{ data: insumos }, { data: movimientos }] = await Promise.all([
    supabase
      .from("insumos")
      .select("id, nombre, unidad, precio_referencia")
      .eq("categoria", "medicos")
      .eq("activo", true)
      .order("nombre")
      .returns<{ id: string; nombre: string; unidad: string; precio_referencia: number | null }[]>(),
    supabase
      .from("movimientos_inventario")
      .select("insumo_id, tipo, cantidad")
      .eq("sucursal_id", sucursalId)
      .returns<{ insumo_id: string; tipo: string; cantidad: number }[]>(),
  ]);

  const stockPorInsumo = new Map<string, number>();
  (movimientos ?? []).forEach((m) => {
    const actual = stockPorInsumo.get(m.insumo_id) ?? 0;
    stockPorInsumo.set(m.insumo_id, actual + (m.tipo === "entrada" ? m.cantidad : -m.cantidad));
  });

  return (insumos ?? []).map((i) => ({
    ...i,
    stock: stockPorInsumo.get(i.id) ?? 0,
  }));
}

export type AgregarInsumosResidenteEstado = { error: string | null };

type ItemSeleccionado = { insumo_id: string; cantidad: number; precio: number };

export async function agregarInsumosResidente(
  sucursalId: string,
  residenteId: string,
  _estado: AgregarInsumosResidenteEstado,
  formData: FormData,
): Promise<AgregarInsumosResidenteEstado> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let items: ItemSeleccionado[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    items = [];
  }

  const validos = items.filter((i) => i.insumo_id && i.cantidad > 0 && i.precio > 0);

  if (validos.length === 0) {
    return { error: "Seleccioná al menos un insumo con cantidad y precio válidos." };
  }

  const { data: insumos } = await supabase
    .from("insumos")
    .select("id, nombre, unidad")
    .in("id", validos.map((i) => i.insumo_id))
    .returns<{ id: string; nombre: string; unidad: string }[]>();

  const insumoPorId = new Map((insumos ?? []).map((i) => [i.id, i]));

  for (const item of validos) {
    const insumo = insumoPorId.get(item.insumo_id);
    const importe_total = item.cantidad * item.precio;

    const { data: movimiento, error: errorMovimiento } = await supabase
      .from("movimientos_inventario")
      .insert({
        sucursal_id: sucursalId,
        insumo_id: item.insumo_id,
        tipo: "salida",
        cantidad: item.cantidad,
        precio: item.precio,
        importe_total,
        residente_id: residenteId,
        registrado_por: user?.id ?? null,
      })
      .select("id")
      .single<{ id: string }>();

    if (errorMovimiento) {
      return { error: errorMovimiento.message };
    }

    const { error: errorCargo } = await supabase.from("cargos_extra_residente").insert({
      residente_id: residenteId,
      sucursal_id: sucursalId,
      movimiento_inventario_id: movimiento?.id ?? null,
      concepto: `${insumo?.nombre ?? "Insumo"} — ${item.cantidad} ${insumo?.unidad ?? "unidades"}`,
      monto: importe_total,
      registrado_por: user?.id ?? null,
    });

    if (errorCargo) {
      return { error: `Se registró el consumo, pero no se pudo imputar el gasto: ${errorCargo.message}` };
    }
  }

  revalidatePath(`/sucursales/${sucursalId}/inventario`);
  revalidatePath(`/sucursales/${sucursalId}/residentes`);
  revalidatePath(`/residentes/${residenteId}/cuenta-corriente`);
  return { error: null };
}
