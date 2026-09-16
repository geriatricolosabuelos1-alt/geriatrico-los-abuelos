import type { Fichada } from "@/lib/types";

type Props = {
  fichadas: Fichada[];
  empleadosPorId: Map<string, string>;
};

type FilaResumen = {
  empleadoId: string;
  fecha: string;
  horaEntrada: string | null;
  horaSalida: string | null;
};

function agruparPorDia(fichadas: Fichada[]): FilaResumen[] {
  const mapa = new Map<string, FilaResumen>();

  for (const f of fichadas) {
    const clave = `${f.empleado_id}_${f.fecha}`;
    const fila = mapa.get(clave) ?? {
      empleadoId: f.empleado_id,
      fecha: f.fecha,
      horaEntrada: null,
      horaSalida: null,
    };

    if (f.tipo === "ingreso") {
      if (!fila.horaEntrada || f.hora < fila.horaEntrada) fila.horaEntrada = f.hora;
    } else {
      if (!fila.horaSalida || f.hora > fila.horaSalida) fila.horaSalida = f.hora;
    }

    mapa.set(clave, fila);
  }

  return Array.from(mapa.values()).sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
}

export function TablaFichadas({ fichadas, empleadosPorId }: Props) {
  const filas = agruparPorDia(fichadas);

  return (
    <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Empleado</th>
            <th className="px-4 py-3">Hora entrada</th>
            <th className="px-4 py-3">Hora salida</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={`${f.empleadoId}_${f.fecha}`} className="border-b border-edge last:border-0">
              <td className="px-4 py-3 text-ink whitespace-nowrap">
                {new Date(f.fecha + "T00:00:00").toLocaleDateString("es-AR")}
              </td>
              <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                {empleadosPorId.get(f.empleadoId) ?? "—"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {f.horaEntrada ? (
                  <span className="rounded-full bg-green-700/10 px-2 py-0.5 text-xs font-semibold text-green-700">
                    {f.horaEntrada.slice(0, 5)} hs
                  </span>
                ) : (
                  <span className="text-ink-soft">—</span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {f.horaSalida ? (
                  <span className="rounded-full bg-red-700/10 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {f.horaSalida.slice(0, 5)} hs
                  </span>
                ) : (
                  <span className="text-ink-soft">—</span>
                )}
              </td>
            </tr>
          ))}
          {filas.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-ink-soft">
                No hay fichadas registradas en este período.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
