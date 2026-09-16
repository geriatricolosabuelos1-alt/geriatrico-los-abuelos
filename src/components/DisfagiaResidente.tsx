"use client";

import { useActionState, useState } from "react";
import { registrarValoracionDeglucion } from "@/app/sucursales/[id]/nutricion/actions";
import type { ValoracionDeglucion } from "@/lib/types";

type Estado = { error: string | null };
const INICIAL: Estado = { error: null };

type Props = {
  sucursalId: string;
  residenteId: string;
  residenteNombre: string;
  valoraciones: ValoracionDeglucion[];
};

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";

const SINTOMAS: { name: keyof ValoracionDeglucion; label: string }[] = [
  { name: "tos_al_comer", label: "Tos durante/después de comer" },
  { name: "voz_humeda", label: "Voz húmeda" },
  { name: "deglucion_fraccionada", label: "Deglución fraccionada" },
  { name: "carraspeo", label: "Carraspeo frecuente" },
  { name: "retencion_carrillos", label: "Retención de comida en carrillos" },
];

function FormularioValoracion({
  sucursalId,
  residenteId,
  onCerrar,
}: {
  sucursalId: string;
  residenteId: string;
  onCerrar: () => void;
}) {
  const accion = registrarValoracionDeglucion.bind(null, sucursalId, residenteId);
  const [estado, formAction, enviando] = useActionState(accion, INICIAL);

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        onCerrar();
      }}
      className="mt-2 space-y-3 rounded-lg border border-edge bg-panel-deep p-3"
    >
      <div className="grid grid-cols-2 gap-2">
        {SINTOMAS.map((s) => (
          <label key={String(s.name)} className="flex items-center gap-2 text-xs text-ink">
            <input type="checkbox" name={String(s.name)} />
            {s.label}
          </label>
        ))}
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Indicación de espesante</label>
        <input
          name="indicacion_espesante"
          placeholder="Ej: 2 medidas de espesante cada 200ml de agua"
          className="w-full rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-ink">
        <input type="checkbox" name="medicacion_triturada" />
        Medicación oral triturada en compota/puré (validado por farmacia)
      </label>
      <div>
        <label className={ETIQUETA_MIN}>Notas</label>
        <input
          name="notas"
          className="w-full rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Guardar valoración"}
        </button>
        <button type="button" onClick={onCerrar} className="text-xs text-ink-soft hover:text-ink">
          Cancelar
        </button>
        {estado.error && <span className="text-xs text-red-700">{estado.error}</span>}
      </div>
    </form>
  );
}

export function DisfagiaResidente({ sucursalId, residenteId, residenteNombre, valoraciones }: Props) {
  const [abierto, setAbierto] = useState(false);
  const ultima = valoraciones[0];
  const sintomasActivos = ultima
    ? SINTOMAS.filter((s) => ultima[s.name] === true).map((s) => s.label)
    : [];

  return (
    <section className="rounded-2xl border border-edge bg-card p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-base font-semibold text-ink">{residenteNombre}</p>
        {sintomasActivos.length > 0 && (
          <span className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[0.65rem] font-semibold text-red-800">
            Riesgo de disfagia
          </span>
        )}
      </div>

      {ultima ? (
        <div className="mb-2 text-xs text-ink-soft">
          <p>
            Última valoración: {new Date(ultima.fecha + "T00:00:00").toLocaleDateString("es-AR")}
            {sintomasActivos.length > 0 && ` — ${sintomasActivos.join(", ")}`}
          </p>
          {ultima.indicacion_espesante && <p>Espesante: {ultima.indicacion_espesante}</p>}
          {ultima.medicacion_triturada && <p>Medicación oral: triturada en compota/puré</p>}
        </div>
      ) : (
        <p className="mb-2 text-xs text-ink-soft">Sin valoración registrada.</p>
      )}

      <button type="button" onClick={() => setAbierto((v) => !v)} className="text-xs text-brass hover:text-ink">
        + Nueva valoración
      </button>

      {abierto && (
        <FormularioValoracion
          sucursalId={sucursalId}
          residenteId={residenteId}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </section>
  );
}
