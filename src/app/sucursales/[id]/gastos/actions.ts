"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EstadoFormulario = { error: string | null };

export async function crearGastoVariable(
  sucursalId: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const supabase = await createClient();

  const categoria = String(formData.get("categoria") ?? "").trim();
  const monto = Number(formData.get("monto") ?? 0);
  const fecha = String(formData.get("fecha") ?? "");
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;

  if (!categoria || !monto || monto <= 0 || !fecha) {
    return { error: "Completá categoría, monto y fecha." };
  }

  const [anio, mes] = fecha.split("-").map(Number);

  const { error } = await supabase.from("gastos").insert({
    sucursal_id: sucursalId,
    categoria,
    monto,
    descripcion,
    fecha,
    mes,
    anio,
    tipo: "variable",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/sucursales/${sucursalId}/gastos`);
  return { error: null };
}

export async function actualizarMontoGasto(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const gastoId = String(formData.get("gasto_id") ?? "");
  const monto = Number(formData.get("monto") ?? 0);
  if (!gastoId || !monto || monto <= 0) return;

  await supabase.from("gastos").update({ monto }).eq("id", gastoId);

  revalidatePath("/sucursales/[id]/gastos", "page");
}

export async function eliminarGasto(sucursalId: string, gastoId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("gastos").delete().eq("id", gastoId);
  revalidatePath(`/sucursales/${sucursalId}/gastos`);
}

export async function agregarGastoFijoCatalogo(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const supabase = await createClient();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const montoEstimado = formData.get("monto_estimado")
    ? Number(formData.get("monto_estimado"))
    : null;

  if (!nombre) {
    return { error: "Poné un nombre para el gasto fijo." };
  }

  const { error } = await supabase
    .from("gastos_fijos_catalogo")
    .insert({ nombre, monto_estimado: montoEstimado });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/sucursales/[id]/gastos", "page");
  return { error: null };
}

export async function generarGastosFijosDelMes(
  sucursalId: string,
  mes: number,
  anio: number,
): Promise<{ generados: number; omitidos: number }> {
  const supabase = await createClient();

  const { data: catalogo } = await supabase
    .from("gastos_fijos_catalogo")
    .select("id, nombre, monto_estimado, activo")
    .eq("activo", true);

  if (!catalogo || catalogo.length === 0) {
    return { generados: 0, omitidos: 0 };
  }

  const { data: existentes } = await supabase
    .from("gastos")
    .select("gasto_fijo_id")
    .eq("sucursal_id", sucursalId)
    .eq("mes", mes)
    .eq("anio", anio)
    .eq("tipo", "fijo");

  const yaGenerados = new Set((existentes ?? []).map((g) => g.gasto_fijo_id));

  const fecha = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const filas = catalogo
    .filter((c) => !yaGenerados.has(c.id))
    .map((c) => ({
      sucursal_id: sucursalId,
      categoria: c.nombre,
      monto: c.monto_estimado ?? 0,
      mes,
      anio,
      fecha,
      tipo: "fijo" as const,
      gasto_fijo_id: c.id,
    }));

  if (filas.length > 0) {
    await supabase.from("gastos").insert(filas);
  }

  revalidatePath(`/sucursales/${sucursalId}/gastos`);
  return { generados: filas.length, omitidos: catalogo.length - filas.length };
}
