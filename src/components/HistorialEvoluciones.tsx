"use client";

import { useActionState, useEffect, useState } from "react";
import { agregarAddenda, listarAddendas } from "@/app/residentes/[id]/accion-medica/actions";
import type { EvolucionMedica, EvolucionMedicaAddenda, TipoVisitaMedica } from "@/lib/types";

type Estado = { error: string | null };
const INICIAL: Estado = { error: null };

type Props = {
  residenteId: string;
  evoluciones: EvolucionMedica[];
};

const ETIQUETA_VISITA: Record<TipoVisitaMedica, string> = {
  control_rutina: "Control de rutina mensual",
  pase_diario: "Pase diario",
  evaluacion_post_caida: "Evaluación post-caída",
  descompensacion_aguda: "Descompensación aguda",
};

function FormularioAddenda({
  residenteId,
  evolucionId,
  onCerrar,
}: {
  residenteId: string;
  evolucionId: string;
  onCerrar: () => void;
}) {
  const accion = agregarAddenda.bind(null, residenteId, evolucionId);
  const [estado, formAction, enviando] = useActionState(accion, INICIAL);

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        onCerrar();
      }}
      className="mt-2 space-y-2 rounded-lg border border-edge bg-panel-deep p-2"
    >
      <textarea
        name="contenido"
        required
        rows={2}
        placeholder="Nota aclaratoria (no reemplaza el texto original)"
        className="w-full rounded-lg border border-edge bg-panel px-2 py-1.5 text-xs text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-3 py-1 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Agregar nota aclaratoria"}
        </button>
        <button type="button" onClick={onCerrar} className="text-xs text-ink-soft hover:text-ink">
          Cancelar
        </button>
      </div>
      {estado.error && <p className="text-xs text-red-700">{estado.error}</p>}
    </form>
  );
}

function FilaEvolucion({ residenteId, evolucion }: { residenteId: string; evolucion: EvolucionMedica }) {
  const [expandido, setExpandido] = useState(false);
  const [addendas, setAddendas] = useState<EvolucionMedicaAddenda[] | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  function cargarAddendas() {
    listarAddendas(evolucion.id).then(setAddendas);
  }

  useEffect(() => {
    if (expandido && addendas === null) cargarAddendas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandido]);

  return (
    <div className="rounded-2xl border border-edge bg-card p-4">
      <button type="button" onClick={() => setExpandido((v) => !v)} className="w-full text-left">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-brass-soft px-2 py-0.5 text-xs font-medium text-brass">
            {ETIQUETA_VISITA[evolucion.tipo_visita]}
          </span>
          <span className="text-xs text-ink-soft">
            {new Date(evolucion.firmado_at).toLocaleString("es-AR")}
          </span>
        </div>
        {!evolucion.estable && (
          <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[0.65rem] font-semibold text-red-800">
            Cambios agudos
          </span>
        )}
      </button>

      {expandido && (
        <div className="mt-2 space-y-2 text-xs text-ink-soft">
          {evolucion.subjetivo && (
            <p>
              <span className="font-semibold text-ink">S:</span> {evolucion.subjetivo}
            </p>
          )}
          {evolucion.objetivo && (
            <p>
              <span className="font-semibold text-ink">O:</span> {evolucion.objetivo}
            </p>
          )}
          {evolucion.apreciacion_diagnostico && (
            <p>
              <span className="font-semibold text-ink">A:</span> {evolucion.apreciacion_diagnostico}
            </p>
          )}
          {evolucion.plan_terapeutico && (
            <p>
              <span className="font-semibold text-ink">P:</span> {evolucion.plan_terapeutico}
            </p>
          )}
          <p className="text-[0.65rem]">Matrícula: {evolucion.matricula ?? "—"}</p>

          {addendas && addendas.length > 0 && (
            <div className="space-y-1 border-t border-edge pt-2">
              {addendas.map((a) => (
                <p key={a.id} className="rounded-lg bg-panel-deep p-2 text-ink-soft">
                  <span className="font-semibold">
                    Aclaración ({new Date(a.created_at).toLocaleString("es-AR")}):
                  </span>{" "}
                  {a.contenido}
                </p>
              ))}
            </div>
          )}

          {mostrarForm ? (
            <FormularioAddenda
              residenteId={residenteId}
              evolucionId={evolucion.id}
              onCerrar={() => {
                setMostrarForm(false);
                cargarAddendas();
              }}
            />
          ) : (
            <button type="button" onClick={() => setMostrarForm(true)} className="text-brass hover:text-ink">
              + Nota aclaratoria
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function HistorialEvoluciones({ residenteId, evoluciones }: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="rounded-2xl border border-edge bg-card p-4">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="font-display text-base font-semibold text-ink">
          Historial de evoluciones
          {evoluciones.length > 0 && (
            <span className="ml-2 text-xs font-normal text-ink-soft">({evoluciones.length})</span>
          )}
        </h2>
        <span className="text-xs text-ink-soft">{abierto ? "Ocultar ▲" : "Mostrar ▼"}</span>
      </button>

      {abierto && (
        <div className="mt-3 space-y-3">
          {evoluciones.length === 0 && (
            <p className="text-sm text-ink-soft">Todavía no hay evoluciones firmadas para este residente.</p>
          )}
          {evoluciones.map((e) => (
            <FilaEvolucion key={e.id} residenteId={residenteId} evolucion={e} />
          ))}
        </div>
      )}
    </div>
  );
}
