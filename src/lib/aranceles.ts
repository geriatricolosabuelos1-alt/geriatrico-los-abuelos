export type PagoResumen = {
  monto: number;
  monto_pagado: number;
  mes: number;
  anio: number;
  estado: "pendiente" | "parcial" | "pagado";
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
  diasMoraMax: number;
};

export function calcularResumenCuenta(
  pagos: PagoResumen[],
  diaVencimiento: number,
  porcentajeRecargo: number,
): ResumenCuentaCorriente {
  const pagados = pagos.filter((p) => p.estado === "pagado");
  const conSaldo = pagos.filter((p) => p.estado !== "pagado");

  const ultimoPeriodoPagado = pagados.reduce<{ mes: number; anio: number } | null>(
    (ultimo, p) => {
      if (!ultimo || p.anio > ultimo.anio || (p.anio === ultimo.anio && p.mes > ultimo.mes)) {
        return { mes: p.mes, anio: p.anio };
      }
      return ultimo;
    },
    null,
  );

  const totalAdeudado = conSaldo.reduce((acc, p) => acc + (p.monto - p.monto_pagado), 0);
  const totalMora = conSaldo.reduce((acc, p) => {
    const atraso = diasDeAtraso(p, diaVencimiento);
    const restante = p.monto - p.monto_pagado;
    return acc + (atraso > 0 ? (restante * porcentajeRecargo) / 100 : 0);
  }, 0);
  const diasMoraMax = conSaldo.reduce(
    (max, p) => Math.max(max, diasDeAtraso(p, diaVencimiento)),
    0,
  );

  return {
    ultimoPeriodoPagado,
    cantidadPendientes: conSaldo.length,
    totalAdeudado,
    totalMora,
    diasMoraMax,
  };
}
