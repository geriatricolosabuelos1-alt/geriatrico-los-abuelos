import { formatearMonto, type ResumenFinancieroSucursal } from "@/lib/finanzas";

// Lo que queda del mes (ingresos − gastos − sueldos), con el detalle de cada parte.
export function TarjetaDisponible({ finanzas, sufijo }: { finanzas: ResumenFinancieroSucursal; sufijo?: string }) {
  const detalle: [string, number, string][] = [
    ["Ingresos", finanzas.ingresosMes, "+"],
    ["Gastos", finanzas.gastosMes, "−"],
    ["Sueldos", finanzas.sueldosMes, "−"],
  ];
  return (
    <div className="rounded-2xl border border-edge bg-card p-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Disponible del mes{sufijo ? ` · ${sufijo}` : ""}
      </p>
      <p
        className={`font-display text-3xl font-semibold tabular-nums lining-nums ${
          finanzas.disponibleConSueldos < 0 ? "text-red-700" : "text-ink"
        }`}
      >
        {formatearMonto(finanzas.disponibleConSueldos)}
      </p>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-soft">
        {detalle.map(([etiqueta, monto, signo]) => (
          <div key={etiqueta} className="flex gap-1.5">
            <dt>{etiqueta}</dt>
            <dd className="font-semibold tabular-nums text-ink">
              {signo} {formatearMonto(monto)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[0.7rem] text-ink-soft">
        Sueldos = recibos de sueldo emitidos para este mes (si faltan recibos, el disponible se ve más alto).
      </p>
    </div>
  );
}
