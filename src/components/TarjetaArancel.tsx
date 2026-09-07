import Link from "next/link";
import type { ResumenCuentaCorriente } from "@/lib/aranceles";

type Props = {
  residente: {
    id: string;
    nombre: string;
    apellido: string;
    fecha_ingreso: string | null;
  };
  obraSocial: string | null;
  resumen: ResumenCuentaCorriente;
};

const MESES = [
  "", "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function formatearFecha(fecha: string | null): string {
  return fecha ? new Date(fecha + "T00:00:00").toLocaleDateString("es-AR") : "—";
}

function formatearMonto(monto: number): string {
  return `$${monto.toLocaleString("es-AR")}`;
}

export function TarjetaArancel({ residente, obraSocial, resumen }: Props) {
  return (
    <div className="rounded-2xl border border-edge bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-display text-base font-semibold text-ink">
            {residente.apellido}, {residente.nombre}
          </p>
          <p className="text-xs text-ink-soft">
            Ingreso: {formatearFecha(residente.fecha_ingreso)} · Obra social: {obraSocial ?? "—"}
          </p>
        </div>
        <Link
          href={`/residentes/${residente.id}/cuenta-corriente`}
          className="flex-shrink-0 rounded-full border border-edge px-4 py-1.5 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
        >
          Ver cuenta corriente
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-edge pt-3 sm:grid-cols-4">
        <div>
          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Último período pagado
          </p>
          <p className="text-sm text-ink">
            {resumen.ultimoPeriodoPagado
              ? `${MESES[resumen.ultimoPeriodoPagado.mes]} ${resumen.ultimoPeriodoPagado.anio}`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Pendientes
          </p>
          <p className={resumen.cantidadPendientes > 0 ? "text-sm text-red-400" : "text-sm text-ink"}>
            {resumen.cantidadPendientes > 0 ? `${resumen.cantidadPendientes} período(s)` : "Al día"}
          </p>
        </div>
        <div>
          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Adeudado
          </p>
          <p className="text-sm text-ink">
            {resumen.totalAdeudado > 0 ? formatearMonto(resumen.totalAdeudado) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
            Costo por mora
          </p>
          <p className={resumen.totalMora > 0 ? "text-sm text-red-400" : "text-sm text-ink"}>
            {resumen.totalMora > 0 ? formatearMonto(resumen.totalMora) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
