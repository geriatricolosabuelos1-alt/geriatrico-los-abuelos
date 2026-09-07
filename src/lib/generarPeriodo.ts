import type { SupabaseClient } from "@supabase/supabase-js";

type ResidenteConFicha = {
  id: string;
  sucursal_id: string;
  ficha_administrativa: {
    cuota_mensual: number | null;
    monto_cobertura_obra_social: number | null;
  } | null;
};

export type ResultadoGeneracion = {
  generados: number;
  omitidos: number;
};

export async function generarPeriodoParaSucursal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  sucursalId: string,
  mes: number,
  anio: number,
): Promise<ResultadoGeneracion> {
  const { data: residentes } = await supabase
    .from("residentes")
    .select("id, sucursal_id, ficha_administrativa(cuota_mensual, monto_cobertura_obra_social)")
    .eq("sucursal_id", sucursalId)
    .eq("activo", true)
    .returns<ResidenteConFicha[]>();

  if (!residentes || residentes.length === 0) {
    return { generados: 0, omitidos: 0 };
  }

  const { data: pagosExistentes } = await supabase
    .from("pagos")
    .select("residente_id")
    .eq("sucursal_id", sucursalId)
    .eq("mes", mes)
    .eq("anio", anio)
    .returns<{ residente_id: string }[]>();

  const residentesConPeriodo = new Set((pagosExistentes ?? []).map((p) => p.residente_id));

  const filas = [];
  let omitidos = 0;

  for (const r of residentes) {
    if (residentesConPeriodo.has(r.id)) {
      omitidos++;
      continue;
    }

    const cuota = r.ficha_administrativa?.cuota_mensual ?? null;
    const cobertura = r.ficha_administrativa?.monto_cobertura_obra_social ?? null;

    if (cobertura != null && cobertura > 0) {
      filas.push({
        residente_id: r.id,
        sucursal_id: sucursalId,
        monto: cobertura,
        mes,
        anio,
        estado: "pendiente" as const,
        tipo_pago: "obra_social" as const,
      });
    }

    const montoPaciente = cuota != null && cobertura != null ? cuota - cobertura : cuota;
    if (montoPaciente != null && montoPaciente > 0) {
      filas.push({
        residente_id: r.id,
        sucursal_id: sucursalId,
        monto: montoPaciente,
        mes,
        anio,
        estado: "pendiente" as const,
        tipo_pago: "paciente" as const,
      });
    }
  }

  if (filas.length > 0) {
    await supabase.from("pagos").insert(filas);
  }

  const residentesGenerados = new Set(filas.map((f) => f.residente_id)).size;
  return { generados: residentesGenerados, omitidos };
}
