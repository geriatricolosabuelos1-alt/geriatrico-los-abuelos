"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EstadoReceta, RecetaMedicamento } from "@/lib/types";

export async function listarRecetas(sucursalId: string): Promise<
  (RecetaMedicamento & {
    residente_nombre: string;
    medicamento_nombre: string | null;
  })[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recetas_medicamento")
    .select(
      "id, residente_id, medicamento_id, obra_social, estado, fecha_pedido, fecha_recibido, fecha_vencimiento, notas, creado_por, created_at, residentes!inner(nombre, apellido, sucursal_id), medicamentos_residente(nombre)",
    )
    .eq("residentes.sucursal_id", sucursalId)
    .order("created_at", { ascending: false })
    .returns<
      (RecetaMedicamento & {
        residentes: { nombre: string; apellido: string; sucursal_id: string };
        medicamentos_residente: { nombre: string } | null;
      })[]
    >();

  return (data ?? []).map((r) => ({
    ...r,
    residente_nombre: `${r.residentes.apellido}, ${r.residentes.nombre}`,
    medicamento_nombre: r.medicamentos_residente?.nombre ?? null,
  }));
}

export type RecetaEstado = { error: string | null };

export async function crearReceta(
  sucursalId: string,
  _estado: RecetaEstado,
  formData: FormData,
): Promise<RecetaEstado> {
  const supabase = await createClient();

  const residente_id = String(formData.get("residente_id") ?? "");
  const medicamento_id = String(formData.get("medicamento_id") ?? "") || null;
  const obra_social = String(formData.get("obra_social") ?? "").trim() || null;
  const fecha_vencimiento = String(formData.get("fecha_vencimiento") ?? "").trim() || null;
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!residente_id) {
    return { error: "Seleccioná un residente." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("recetas_medicamento").insert({
    residente_id,
    medicamento_id,
    obra_social,
    fecha_vencimiento,
    notas,
    creado_por: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/sucursales/${sucursalId}/medicacion/recetario`);
  return { error: null };
}

export async function actualizarEstadoReceta(
  sucursalId: string,
  recetaId: string,
  estado: EstadoReceta,
): Promise<void> {
  const supabase = await createClient();

  const patch: Record<string, unknown> = { estado };
  if (estado === "pedida") patch.fecha_pedido = new Date().toISOString().slice(0, 10);
  if (estado === "recibida") patch.fecha_recibido = new Date().toISOString().slice(0, 10);

  await supabase.from("recetas_medicamento").update(patch).eq("id", recetaId);

  revalidatePath(`/sucursales/${sucursalId}/medicacion/recetario`);
}

export async function eliminarReceta(sucursalId: string, recetaId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("recetas_medicamento").delete().eq("id", recetaId);
  revalidatePath(`/sucursales/${sucursalId}/medicacion/recetario`);
}
