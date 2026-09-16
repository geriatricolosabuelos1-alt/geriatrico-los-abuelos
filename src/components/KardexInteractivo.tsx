"use client";

import { useActionState, useState } from "react";
import {
  accionKardex,
  prescribirFarmacoConAviso,
  type AccionKardexEstado,
  type PrescribirEstado,
} from "@/app/residentes/[id]/accion-medica/actions";
import type { AccionKardex, CambioMedicacion, CatalogoMedicamento, MedicamentoResidente } from "@/lib/types";

const ESTADO_KARDEX_INICIAL: AccionKardexEstado = { error: null };
const ESTADO_PRESCRIBIR_INICIAL: PrescribirEstado = { error: null };

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";

function esCambioReciente(fecha: string | null): boolean {
  if (!fecha) return false;
  return Date.now() - new Date(fecha).getTime() < 24 * 60 * 60 * 1000;
}

function FilaKardex({ residenteId, medicamento }: { residenteId: string; medicamento: MedicamentoResidente }) {
  const accion = accionKardex.bind(null, residenteId);
  const [estado, formAction, enviando] = useActionState(accion, ESTADO_KARDEX_INICIAL);
  const [panel, setPanel] = useState<"ninguno" | "suspender" | "modificar">("ninguno");

  function mantener() {
    const fd = new FormData();
    fd.set("medicamento_id", medicamento.id);
    fd.set("accion", "mantener" satisfies AccionKardex);
    formAction(fd);
  }

  return (
    <div className="rounded-lg border border-edge bg-panel-deep p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink">
            {medicamento.nombre} {medicamento.dosis && <span className="text-ink-soft">· {medicamento.dosis}</span>}
          </p>
          <p className="text-xs text-ink-soft">
            {medicamento.via_administracion ?? "—"} · {medicamento.horarios?.join(" - ") ?? medicamento.horario ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {esCambioReciente(medicamento.cambio_reciente_at) && (
            <span className="rounded-full border border-blue-300 bg-blue-100 px-2 py-0.5 text-[0.6rem] font-semibold text-blue-800">
              Cambio reciente
            </span>
          )}
          <button
            type="button"
            onClick={mantener}
            disabled={enviando}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
          >
            Mantener
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "suspender" ? "ninguno" : "suspender")}
            className="text-xs font-medium text-red-700 hover:text-red-900"
          >
            Suspender
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "modificar" ? "ninguno" : "modificar")}
            className="text-xs font-medium text-brass hover:text-ink"
          >
            Modificar dosis
          </button>
        </div>
      </div>

      {panel === "suspender" && (
        <form
          action={(fd) => {
            fd.set("medicamento_id", medicamento.id);
            fd.set("accion", "suspender");
            formAction(fd);
            setPanel("ninguno");
          }}
          className="mt-2 flex items-end gap-2"
        >
          <input
            name="motivo"
            required
            placeholder="Motivo de suspensión"
            className="flex-1 rounded-lg border border-edge bg-panel px-2 py-1.5 text-xs text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
          />
          <button type="submit" className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600">
            Confirmar
          </button>
        </form>
      )}

      {panel === "modificar" && (
        <form
          action={(fd) => {
            fd.set("medicamento_id", medicamento.id);
            fd.set("accion", "modificar_dosis");
            formAction(fd);
            setPanel("ninguno");
          }}
          className="mt-2 flex items-end gap-2"
        >
          <input
            name="nueva_dosis"
            required
            placeholder="Nueva dosis (ej: 100mg)"
            className="w-32 rounded-lg border border-edge bg-panel px-2 py-1.5 text-xs text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
          />
          <input
            name="motivo"
            required
            placeholder="Motivo del ajuste"
            className="flex-1 rounded-lg border border-edge bg-panel px-2 py-1.5 text-xs text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
          />
          <button type="submit" className="rounded-lg bg-brass px-3 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90">
            Confirmar
          </button>
        </form>
      )}

      {estado.error && <p className="mt-1 text-xs text-red-700">{estado.error}</p>}
    </div>
  );
}

function FormularioPrescribir({ residenteId, catalogo }: { residenteId: string; catalogo: CatalogoMedicamento[] }) {
  const accion = prescribirFarmacoConAviso.bind(null, residenteId);
  const [estado, formAction, enviando] = useActionState(accion, ESTADO_PRESCRIBIR_INICIAL);
  const [tipo, setTipo] = useState<"continua" | "sos">("continua");
  const [confirmarAviso, setConfirmarAviso] = useState(false);

  const nombresConocidos = [...new Set(catalogo.map((c) => c.nombre))];

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-edge bg-panel-deep p-3">
      <input type="hidden" name="confirmar_aviso" value={confirmarAviso ? "on" : ""} />
      <div>
        <label className={ETIQUETA_MIN}>Fármaco</label>
        <input
          name="nombre"
          required
          list="vademecum"
          className="w-36 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
        <datalist id="vademecum">
          {nombresConocidos.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Dosis</label>
        <input
          name="dosis"
          placeholder="50mg"
          className="w-20 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Vía</label>
        <input
          name="via_administracion"
          placeholder="Oral"
          className="w-24 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Horarios</label>
        <input
          name="horarios"
          placeholder="08:00, 20:00"
          className="w-32 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Tipo</label>
        <select
          name="tipo_administracion"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as "continua" | "sos")}
          className="rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        >
          <option value="continua">Fijo (continuo)</option>
          <option value="sos">SOS / rescate</option>
        </select>
      </div>
      {tipo === "sos" && (
        <div>
          <label className={ETIQUETA_MIN}>Dosis máx. diaria</label>
          <input
            type="number"
            name="dosis_maxima_diaria"
            min={0}
            step="0.5"
            className="w-24 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brass px-3 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        {enviando ? "Guardando..." : "+ Prescribir"}
      </button>

      {estado.aviso && (
        <div className="w-full rounded-lg border border-amber-300 bg-amber-100 p-2 text-xs text-amber-800">
          <p>{estado.aviso}</p>
          <label className="mt-1 flex items-center gap-2">
            <input
              type="checkbox"
              checked={confirmarAviso}
              onChange={(e) => setConfirmarAviso(e.target.checked)}
            />
            Confirmo y prescribo de todas formas
          </label>
        </div>
      )}
      {estado.error && <p className="w-full text-xs text-red-700">{estado.error}</p>}
    </form>
  );
}

export function KardexInteractivo({
  residenteId,
  kardex,
  catalogo,
  cambiosRecientes,
}: {
  residenteId: string;
  kardex: MedicamentoResidente[];
  catalogo: CatalogoMedicamento[];
  cambiosRecientes: CambioMedicacion[];
}) {
  return (
    <section className="rounded-2xl border border-edge bg-card p-5">
      <h2 className="mb-2 font-display text-base font-semibold text-ink">Kardex interactivo</h2>

      <div className="space-y-2">
        {kardex.map((m) => (
          <FilaKardex key={m.id} residenteId={residenteId} medicamento={m} />
        ))}
        {kardex.length === 0 && <p className="text-xs text-ink-soft">Sin medicación activa.</p>}
      </div>

      <FormularioPrescribir residenteId={residenteId} catalogo={catalogo} />

      {cambiosRecientes.length > 0 && (
        <div className="mt-3 border-t border-edge pt-2">
          <p className={ETIQUETA_MIN}>Últimos cambios</p>
          <ul className="space-y-0.5 text-xs text-ink-soft">
            {cambiosRecientes.slice(0, 5).map((c) => (
              <li key={c.id}>
                {new Date(c.fecha).toLocaleString("es-AR")} — {c.accion}
                {c.motivo && `: ${c.motivo}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
