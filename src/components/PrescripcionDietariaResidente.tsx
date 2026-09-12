"use client";

import { useActionState, useState } from "react";
import {
  agregarRestriccion,
  prescribirDieta,
  quitarRestriccion,
} from "@/app/sucursales/[id]/nutricion/actions";
import type { PrescripcionDietaria, RestriccionResidente } from "@/lib/types";

type Estado = { error: string | null };
const INICIAL: Estado = { error: null };

type Props = {
  sucursalId: string;
  residenteId: string;
  residenteNombre: string;
  prescripcion: PrescripcionDietaria | null;
  restricciones: RestriccionResidente[];
};

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";

const ETIQUETA_DIETA: Record<PrescripcionDietaria["tipo_dieta"], string> = {
  general: "General / común",
  hiposodica_estricta: "Hiposódica estricta",
  hiposodica_moderada: "Hiposódica moderada",
  diabetica: "Diabética / control HC",
  astringente: "Astringente",
  rica_en_fibra: "Rica en fibra",
  renal: "Renal",
};

const ETIQUETA_IDDSI: Record<string, string> = {
  "7": "Nivel 7 · Normal",
  "6": "Nivel 6 · Blanda / cortada",
  "5": "Nivel 5 · Picada y húmeda",
  "4": "Nivel 4 · Papilla / puré",
};

const ETIQUETA_LIQUIDO: Record<PrescripcionDietaria["tipo_liquido"], string> = {
  normal: "Normal",
  nectar: "Néctar",
  miel: "Miel",
  pudin: "Pudín",
};

const ETIQUETA_RESTRICCION: Record<RestriccionResidente["tipo"], string> = {
  alergia: "Alergia",
  intolerancia: "Intolerancia",
  aversion: "Aversión",
};

function FormularioPrescripcion({
  sucursalId,
  residenteId,
  onCerrar,
}: {
  sucursalId: string;
  residenteId: string;
  onCerrar: () => void;
}) {
  const accion = prescribirDieta.bind(null, sucursalId, residenteId);
  const [estado, formAction, enviando] = useActionState(accion, INICIAL);

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        onCerrar();
      }}
      className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-edge bg-panel-deep p-3"
    >
      <div>
        <label className={ETIQUETA_MIN}>Tipo de dieta</label>
        <select
          name="tipo_dieta"
          required
          defaultValue=""
          className="w-44 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        >
          <option value="" disabled>
            Elegí...
          </option>
          {Object.entries(ETIQUETA_DIETA).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Consistencia (IDDSI)</label>
        <select
          name="nivel_iddsi"
          defaultValue="7"
          className="w-44 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        >
          {Object.entries(ETIQUETA_IDDSI).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Líquidos</label>
        <select
          name="tipo_liquido"
          defaultValue="normal"
          className="w-32 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        >
          {Object.entries(ETIQUETA_LIQUIDO).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-40 flex-1">
        <label className={ETIQUETA_MIN}>Notas</label>
        <input
          name="notas"
          className="w-full rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brass px-3 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        {enviando ? "Guardando..." : "Prescribir"}
      </button>
      <button type="button" onClick={onCerrar} className="text-xs text-ink-soft hover:text-ink">
        Cancelar
      </button>
      {estado.error && <p className="w-full text-xs text-red-700">{estado.error}</p>}
    </form>
  );
}

function FormularioRestriccion({
  sucursalId,
  residenteId,
  onCerrar,
}: {
  sucursalId: string;
  residenteId: string;
  onCerrar: () => void;
}) {
  const accion = agregarRestriccion.bind(null, sucursalId, residenteId);
  const [estado, formAction, enviando] = useActionState(accion, INICIAL);

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        onCerrar();
      }}
      className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-edge bg-panel-deep p-3"
    >
      <div>
        <label className={ETIQUETA_MIN}>Tipo</label>
        <select
          name="tipo"
          defaultValue="alergia"
          className="rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        >
          <option value="alergia">Alergia</option>
          <option value="intolerancia">Intolerancia</option>
          <option value="aversion">Aversión</option>
        </select>
      </div>
      <div className="min-w-40 flex-1">
        <label className={ETIQUETA_MIN}>Detalle</label>
        <input
          name="detalle"
          required
          placeholder="Ej: lactosa, no consume cerdo"
          className="w-full rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brass px-3 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        {enviando ? "Guardando..." : "+ Agregar"}
      </button>
      <button type="button" onClick={onCerrar} className="text-xs text-ink-soft hover:text-ink">
        Cancelar
      </button>
      {estado.error && <p className="w-full text-xs text-red-700">{estado.error}</p>}
    </form>
  );
}

export function PrescripcionDietariaResidente({
  sucursalId,
  residenteId,
  residenteNombre,
  prescripcion,
  restricciones,
}: Props) {
  const [panel, setPanel] = useState<"ninguno" | "prescripcion" | "restriccion">("ninguno");

  async function quitar(id: string) {
    await quitarRestriccion(sucursalId, id);
  }

  return (
    <section className="rounded-2xl border border-edge bg-card p-5">
      <p className="mb-2 font-display text-base font-semibold text-ink">{residenteNombre}</p>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        {prescripcion ? (
          <>
            <span className="rounded-full border border-brass/40 bg-brass-soft px-2 py-0.5 text-xs font-semibold text-brass">
              {ETIQUETA_DIETA[prescripcion.tipo_dieta]}
            </span>
            <span className="rounded-full border border-edge bg-panel-deep px-2 py-0.5 text-xs text-ink-soft">
              {ETIQUETA_IDDSI[prescripcion.nivel_iddsi]}
            </span>
            <span className="rounded-full border border-edge bg-panel-deep px-2 py-0.5 text-xs text-ink-soft">
              Líquidos: {ETIQUETA_LIQUIDO[prescripcion.tipo_liquido]}
            </span>
          </>
        ) : (
          <span className="text-xs text-ink-soft">Sin prescripción activa.</span>
        )}
      </div>

      {restricciones.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {restricciones.map((r) => (
            <span
              key={r.id}
              className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[0.65rem] font-semibold text-red-800"
            >
              {ETIQUETA_RESTRICCION[r.tipo]}: {r.detalle}
              <button type="button" onClick={() => quitar(r.id)} className="text-red-900 hover:text-red-600">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs">
        <button
          type="button"
          onClick={() => setPanel(panel === "prescripcion" ? "ninguno" : "prescripcion")}
          className="text-brass hover:text-ink"
        >
          {prescripcion ? "Cambiar dieta" : "Prescribir dieta"}
        </button>
        <button
          type="button"
          onClick={() => setPanel(panel === "restriccion" ? "ninguno" : "restriccion")}
          className="text-brass hover:text-ink"
        >
          + Restricción / alergia
        </button>
      </div>

      {panel === "prescripcion" && (
        <FormularioPrescripcion
          sucursalId={sucursalId}
          residenteId={residenteId}
          onCerrar={() => setPanel("ninguno")}
        />
      )}
      {panel === "restriccion" && (
        <FormularioRestriccion
          sucursalId={sucursalId}
          residenteId={residenteId}
          onCerrar={() => setPanel("ninguno")}
        />
      )}
    </section>
  );
}
