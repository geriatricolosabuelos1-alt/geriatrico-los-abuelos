"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcularAlertasRecetas, fechaHoyArgentina, type AlertasRecetas } from "@/lib/recetas";
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
      "id, residente_id, medicamento_id, medicamento_texto, obra_social, estado, fecha_pedido, fecha_recibido, fecha_vencimiento, notas, creado_por, created_at, residentes!inner(nombre, apellido, sucursal_id), medicamentos_residente(nombre)",
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
    medicamento_nombre: r.medicamentos_residente?.nombre ?? r.medicamento_texto ?? null,
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
  const medicamentoEscrito = String(formData.get("medicamento") ?? "").trim();
  const obra_social = String(formData.get("obra_social") ?? "").trim() || null;
  const fecha_vencimiento = String(formData.get("fecha_vencimiento") ?? "").trim() || null;
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!residente_id) {
    return { error: "Seleccioná un residente." };
  }

  // Si lo escrito coincide con un medicamento del residente, se vincula; si no, queda como texto.
  let medicamento_id: string | null = null;
  let medicamento_texto: string | null = null;
  if (medicamentoEscrito) {
    const { data: meds } = await supabase
      .from("medicamentos_residente")
      .select("id, nombre")
      .eq("residente_id", residente_id)
      .eq("activo", true)
      .returns<{ id: string; nombre: string }[]>();
    const coincidencia = (meds ?? []).find(
      (m) => m.nombre.trim().toLowerCase() === medicamentoEscrito.toLowerCase(),
    );
    if (coincidencia) medicamento_id = coincidencia.id;
    else medicamento_texto = medicamentoEscrito;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("recetas_medicamento").insert({
    residente_id,
    medicamento_id,
    medicamento_texto,
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
  if (estado === "pedida") patch.fecha_pedido = fechaHoyArgentina();
  if (estado === "recibida") patch.fecha_recibido = fechaHoyArgentina();

  await supabase.from("recetas_medicamento").update(patch).eq("id", recetaId);

  revalidatePath(`/sucursales/${sucursalId}/medicacion/recetario`);
}

export async function eliminarReceta(sucursalId: string, recetaId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("recetas_medicamento").delete().eq("id", recetaId);
  revalidatePath(`/sucursales/${sucursalId}/medicacion/recetario`);
}

// Marca como pedidas (con la fecha de hoy) las recetas incluidas en el pedido impreso.
export async function marcarRecetasPedidas(sucursalId: string, recetaIds: string[]): Promise<void> {
  if (recetaIds.length === 0) return;
  const supabase = await createClient();
  await supabase
    .from("recetas_medicamento")
    .update({ estado: "pedida", fecha_pedido: fechaHoyArgentina() })
    .in("id", recetaIds)
    .eq("estado", "pendiente_pedir");

  revalidatePath(`/sucursales/${sucursalId}/medicacion/recetario`);
  revalidatePath(`/sucursales/${sucursalId}/medicacion/recetario/pedido`);
  revalidatePath(`/sucursales/${sucursalId}/dashboard`);
}

export async function alertasRecetasSucursal(sucursalId: string): Promise<AlertasRecetas> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recetas_medicamento")
    .select("estado, fecha_pedido, fecha_vencimiento, residentes!inner(sucursal_id)")
    .eq("residentes.sucursal_id", sucursalId)
    .neq("estado", "recibida")
    .returns<Pick<RecetaMedicamento, "estado" | "fecha_pedido" | "fecha_vencimiento">[]>();

  return calcularAlertasRecetas(data ?? []);
}
