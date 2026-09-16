import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularResumenCuenta, type PagoResumen } from "@/lib/aranceles";

export type AlertaMedicacionResumen = {
  id: string;
  residenteId: string;
  residenteNombre: string;
  medicamentoNombre: string;
  nivel: "aviso_7" | "aviso_5" | "sin_stock";
  diasRestantes: number | null;
  /** true cuando no hay "dosis diaria" cargada y el aviso sale por cantidad
   * absoluta de stock, no por días reales restantes. */
  sinDosisDiaria?: boolean;
  stockActual?: number;
};

export type AlertaInsumoResumen = {
  id: string;
  nombre: string;
  categoria: "medicos" | "varios";
  stockActual: number;
  stockMinimo: number;
};

export function hayAlertaRoja(alertas: AlertaMedicacionResumen[]): boolean {
  return alertas.some((a) => a.nivel === "aviso_5" || a.nivel === "sin_stock");
}

export function hayAlertaAmarilla(alertas: AlertaMedicacionResumen[]): boolean {
  return alertas.some((a) => a.nivel === "aviso_7");
}

export type ResumenSucursalDashboard = {
  residentesActivos: number;
  montoPendiente: number;
  cantidadPendientes: number;
  cantidadVencidas: number;
  alertasMedicacion: AlertaMedicacionResumen[];
  alertasInsumos: AlertaInsumoResumen[];
};

type ResidenteConFicha = {
  id: string;
  ficha_administrativa: {
    porcentaje_recargo_mora: number | null;
    fecha_vencimiento_cuota: string | null;
  } | null;
};

type MedSinDosisRaw = {
  id: string;
  nombre: string;
  cantidad_stock: number;
  dosis_diaria: number | null;
  residente_id: string;
  residentes: { nombre: string; apellido: string; sucursal_id: string };
};

type AlertaMedicacionRaw = {
  id: string;
  dias_restantes: number | null;
  nivel: "aviso_7" | "aviso_5" | "sin_stock";
  medicamentos_residente: {
    nombre: string;
    residente_id: string;
    residentes: { nombre: string; apellido: string; sucursal_id: string };
  };
};

