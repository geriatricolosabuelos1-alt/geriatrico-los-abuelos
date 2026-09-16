import type { SupabaseClient } from "@supabase/supabase-js";

export type MesFinanciero = { label: string; mes: number; anio: number; monto: number };

export type ResumenFinancieroSucursal = {
  ingresosPorMes: MesFinanciero[];
  gastosPorMes: MesFinanciero[];
  sueldosPorMes: MesFinanciero[];
  ingresosMes: number;
  gastosMes: number;
  sueldosMes: number;
  disponibleSinSueldos: number;
  disponibleConSueldos: number;
};

const NOMBRES_MES_CORTO = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export function formatearMonto(monto: number): string {
  return `$${Math.round(monto).toLocaleString("es-AR")}`;
}

function ultimosNMeses(n: number): { mes: number; anio: number; label: string }[] {
  const ahora = new Date();
  const meses: { mes: number; anio: number; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    meses.push({ mes: d.getMonth() + 1, anio: d.getFullYear(), label: NOMBRES_MES_CORTO[d.getMonth()] });
  }
  return meses;
}

async function calcularIngresosPorMes(
  supabase: SupabaseClient,
  sucursalId: string,
  meses: { mes: number; anio: number; label: string }[],
): Promise<MesFinanciero[]> {
  const desde = `${meses[0].anio}-${String(meses[0].mes).padStart(2, "0")}-01`;

  const { data } = await supabase
    .from("pagos")
    .select("monto_pagado, fecha_pago")
    .eq("sucursal_id", sucursalId)
    .not("fecha_pago", "is", null)
    .gte("fecha_pago", desde)
    .returns<{ monto_pagado: number; fecha_pago: string }[]>();

  const totalesPorClave = new Map<string, number>();
  (data ?? []).forEach((p) => {
    const d = new Date(p.fecha_pago + "T00:00:00");
    const clave = `${d.getFullYear()}-${d.getMonth() + 1}`;
    totalesPorClave.set(clave, (totalesPorClave.get(clave) ?? 0) + (p.monto_pagado ?? 0));
  });

  return meses.map((m) => ({ ...m, monto: totalesPorClave.get(`${m.anio}-${m.mes}`) ?? 0 }));
}

async function calcularGastosPorMes(
  supabase: SupabaseClient,
  sucursalId: string,
  meses: { mes: number; anio: number; label: string }[],
): Promise<MesFinanciero[]> {
  const anios = Array.from(new Set(meses.map((m) => m.anio)));

  const { data } = await supabase
    .from("gastos")
    .select("monto, mes, anio")
    .eq("sucursal_id", sucursalId)
    .in("anio", anios)
    .returns<{ monto: number; mes: number; anio: number }[]>();

  const totalesPorClave = new Map<string, number>();
  (data ?? []).forEach((g) => {
    const clave = `${g.anio}-${g.mes}`;
    totalesPorClave.set(clave, (totalesPorClave.get(clave) ?? 0) + (g.monto ?? 0));
  });

  return meses.map((m) => ({ ...m, monto: totalesPorClave.get(`${m.anio}-${m.mes}`) ?? 0 }));
}

async function calcularSueldosPorMes(
  supabase: SupabaseClient,
  sucursalId: string,
  meses: { mes: number; anio: number; label: string }[],
): Promise<MesFinanciero[]> {
  // No hay historial de sueldos por mes: se toma el total de sueldos activos
  // hoy como referencia y se repite en toda la ventana (no es un historico real).
  const { data } = await supabase
    .from("empleados")
    .select("sueldo")
    .eq("sucursal_id", sucursalId)
    .eq("activo", true)
    .returns<{ sueldo: number | null }[]>();

  const totalActual = (data ?? []).reduce((acc, e) => acc + (e.sueldo ?? 0), 0);

  return meses.map((m) => ({ ...m, monto: totalActual }));
}

export async function obtenerResumenFinanciero(
  supabase: SupabaseClient,
  sucursalId: string,
  nMeses = 9,
): Promise<ResumenFinancieroSucursal> {
  const meses = ultimosNMeses(nMeses);

  const [ingresosPorMes, gastosPorMes, sueldosPorMes] = await Promise.all([
    calcularIngresosPorMes(supabase, sucursalId, meses),
    calcularGastosPorMes(supabase, sucursalId, meses),
    calcularSueldosPorMes(supabase, sucursalId, meses),
  ]);

  const ingresosMes = ingresosPorMes[ingresosPorMes.length - 1]?.monto ?? 0;
  const gastosMes = gastosPorMes[gastosPorMes.length - 1]?.monto ?? 0;
  const sueldosMes = sueldosPorMes[sueldosPorMes.length - 1]?.monto ?? 0;

  return {
    ingresosPorMes,
    gastosPorMes,
    sueldosPorMes,
    ingresosMes,
    gastosMes,
    sueldosMes,
    disponibleSinSueldos: ingresosMes - gastosMes,
    disponibleConSueldos: ingresosMes - gastosMes - sueldosMes,
  };
}

export function combinarResumenesFinancieros(
  resumenes: ResumenFinancieroSucursal[],
): ResumenFinancieroSucursal {
  if (resumenes.length === 0) {
    return {
      ingresosPorMes: [],
      gastosPorMes: [],
      sueldosPorMes: [],
      ingresosMes: 0,
      gastosMes: 0,
      sueldosMes: 0,
      disponibleSinSueldos: 0,
      disponibleConSueldos: 0,
    };
  }

  function sumarSerie(series: MesFinanciero[][]): MesFinanciero[] {
    return series[0].map((_, i) => ({
      ...series[0][i],
      monto: series.reduce((acc, serie) => acc + (serie[i]?.monto ?? 0), 0),
    }));
  }

  const ingresosPorMes = sumarSerie(resumenes.map((r) => r.ingresosPorMes));
  const gastosPorMes = sumarSerie(resumenes.map((r) => r.gastosPorMes));
  const sueldosPorMes = sumarSerie(resumenes.map((r) => r.sueldosPorMes));

  const ingresosMes = resumenes.reduce((acc, r) => acc + r.ingresosMes, 0);
  const gastosMes = resumenes.reduce((acc, r) => acc + r.gastosMes, 0);
  const sueldosMes = resumenes.reduce((acc, r) => acc + r.sueldosMes, 0);

  return {
    ingresosPorMes,
    gastosPorMes,
    sueldosPorMes,
    ingresosMes,
    gastosMes,
    sueldosMes,
    disponibleSinSueldos: ingresosMes - gastosMes,
    disponibleConSueldos: ingresosMes - gastosMes - sueldosMes,
  };
}
