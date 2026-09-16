import type { Fichada } from "@/lib/types";

type Props = {
  fichadas: Fichada[];
  empleadosPorId: Map<string, string>;
};

export function TablaFichadas({ fichadas, empleadosPorId }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Empleado</th>
            <th className="px-4 py-3">Movimiento</th>
            <th className="px-4 py-3">Hora</th>
          </tr>
        </thead>
        <tbody>
          {fichadas.map((f) => (
            <tr key={f.id} className="border-b border-edge last:border-0">
              <td className="px-4 py-3 text-ink whitespace-nowrap">
                {new Date(f.fecha + "T00:00:00").toLocaleDateString("es-AR")}
              </td>
              <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                {empleadosPorId.get(f.empleado_id) ?? "—"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    f.tipo === "ingreso"
                      ? "bg-green-700/10 text-green-700"
                      : "bg-red-700/10 text-red-700"
                  }`}
                >
                  {f.tipo === "ingreso" ? "Ingreso" : "Egreso"}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-soft">{f.hora.slice(0, 5)} hs</td>
            </tr>
          ))}
          {fichadas.length === 0 && (
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