type MovimientoInsumo = { insumo_id: string; tipo: string; cantidad: number; es_inicial: boolean };
type InsumoRaw = {
  id: string;
  nombre: string;
  categoria: "medicos" | "varios";
  stock_minimo: number;
  activo: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function obtenerResumenSucursal(
  supabase: SupabaseClient,
  sucursalId: string,
): Promise<ResumenSucursalDashboard> {
  const [
    { count: residentesActivos },
    { data: residentesConFicha },
    { data: pagos },
    { data: alertasRaw },
    { data: medsSinDosisDiaria },
    { data: insumos },
    { data: movimientos },
  ] = await Promise.all([
    supabase
      .from("residentes")
      .select("id", { count: "exact", head: true })
      .eq("sucursal_id", sucursalId)
      .eq("activo", true),
    supabase
      .from("residentes")
      .select("id, ficha_administrativa(porcentaje_recargo_mora, fecha_vencimiento_cuota)")
      .eq("sucursal_id", sucursalId)
      .eq("activo", true)
      .returns<ResidenteConFicha[]>(),
    supabase
      .from("pagos")
      .select("residente_id, monto, monto_pagado, mes, anio, estado, fecha_pago")
      .eq("sucursal_id", sucursalId)
      .neq("estado", "pagado")
      .returns<(PagoResumen & { residente_id: string })[]>(),
    supabase
      .from("alertas_medicacion")
      .select(
        "id, dias_restantes, nivel, medicamentos_residente!inner(nombre, residente_id, residentes!inner(nombre, apellido, sucursal_id))",
      )
      .eq("resuelta", false)
      .eq("medicamentos_residente.residentes.sucursal_id", sucursalId)
      .returns<AlertaMedicacionRaw[]>(),
    supabase
      .from("medicamentos_residente")
      .select(
        "id, nombre, cantidad_stock, dosis_diaria, residente_id, residentes!inner(nombre, apellido, sucursal_id)",
      )
      .eq("activo", true)
      .eq("residentes.sucursal_id", sucursalId)
      .lte("cantidad_stock", 5)
      .returns<MedSinDosisRaw[]>(),
    supabase
      .from("insumos")
      .select("id, nombre, categoria, stock_minimo, activo")
      .eq("activo", true)
      .returns<InsumoRaw[]>(),
    supabase
      .from("movimientos_inventario")
      .select("insumo_id, tipo, cantidad, es_inicial")
      .eq("sucursal_id", sucursalId)
      .returns<MovimientoInsumo[]>(),
  ]);

  const diaVencimientoPorResidente = new Map<string, number>(
    (residentesConFicha ?? []).map((r) => [
      r.id,
      r.ficha_administrativa?.fecha_vencimiento_cuota
        ? new Date(r.ficha_administrativa.fecha_vencimiento_cuota + "T00:00:00").getDate()
        : 10,
    ]),
  );
  const recargoPorResidente = new Map<string, number>(
    (residentesConFicha ?? []).map((r) => [
      r.id,
      r.ficha_administrativa?.porcentaje_recargo_mora ?? 0,
    ]),
  );

  let montoPendiente = 0;
  let cantidadVencidas = 0;
  const cantidadPendientes = (pagos ?? []).length;

  const pagosPorResidente = new Map<string, (PagoResumen & { residente_id: string })[]>();
  (pagos ?? []).forEach((p) => {
    montoPendiente += p.monto - p.monto_pagado;
    const lista = pagosPorResidente.get(p.residente_id) ?? [];
    lista.push(p);
    pagosPorResidente.set(p.residente_id, lista);
  });
  pagosPorResidente.forEach((lista, residenteId) => {
    const resumen = calcularResumenCuenta(
      lista,
      diaVencimientoPorResidente.get(residenteId) ?? 10,
      recargoPorResidente.get(residenteId) ?? 0,
    );
    if (resumen.diasMoraMax > 0) cantidadVencidas += 1;
  });

  const alertasConDosisDiaria: AlertaMedicacionResumen[] = (alertasRaw ?? []).map((a) => ({
    id: a.id,
    residenteId: a.medicamentos_residente.residente_id,
    residenteNombre: `${a.medicamentos_residente.residentes.apellido}, ${a.medicamentos_residente.residentes.nombre}`,
    medicamentoNombre: a.medicamentos_residente.nombre,
    nivel: a.nivel,
    diasRestantes: a.dias_restantes,
  }));

  // Respaldo: medicamentos sin "dosis diaria" cargada (no se les puede calcular
  // días restantes), pero con muy poco stock. Se alertan por cantidad absoluta
  // para no dejarlos pasar en blanco.
  const alertasSinDosisDiaria: AlertaMedicacionResumen[] = (medsSinDosisDiaria ?? [])
    .filter((m) => !m.dosis_diaria || m.dosis_diaria <= 0)
    .map((m) => ({
      id: `sin-dosis-${m.id}`,
      residenteId: m.residente_id,
      residenteNombre: `${m.residentes.apellido}, ${m.residentes.nombre}`,
      medicamentoNombre: m.nombre,
      nivel: m.cantidad_stock <= 0 ? "sin_stock" : ("aviso_7" as const),
      diasRestantes: null,
      sinDosisDiaria: true,
      stockActual: m.cantidad_stock,
    }));

  const alertasMedicacion: AlertaMedicacionResumen[] = [
    ...alertasConDosisDiaria,
    ...alertasSinDosisDiaria,
  ];

  const resumenPorInsumo = new Map<string, number>();
  (movimientos ?? []).forEach((m) => {
    const actual = resumenPorInsumo.get(m.insumo_id) ?? 0;
    resumenPorInsumo.set(m.insumo_id, actual + (m.tipo === "entrada" ? m.cantidad : -m.cantidad));
  });

  const alertasInsumos: AlertaInsumoResumen[] = (insumos ?? [])
    // Solo insumos con movimientos cargados en esta sede (evita alertar por
    // ítems del catálogo general que acá nunca se llegaron a usar/stockear).
    .filter((i) => resumenPorInsumo.has(i.id))
    .map((i) => ({
      id: i.id,
      nombre: i.nombre,
      categoria: i.categoria,
      stockActual: resumenPorInsumo.get(i.id) ?? 0,
      stockMinimo: i.stock_minimo,
    }))
    .filter((i) => i.stockActual <= 0 || (i.stockMinimo > 0 && i.stockActual <= i.stockMinimo));

  return {
    residentesActivos: residentesActivos ?? 0,
    montoPendiente,
    cantidadPendientes,
    cantidadVencidas,
    alertasMedicacion,
    alertasInsumos,
  };
}
