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

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="whitespace-nowrap text-[0.6rem] font-medium uppercase tracking-wide text-ink-soft">
        {etiqueta}
      </p>
      <p className="text-sm">{children}</p>
    </div>
  );
}

export function TarjetaArancel({ residente, obraSocial, resumen }: Props) {
  return (
    <Link
      href={`/residentes/${residente.id}/cuenta-corriente`}
      className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-edge bg-card p-4 hover:border-brass"
    >
      <div className="min-w-[11rem] flex-shrink-0">
        <p className="font-display text-sm font-semibold text-ink">
          {residente.apellido}, {residente.nombre}
        </p>
        <p className="text-xs text-ink-soft">
          Ingreso: {formatearFecha(residente.fecha_ingreso)} · {obraSocial ?? "—"}
        </p>
      </div>

      <Dato etiqueta="Último pagado">
        <span className="text-ink">
          {resumen.ultimoPeriodoPagado
            ? `${MESES[resumen.ultimoPeriodoPagado.mes]} ${resumen.ultimoPeriodoPagado.anio}`
            : "—"}
        </span>
      </Dato>

      <Dato etiqueta="Pendientes">
        <span className={resumen.cantidadPendientes > 0 ? "text-red-400" : "text-ink"}>
          {resumen.cantidadPendientes > 0 ? `${resumen.cantidadPendientes}` : "Al día"}
        </span>
      </Dato>

      <Dato etiqueta="Adeudado">
        <span className="text-ink">
          {resumen.totalAdeudado > 0 ? formatearMonto(resumen.totalAdeudado) : "—"}
        </span>
      </Dato>

      <Dato etiqueta="Mora">
        <span className={resumen.totalMora > 0 ? "text-red-400" : "text-ink"}>
          {resumen.totalMora > 0 ? formatearMonto(resumen.totalMora) : "—"}
        </span>
      </Dato>
    </Link>
  );
}
