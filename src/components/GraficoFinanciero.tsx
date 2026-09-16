import { formatearMonto, type MesFinanciero } from "@/lib/finanzas";

type SerieDual = {
  ingresosPorMes: MesFinanciero[];
  gastosPorMes: MesFinanciero[];
};

export function GraficoIngresosGastos({ ingresosPorMes, gastosPorMes }: SerieDual) {
  const maxValor = Math.max(
    ...ingresosPorMes.map((m) => m.monto),
    ...gastosPorMes.map((m) => m.monto),
    1,
  );

  return (
    <section className="rounded-2xl border border-edge bg-card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">Ingresos vs Gastos</h2>
        <div className="flex items-center gap-4 text-xs text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brass" /> Ingresos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sede" /> Gastos
          </span>
        </div>
      </div>

      <div className="grid grid-cols-9 items-end gap-3" style={{ height: 200 }}>
        {ingresosPorMes.map((m, i) => {
          const gasto = gastosPorMes[i];
          const alturaIngreso = (m.monto / maxValor) * 100;
          const alturaGasto = (gasto.monto / maxValor) * 100;
          return (
            <div key={`${m.anio}-${m.mes}`} className="flex h-full flex-col items-center justify-end">
              <div className="flex w-full flex-1 items-end justify-center gap-1">
                <div className="flex h-full w-2.5 flex-col justify-end overflow-hidden rounded-t-md bg-edge">
                  <div className="w-full rounded-t-md bg-brass" style={{ height: `${alturaIngreso}%` }} />
                </div>
                <div className="flex h-full w-2.5 flex-col justify-end overflow-hidden rounded-t-md bg-edge">
                  <div className="w-full rounded-t-md bg-sede" style={{ height: `${alturaGasto}%` }} />
                </div>
              </div>
              <p className="mt-2 text-[0.65rem] uppercase tracking-wide text-ink-soft">{m.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function GraficoSueldos({ sueldosPorMes }: { sueldosPorMes: MesFinanciero[] }) {
  const maxValor = Math.max(...sueldosPorMes.map((m) => m.monto), 1);
  const actual = sueldosPorMes[sueldosPorMes.length - 1]?.monto ?? 0;

  return (
    <section className="rounded-2xl border border-edge bg-card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">Evolución de sueldos</h2>
        <span className="text-xs text-ink-soft">Total sueldos activos hoy: {formatearMonto(actual)}</span>
      </div>

      <div className="grid grid-cols-9 items-end gap-3" style={{ height: 160 }}>
        {sueldosPorMes.map((m) => {
          const altura = (m.monto / maxValor) * 100;
          return (
            <div key={`${m.anio}-${m.mes}`} className="flex h-full flex-col items-center justify-end">
              <div className="flex w-full flex-1 flex-col justify-end overflow-hidden rounded-t-xl bg-edge">
                <div className="w-full rounded-t-xl bg-sede" style={{ height: `${altura}%` }} />
              </div>
              <p className="mt-2 text-[0.65rem] uppercase tracking-wide text-ink-soft">{m.label}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-ink-soft">
        No hay un historial de cambios de sueldo cargado todavía: se muestra el total actual repetido
        como referencia, no una evolución real mes a mes.
      </p>
    </section>
  );
}
