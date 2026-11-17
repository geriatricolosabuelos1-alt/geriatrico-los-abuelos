"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { firmarPendientes, type PendienteFirma } from "@/app/residentes/[id]/accion-medica/evaluacion-actions";

function fecha(valor: string): string {
  return valor.split("-").reverse().join("/");
}

function mesAnio(valor: string): string {
  return new Date(valor + "T00:00:00").toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

// Documentos que cargó administración y la médica todavía no firmó: los firma todos juntos
// con su PIN, o abre uno para revisarlo y corregirlo antes de firmar.
export function PendientesFirmaMedica({
  sedeId,
  pendientes,
  esMedico,
  pinConfigurado,
}: {
  sedeId: string;
  pendientes: PendienteFirma[];
  esMedico: boolean;
  pinConfigurado: boolean;
}) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set(pendientes.map((p) => p.residenteId)));
  const [pin, setPin] = useState("");
  const [matricula, setMatricula] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [firmando, startTransition] = useTransition();

  if (pendientes.length === 0) return null;

  function alternar(id: string) {
    setSeleccion((prev) => {
      const nueva = new Set(prev);
      if (nueva.has(id)) nueva.delete(id);
      else nueva.add(id);
      return nueva;
    });
  }

  function firmar() {
    const ids = pendientes.map((p) => p.residenteId).filter((id) => seleccion.has(id));
    if (ids.length === 0) {
      setError("Elegí al menos un residente.");
      return;
    }
    if (!window.confirm(`¿Firmar con tu PIN los documentos pendientes de ${ids.length} residente${ids.length === 1 ? "" : "s"}?`)) {
      return;
    }
    setError(null);
    setAviso(null);
    startTransition(async () => {
      const r = await firmarPendientes(sedeId, ids, pin, matricula);
      if (r.error) {
        setError(r.error);
        return;
      }
      setPin("");
      setAviso(`Listo: se firmaron ${r.firmados} documento${r.firmados === 1 ? "" : "s"}.`);
      router.refresh();
    });
  }

  // Solo cuentan los que siguen pendientes (después de firmar, la lista se actualiza).
  const elegidos = pendientes.filter((p) => seleccion.has(p.residenteId)).length;
  const todos = elegidos === pendientes.length;

  return (
    <section className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold text-amber-900">
          Pendientes de firma médica ({pendientes.length})
        </h2>
        {esMedico && (
          <button
            type="button"
            onClick={() => setSeleccion(todos ? new Set() : new Set(pendientes.map((p) => p.residenteId)))}
            className="text-xs text-amber-900 underline underline-offset-2"
          >
            {todos ? "Desmarcar todos" : "Marcar todos"}
          </button>
        )}
      </div>

      <ul className="divide-y divide-amber-200 rounded-xl border border-amber-200 bg-white">
        {pendientes.map((p) => (
          <li key={p.residenteId} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            {esMedico && (
              <input
                type="checkbox"
                checked={seleccion.has(p.residenteId)}
                onChange={() => alternar(p.residenteId)}
                aria-label={`Firmar ${p.nombre}`}
                className="h-4 w-4 accent-[var(--color-brass)]"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                {p.nombre}
                {p.habitacion && <span className="ml-2 text-xs font-normal text-ink-soft">Hab. {p.habitacion}</span>}
              </p>
              <p className="text-xs text-ink-soft">
                {[
                  ...p.evaluaciones.map((e) => `Evaluación médica del ${fecha(e.fecha)}`),
                  ...p.indicaciones.map((i) =>
                    i.periodoDesde.slice(0, 7) === i.periodoHasta.slice(0, 7)
                      ? `Indicaciones de ${mesAnio(i.periodoDesde)}`
                      : `Indicaciones de ${mesAnio(i.periodoDesde)} a ${mesAnio(i.periodoHasta)}`,
                  ),
                ].join(" · ")}
              </p>
            </div>
            <Link
              href={`/sucursales/${sedeId}/accion-medica/evaluacion-medica?residente=${p.residenteId}`}
              className="rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              Revisar / editar
            </Link>
          </li>
        ))}
      </ul>

      {esMedico ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
            Matrícula
            <input
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="(opcional)"
              className="mt-1 block w-32 rounded-lg border border-edge bg-white px-2 py-1.5 text-sm font-normal text-ink focus:border-brass focus:outline-none"
            />
          </label>
          <label className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
            {pinConfigurado ? "PIN de seguridad" : "Configurá tu PIN (primera vez)"}
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              minLength={4}
              maxLength={6}
              className="mt-1 block w-28 rounded-lg border border-edge bg-white px-2 py-1.5 text-sm font-normal text-ink focus:border-brass focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={firmar}
            disabled={firmando || elegidos === 0}
            className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
          >
            {firmando ? "Firmando..." : `Firmar seleccionados (${elegidos})`}
          </button>
          {error && <p className="w-full text-sm text-red-700">{error}</p>}
          {aviso && <p className="w-full text-sm text-emerald-700">{aviso}</p>}
        </div>
      ) : (
        <p className="text-xs text-amber-900">La médica los firma desde acá con su PIN, o los revisa uno por uno.</p>
      )}
    </section>
  );
}
