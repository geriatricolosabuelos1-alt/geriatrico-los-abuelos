import Link from "next/link";
import { hrefPedirReceta } from "@/lib/recetas";
import type { AlertaMedicacionResumen, ResumenSucursalDashboard } from "@/lib/dashboard";

const ESTILO_NIVEL: Record<string, string> = {
  aviso_7: "bg-amber-100 text-amber-800 border-amber-300",
  aviso_5: "bg-red-100 text-red-800 border-red-300",
  sin_stock: "bg-red-100 text-red-800 border-red-300",
};

function etiquetaAlerta(a: AlertaMedicacionResumen): string {
  if (a.sinDosisDiaria) {
    if (a.nivel === "sin_stock") return "Sin stock (sin dosis diaria cargada)";
    return `${a.stockActual} unid. — sin dosis diaria cargada`;
  }
  if (a.nivel === "sin_stock") return "Sin stock";
  if (a.diasRestantes === null) return "Stock bajo";
  return `Quedan ${a.diasRestantes} día${a.diasRestantes === 1 ? "" : "s"}`;
}

function urgencia(a: AlertaMedicacionResumen): number {
  return a.diasRestantes ?? a.stockActual ?? 99;
}

// Alertas agrupadas por residente (lo más urgente primero), para pedir todas sus recetas juntas.
function agruparPorResidente(alertas: AlertaMedicacionResumen[]) {
  const grupos = new Map<string, { residenteId: string; residenteNombre: string; alertas: AlertaMedicacionResumen[] }>();
  for (const a of alertas) {
    const g = grupos.get(a.residenteId) ?? { residenteId: a.residenteId, residenteNombre: a.residenteNombre, alertas: [] };
    g.alertas.push(a);
    grupos.set(a.residenteId, g);
  }
  return [...grupos.values()]
    .map((g) => ({ ...g, alertas: g.alertas.sort((x, y) => urgencia(x) - urgencia(y)) }))
    .sort((x, y) => urgencia(x.alertas[0]) - urgencia(y.alertas[0]));
}

// Listas de stock de medicación bajo e insumos con stock bajo de una sede.
// Se usa en el dashboard de la sede y en el dashboard general (con el nombre de la sede).
export function DetalleAlertasSede({
  sucursalId,
  resumen,
  sede,
}: {
  sucursalId: string;
  resumen: ResumenSucursalDashboard;
  sede?: string;
}) {
  const prefijo = sede ? `${sede} · ` : "";

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-edge bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-ink">{prefijo}Stock de medicación bajo</h2>
          <div className="flex items-center gap-3">
            <Link
              href={`/sucursales/${sucursalId}/medicacion/informe`}
              className="text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
            >
              Ver informe
            </Link>
            <Link
              href={`/sucursales/${sucursalId}/medicacion`}
              className="text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
            >
              Ver módulo
            </Link>
          </div>
        </div>
        {resumen.alertasMedicacion.length === 0 ? (
          <p className="text-xs text-ink-soft">Sin alertas activas.</p>
        ) : (
          <ul className="space-y-3">
            {agruparPorResidente(resumen.alertasMedicacion).map((grupo) => (
              <li key={grupo.residenteId} className="space-y-1.5 rounded-xl border border-edge p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{grupo.residenteNombre}</p>
                  <Link
                    href={hrefPedirReceta(
                      sucursalId,
                      grupo.residenteId,
                      grupo.alertas.map((a) => a.medicamentoNombre),
                    )}
                    className="rounded-full bg-brass px-3 py-1 text-[0.7rem] font-semibold text-btn-ink hover:bg-brass/90"
                  >
                    Pedir receta{grupo.alertas.length > 1 ? "s" : ""} →
                  </Link>
                </div>
                {grupo.alertas.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                    <p className="text-ink">{a.medicamentoNombre}</p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${ESTILO_NIVEL[a.nivel]} ${
                        a.nivel === "sin_stock" ? "alerta-pulso" : ""
                      }`}
                    >
                      {a.nivel === "sin_stock" && (
                        <span className="alerta-punto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-700" />
                      )}
                      {etiquetaAlerta(a)}
                    </span>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-edge bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-ink">{prefijo}Insumos con stock bajo</h2>
          <Link
            href={`/sucursales/${sucursalId}/inventario`}
            className="text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
          >
            Ver inventario
          </Link>
        </div>
        {resumen.alertasInsumos.length === 0 ? (
          <p className="text-xs text-ink-soft">Sin alertas activas.</p>
        ) : (
          <ul className="space-y-2">
            {resumen.alertasInsumos.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium text-ink">{i.nombre}</p>
                  <p className="text-xs text-ink-soft">
                    {i.categoria === "medicos" ? "Insumo médico" : "Insumo varios"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[0.65rem] font-semibold text-red-800 ${
                    i.stockActual <= 0 ? "alerta-pulso" : ""
                  }`}
                >
                  {i.stockActual <= 0 && (
                    <span className="alerta-punto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-700" />
                  )}
                  {i.stockActual} / mín. {i.stockMinimo}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
