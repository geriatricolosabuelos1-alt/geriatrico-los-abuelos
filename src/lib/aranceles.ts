export type PagoResumen = {
  monto: number;
  mes: number;
  anio: number;
  estado: "pendiente" | "pagado";
  fecha_pago: string | null;
};

export function diasDeAtraso(pago: PagoResumen, diaVencimiento: number): number {
  const fechaVencimiento = new Date(pago.anio, pago.mes - 1, diaVencimiento);
  const fechaComparar = pago.fecha_pago ? new Date(pago.fecha_pago + "T00:00:00") : new Date();
  const diffMs = fechaComparar.getTime() - fechaVencimiento.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

export type ResumenCuentaCorriente = {
  ultimoPeriodoPagado: { mes: number; anio: number } | null;
  cantidadPendientes: number;
  totalAdeudado: number;
  totalMora: number;
};

export function calcularResumenCuenta(
  pagos: PagoResumen[],
  diaVencimiento: number,
  porcentajeRecargo: number,
): ResumenCuentaCorriente {
  const pagados = pagos.filter((p) => p.estado === "pagado");
  const pendientes = pagos.filter((p) => p.estado === "pendiente");

  const ultimoPeriodoPagado = pagados.reduce<{ mes: number; anio: number } | null>(
    (ultimo, p) => {
      if (!ultimo || p.anio > ultimo.anio || (p.anio === ultimo.anio && p.mes > ultimo.mes)) {
        return { mes: p.mes, anio: p.anio };
      }
      return ultimo;
    },
    null,
  );

  const totalAdeudado = pendientes.reduce((acc, p) => acc + p.monto, 0);
  const totalMora = pendientes.reduce((acc, p) => {
    const atraso = diasDeAtraso(p, diaVencimiento);
    return acc + (atraso > 0 ? (p.monto * porcentajeRecargo) / 100 : 0);
  }, 0);

  return {
    ultimoPeriodoPagado,
    cantidadPendientes: pendientes.length,
    totalAdeudado,
    totalMora,
  };
}
