"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcularEdad } from "@/lib/residentes";

export type SignosVitales = {
  residente_id: string;
  fecha: string;
  tension_arterial: string | null;
  frecuencia_cardiaca: number | null;
  frecuencia_respiratoria: number | null;
  saturacion_o2: number | null;
  temperatura: number | null;
};

export type ValoresSignos = {
  tension_arterial: string;
  frecuencia_cardiaca: string;
  frecuencia_respiratoria: string;
  saturacion_o2: string;
  temperatura: string;
};

export type GuardarSignosEstado = { error: string | null };

const COLUMNAS =
  "residente_id, fecha, tension_arterial, frecuencia_cardiaca, frecuencia_respiratoria, saturacion_o2, temperatura";

function numero(valor: string, nombre: string, min: number, max: number): number | null | string {
  const limpio = valor.trim().replace(",", ".");
  if (!limpio) return null;
  const n = Number(limpio);
  if (!Number.isFinite(n) || n < min || n > max) return `${nombre}: valor fuera de rango (${min} a ${max}).`;
  return n;
}

// Guarda el control del día de un residente (uno por día). Si se borran todos los valores, se elimina.
export async function guardarSignosVitales(
  residenteId: string,
  fecha: string,
  valores: ValoresSignos,
): Promise<GuardarSignosEstado> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Fecha inválida." };

  const ta = valores.tension_arterial.trim().replace(/\s+/g, "");
  if (ta && !/^\d{2,3}\/\d{2,3}$/.test(ta)) return { error: "TA: escribila como 120/80." };

  const fc = numero(valores.frecuencia_cardiaca, "FC", 20, 250);
  const fr = numero(valores.frecuencia_respiratoria, "FR", 4, 80);
  const so2 = numero(valores.saturacion_o2, "SO2", 40, 100);
  const temp = numero(valores.temperatura, "T°", 30, 45);
  for (const v of [fc, fr, so2, temp]) if (typeof v === "string") return { error: v };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tenés que iniciar sesión." };

  const vacio = !ta && fc === null && fr === null && so2 === null && temp === null;

  if (vacio) {
    const { error } = await supabase
      .from("signos_vitales")
      .delete()
      .eq("residente_id", residenteId)
      .eq("fecha", fecha);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("signos_vitales")
      .upsert(
        {
          residente_id: residenteId,
          fecha,
          tension_arterial: ta || null,
          frecuencia_cardiaca: fc as number | null,
          frecuencia_respiratoria: fr as number | null,
          saturacion_o2: so2 as number | null,
          temperatura: temp as number | null,
          registrado_por: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "residente_id,fecha" },
      )
      .select("residente_id");
    if (error) return { error: error.message };
    if (!data || data.length === 0) return { error: "No tenés permiso para cargar signos vitales de este residente." };
  }

  revalidatePath("/sucursales/[id]/enfermeria", "page");
  revalidatePath(`/residentes/${residenteId}/enfermeria`);
  return { error: null };
}

export type PlanillaResidente = {
  residenteId: string;
  nombre: string;
  edad: number | null;
  obraSocial: string | null;
  sede: string;
  registros: SignosVitales[];
};

// Datos para el PDF del mes (AAAA-MM): de un residente, o de todos los residentes activos de la sede.
export async function obtenerPlanillasMes(
  filtro: { residenteId: string } | { sucursalId: string },
  mes: string,
): Promise<PlanillaResidente[]> {
  if (!/^\d{4}-\d{2}$/.test(mes)) return [];
  const supabase = await createClient();

  let consulta = supabase
    .from("residentes")
    .select("id, nombre, apellido, fecha_nacimiento, sucursales(nombre), ficha_administrativa(obra_social)")
    .order("apellido");
  consulta =
    "residenteId" in filtro
      ? consulta.eq("id", filtro.residenteId)
      : consulta.eq("sucursal_id", filtro.sucursalId).eq("activo", true);

  const { data: residentes } = await consulta.returns<
    {
      id: string;
      nombre: string;
      apellido: string;
      fecha_nacimiento: string | null;
      sucursales: { nombre: string } | null;
      ficha_administrativa: { obra_social: string | null } | null;
    }[]
  >();
  if (!residentes || residentes.length === 0) return [];

  const [anio, numMes] = mes.split("-").map(Number);
  const ultimoDia = new Date(anio, numMes, 0).getDate();

  const { data: registros } = await supabase
    .from("signos_vitales")
    .select(COLUMNAS)
    .in(
      "residente_id",
      residentes.map((r) => r.id),
    )
    .gte("fecha", `${mes}-01`)
    .lte("fecha", `${mes}-${String(ultimoDia).padStart(2, "0")}`)
    .returns<SignosVitales[]>();

  return residentes.map((r) => ({
    residenteId: r.id,
    nombre: `${r.apellido}, ${r.nombre}`,
    edad: calcularEdad(r.fecha_nacimiento),
    obraSocial: r.ficha_administrativa?.obra_social ?? null,
    sede: r.sucursales?.nombre ?? "",
    registros: (registros ?? []).filter((s) => s.residente_id === r.id),
  }));
}
