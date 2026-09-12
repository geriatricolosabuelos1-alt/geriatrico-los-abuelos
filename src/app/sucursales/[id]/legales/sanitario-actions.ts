"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  ContratoProveedorSalud,
  EvolucionMedica,
  NotaEvolucion,
  RetiroResiduoPatogenico,
  TipoContratoProveedorSalud,
} from "@/lib/types";

type Estado = { error: string | null };

function rutaLegales(sucursalId: string, sub: string): string {
  return `/sucursales/${sucursalId}/legales/${sub}`;
}

// ---------- Libro foliado digital ----------

export type EntradaLibroFoliado = {
  folio: number;
  fecha: string;
  tipo: string;
  autor: string;
  contenido: string;
};

export async function generarLibroFoliado(residenteId: string): Promise<EntradaLibroFoliado[]> {
  const supabase = await createClient();

  const [{ data: evoluciones }, { data: notas }] = await Promise.all([
    supabase
      .from("evoluciones_medicas")
      .select(
        "id, tipo_visita, subjetivo, objetivo, apreciacion_diagnostico, plan_terapeutico, matricula, firmado_at, perfiles(nombre_completo)",
      )
      .eq("residente_id", residenteId)
      .returns<
        (EvolucionMedica & { perfiles: { nombre_completo: string } | null })[]
      >(),
    supabase
      .from("notas_evolucion")
      .select("id, tipo, contenido, fecha, perfiles(nombre_completo)")
      .eq("residente_id", residenteId)
      .returns<(NotaEvolucion & { perfiles: { nombre_completo: string } | null })[]>(),
  ]);

  const entradas: (Omit<EntradaLibroFoliado, "folio"> & { fechaOrden: number })[] = [];

  for (const e of evoluciones ?? []) {
    const partes = [
      e.subjetivo && `S: ${e.subjetivo}`,
      e.objetivo && `O: ${e.objetivo}`,
      e.apreciacion_diagnostico && `A: ${e.apreciacion_diagnostico}`,
      e.plan_terapeutico && `P: ${e.plan_terapeutico}`,
    ].filter(Boolean);
    entradas.push({
      fecha: e.firmado_at,
      fechaOrden: new Date(e.firmado_at).getTime(),
      tipo: `Evolución médica (${e.tipo_visita})`,
      autor: `${e.perfiles?.nombre_completo ?? "—"}${e.matricula ? ` · Mat. ${e.matricula}` : ""}`,
      contenido: partes.join(" | ") || "—",
    });
  }

  for (const n of notas ?? []) {
    entradas.push({
      fecha: n.fecha,
      fechaOrden: new Date(n.fecha).getTime(),
      tipo: `Nota de ${n.tipo}`,
      autor: n.perfiles?.nombre_completo ?? "—",
      contenido: n.contenido,
    });
  }

  entradas.sort((a, b) => a.fechaOrden - b.fechaOrden);

  return entradas.map((e, i) => ({
    folio: i + 1,
    fecha: e.fecha,
    tipo: e.tipo,
    autor: e.autor,
    contenido: e.contenido,
  }));
}

// ---------- Certificaciones y proveedores de salud ----------

export async function listarContratosSalud(sucursalId: string): Promise<ContratoProveedorSalud[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contratos_proveedores_salud")
    .select("id, sucursal_id, tipo, proveedor, fecha_vencimiento, contacto, notas, created_at")
    .eq("sucursal_id", sucursalId)
    .order("fecha_vencimiento")
    .returns<ContratoProveedorSalud[]>();
  return data ?? [];
}

export async function agregarContratoSalud(
  sucursalId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();

  const tipo = String(formData.get("tipo") ?? "otro") as TipoContratoProveedorSalud;
  const proveedor = String(formData.get("proveedor") ?? "").trim();
  const fecha_vencimiento = String(formData.get("fecha_vencimiento") ?? "").trim() || null;
  const contacto = String(formData.get("contacto") ?? "").trim() || null;
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!proveedor) return { error: "Ingresá el nombre del proveedor." };

  const { error } = await supabase.from("contratos_proveedores_salud").insert({
    sucursal_id: sucursalId,
    tipo,
    proveedor,
    fecha_vencimiento,
    contacto,
    notas,
  });

  if (error) return { error: error.message };

  revalidatePath(rutaLegales(sucursalId, "certificaciones"));
  return { error: null };
}

export async function eliminarContratoSalud(sucursalId: string, id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("contratos_proveedores_salud").delete().eq("id", id);
  revalidatePath(rutaLegales(sucursalId, "certificaciones"));
}

export async function listarRetirosResiduos(sucursalId: string): Promise<RetiroResiduoPatogenico[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("retiros_residuos_patogenicos")
    .select("id, sucursal_id, fecha, empresa, cantidad_kg, numero_manifiesto, notas, registrado_por, created_at")
    .eq("sucursal_id", sucursalId)
    .order("fecha", { ascending: false })
    .returns<RetiroResiduoPatogenico[]>();
  return data ?? [];
}

export async function agregarRetiroResiduos(
  sucursalId: string,
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  const supabase = await createClient();

  const empresa = String(formData.get("empresa") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim() || new Date().toISOString().slice(0, 10);
  const cantidadRaw = String(formData.get("cantidad_kg") ?? "").trim();
  const cantidad_kg = cantidadRaw ? Number(cantidadRaw) : null;
  const numero_manifiesto = String(formData.get("numero_manifiesto") ?? "").trim() || null;
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!empresa) return { error: "Ingresá la empresa transportista." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("retiros_residuos_patogenicos").insert({
    sucursal_id: sucursalId,
    fecha,
    empresa,
    cantidad_kg,
    numero_manifiesto,
    notas,
    registrado_por: user?.id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath(rutaLegales(sucursalId, "certificaciones"));
  return { error: null };
}

export async function eliminarRetiroResiduos(sucursalId: string, id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("retiros_residuos_patogenicos").delete().eq("id", id);
  revalidatePath(rutaLegales(sucursalId, "certificaciones"));
}

// Nota: la vacunación institucional se movió a /medicacion/vacunacion-actions.ts
