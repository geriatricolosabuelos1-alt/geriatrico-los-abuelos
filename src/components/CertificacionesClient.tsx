"use client";

import { useActionState } from "react";
import {
  agregarContratoSalud,
  agregarRetiroResiduos,
  eliminarContratoSalud,
  eliminarRetiroResiduos,
} from "@/app/sucursales/[id]/legales/sanitario-actions";
import type { ContratoProveedorSalud, RetiroResiduoPatogenico } from "@/lib/types";

type Estado = { error: string | null };
const INICIAL: Estado = { error: null };

type Props = {
  sucursalId: string;
  contratos: ContratoProveedorSalud[];
  residuos: RetiroResiduoPatogenico[];
};

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";
const CAMPO =
  "rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";

function diasParaVencer(fecha: string | null): number | null {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function estiloVencimiento(dias: number | null): string {
  if (dias === null) return "border-edge bg-panel-deep text-ink-soft";
  if (dias < 0) return "border-red-300 bg-red-100 text-red-800";
  if (dias <= 30) return "border-amber-300 bg-amber-100 text-amber-800";
  return "border-emerald-300 bg-emerald-100 text-emerald-800";
}

function SeccionContratos({ sucursalId, contratos }: { sucursalId: string; contratos: ContratoProveedorSalud[] }) {
  const accion = agregarContratoSalud.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accion, INICIAL);

  async function borrar(id: string) {
    if (!window.confirm("¿Eliminar este contrato?")) return;
    await eliminarContratoSalud(sucursalId, id);
  }

  return (
    <section className="rounded-2xl border border-edge bg-card p-5">
      <h2 className="mb-3 font-display text-base font-semibold text-ink">
        Contratos de Área Protegida / proveedores
      </h2>

      <form action={formAction} className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className={ETIQUETA_MIN}>Tipo</label>
          <select name="tipo" defaultValue="area_protegida" className={CAMPO}>
            <option value="area_protegida">Área Protegida (emergencias)</option>
            <option value="otro">Otro proveedor</option>
          </select>
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Proveedor</label>
          <input name="proveedor" required placeholder="Nombre de la empresa" className={CAMPO} />
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Vencimiento</label>
          <input type="date" name="fecha_vencimiento" className={CAMPO} />
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Contacto</label>
          <input name="contacto" placeholder="Teléfono / email" className={CAMPO} />
        </div>
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "+ Agregar"}
        </button>
        {estado.error && <p className="w-full text-xs text-red-700">{estado.error}</p>}
      </form>

      <div className="space-y-2">
        {contratos.map((c) => {
          const dias = diasParaVencer(c.fecha_vencimiento);
          return (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-edge bg-panel-deep p-3"
            >
              <div>
                <p className="text-sm font-medium text-ink">
                  {c.proveedor}{" "}
                  <span className="text-xs text-ink-soft">
                    ({c.tipo === "area_protegida" ? "Área Protegida" : "Otro"})
                  </span>
                </p>
                {c.contacto && <p className="text-xs text-ink-soft">{c.contacto}</p>}
              </div>
              <div className="flex items-center gap-2">
                {c.fecha_vencimiento && (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${estiloVencimiento(dias)}`}
                  >
                    {dias !== null && dias < 0
                      ? "Vencido"
                      : `Vence ${new Date(c.fecha_vencimiento + "T00:00:00").toLocaleDateString("es-AR")}`}
                  </span>
                )}
                <button type="button" onClick={() => borrar(c.id)} className="text-xs text-red-700 hover:text-red-500">
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
        {contratos.length === 0 && <p className="text-xs text-ink-soft">Sin contratos registrados.</p>}
      </div>
    </section>
  );
}

function SeccionResiduos({ sucursalId, residuos }: { sucursalId: string; residuos: RetiroResiduoPatogenico[] }) {
  const accion = agregarRetiroResiduos.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accion, INICIAL);

  async function borrar(id: string) {
    if (!window.confirm("¿Eliminar este registro de retiro?")) return;
    await eliminarRetiroResiduos(sucursalId, id);
  }

  return (
    <section className="rounded-2xl border border-edge bg-card p-5">
      <h2 className="mb-3 font-display text-base font-semibold text-ink">Retiro de residuos patogénicos</h2>

      <form action={formAction} className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className={ETIQUETA_MIN}>Fecha</label>
          <input type="date" name="fecha" defaultValue={new Date().toISOString().slice(0, 10)} className={CAMPO} />
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Empresa transportista</label>
          <input name="empresa" required className={CAMPO} />
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Cantidad (kg)</label>
          <input type="number" name="cantidad_kg" min={0} step="0.1" className={`w-24 ${CAMPO}`} />
        </div>
        <div>
          <label className={ETIQUETA_MIN}>N° de manifiesto</label>
          <input name="numero_manifiesto" className={CAMPO} />
        </div>
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "+ Agregar"}
        </button>
        {estado.error && <p className="w-full text-xs text-red-700">{estado.error}</p>}
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Empresa</th>
              <th className="px-3 py-2">Kg</th>
              <th className="px-3 py-2">Manifiesto</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {residuos.map((r) => (
              <tr key={r.id} className="border-t border-edge">
                <td className="px-3 py-2 text-ink-soft">{new Date(r.fecha + "T00:00:00").toLocaleDateString("es-AR")}</td>
                <td className="px-3 py-2 text-ink">{r.empresa}</td>
                <td className="px-3 py-2 text-ink-soft">{r.cantidad_kg ?? "—"}</td>
                <td className="px-3 py-2 text-ink-soft">{r.numero_manifiesto ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => borrar(r.id)} className="text-xs text-red-700 hover:text-red-500">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {residuos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-ink-soft">
                  Sin retiros registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CertificacionesClient({ sucursalId, contratos, residuos }: Props) {
  return (
    <div className="space-y-4">
      <SeccionContratos sucursalId={sucursalId} contratos={contratos} />
      <SeccionResiduos sucursalId={sucursalId} residuos={residuos} />
    </div>
  );
}
