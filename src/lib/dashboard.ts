import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularResumenCuenta, type PagoResumen } from "@/lib/aranceles";

export type AlertaMedicacionResumen = {
  id: string;
  residenteId: string;
  residenteNombre: string;
  medicamentoNombre: string;
  nivel: "aviso_7" | "aviso_5" | "sin_stock";
  diasRestantes: number | null;
};

export type AlertaInsumoResumen = {
  id: string;
  nombre: string;
  categoria: "medicos" | "varios";
  stockActual: number;
  stockMinimo: number;
};

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
      .from("insumos")
      .select("id, nombre, categoria, stock_minimo, activo")
      .eq("activo", true)
      .gt("stock_minimo", 0)
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

  const alertasMedicacion: AlertaMedicacionResumen[] = (alertasRaw ?? []).map((a) => ({
    id: a.id,
    residenteId: a.medicamentos_residente.residente_id,
    residenteNombre: `${a.medicamentos_residente.residentes.apellido}, ${a.medicamentos_residente.residentes.nombre}`,
    medicamentoNombre: a.medicamentos_residente.nombre,
    nivel: a.nivel,
    diasRestantes: a.dias_restantes,
  }));

  const resumenPorInsumo = new Map<string, number>();
  (movimientos ?? []).forEach((m) => {
    const actual = resumenPorInsumo.get(m.insumo_id) ?? 0;
    resumenPorInsumo.set(m.insumo_id, actual + (m.tipo === "entrada" ? m.cantidad : -m.cantidad));
  });

  const alertasInsumos: AlertaInsumoResumen[] = (insumos ?? [])
    .map((i) => ({
      id: i.id,
      nombre: i.nombre,
      categoria: i.categoria,
      stockActual: resumenPorInsumo.get(i.id) ?? 0,
      stockMinimo: i.stock_minimo,
    }))
    .filter((i) => i.stockActual <= i.stockMinimo);

  return {
    residentesActivos: residentesActivos ?? 0,
    montoPendiente,
    cantidadPendientes,
    cantidadVencidas,
    alertasMedicacion,
    alertasInsumos,
  };
}
