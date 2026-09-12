"use client";

import { useActionState, useState } from "react";
import { agregarVacunacion, eliminarVacunacion } from "@/app/sucursales/[id]/medicacion/vacunacion-actions";
import type { TipoVacuna, VacunacionResidente } from "@/lib/types";

type Estado = { error: string | null };
const INICIAL: Estado = { error: null };

type ResidenteBasico = { id: string; nombre: string; apellido: string };
type VacunacionConNombre = VacunacionResidente & { residente_nombre: string };

type Props = {
  sucursalId: string;
  residentes: ResidenteBasico[];
  vacunaciones: VacunacionConNombre[];
};

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";
const CAMPO =
  "rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";

const ETIQUETA_VACUNA: Record<TipoVacuna, string> = {
  antigripal: "Antigripal",
  neumococo: "Neumococo",
  covid19: "COVID-19",
  otra: "Otra",
};

function FormularioVacunacion({ sucursalId, residentes }: { sucursalId: string; residentes: ResidenteBasico[] }) {
  const accion = agregarVacunacion.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accion, INICIAL);
  const [vacuna, setVacuna] = useState<TipoVacuna>("antigripal");

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-2xl border border-edge bg-card p-4">
      <div>
        <label className={ETIQUETA_MIN}>Residente</label>
        <select name="residente_id" required defaultValue="" className={`w-44 ${CAMPO}`}>
          <option value="" disabled>
            Elegí...
          </option>
          {residentes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.apellido}, {r.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Vacuna</label>
        <select
          name="vacuna"
          value={vacuna}
          onChange={(e) => setVacuna(e.target.value as TipoVacuna)}
          className={CAMPO}
        >
          {Object.entries(ETIQUETA_VACUNA).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      {vacuna === "otra" && (
        <div>
          <label className={ETIQUETA_MIN}>Nombre</label>
          <input name="vacuna_otra" className={CAMPO} />
        </div>
      )}
      <div>
        <label className={ETIQUETA_MIN}>Fecha de aplicación</label>
        <input type="date" name="fecha_aplicacion" required defaultValue={new Date().toISOString().slice(0, 10)} className={CAMPO} />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>N° de dosis</label>
        <input type="number" name="dosis_numero" min={1} className={`w-20 ${CAMPO}`} />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Próxima dosis</label>
        <input type="date" name="proxima_dosis" className={CAMPO} />
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        {enviando ? "Guardando..." : "+ Registrar"}
      </button>
      {estado.error && <p className="w-full text-xs text-red-700">{estado.error}</p>}
    </form>
  );
}

export function VacunacionClient({ sucursalId, residentes, vacunaciones }: Props) {
  async function borrar(id: string) {
    if (!window.confirm("¿Eliminar este registro de vacunación?")) return;
    await eliminarVacunacion(sucursalId, id);
  }

  return (
    <div className="space-y-4">
      <FormularioVacunacion sucursalId={sucursalId} residentes={residentes} />

      <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              <th className="px-3 py-2">Residente</th>
              <th className="px-3 py-2">Vacuna</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Dosis</th>
              <th className="px-3 py-2">Próxima</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {vacunaciones.map((v) => (
              <tr key={v.id} className="border-t border-edge">
                <td className="px-3 py-2 text-ink">{v.residente_nombre}</td>
                <td className="px-3 py-2 text-ink-soft">
                  {v.vacuna === "otra" ? v.vacuna_otra ?? "Otra" : ETIQUETA_VACUNA[v.vacuna]}
                </td>
                <td className="px-3 py-2 text-ink-soft">
                  {new Date(v.fecha_aplicacion + "T00:00:00").toLocaleDateString("es-AR")}
                </td>
                <td className="px-3 py-2 text-ink-soft">{v.dosis_numero ?? "—"}</td>
                <td className="px-3 py-2 text-ink-soft">
                  {v.proxima_dosis ? new Date(v.proxima_dosis + "T00:00:00").toLocaleDateString("es-AR") : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => borrar(v.id)} className="text-xs text-red-700 hover:text-red-500">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {vacunaciones.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-ink-soft">
                  Sin vacunaciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
