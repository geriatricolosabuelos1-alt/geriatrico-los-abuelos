"use client";

import { useActionState, useState } from "react";
import {
  registrarDosisSos,
  registrarEstadoToma,
  type RegistrarDosisSosEstado,
  type RegistrarEstadoTomaEstado,
} from "@/app/residentes/[id]/legajo/medicacion-actions";
import type { AvisoPolifarmacia } from "@/app/residentes/[id]/legajo/medicacion-actions";
import type { EstadoToma, MedicamentoResidente, TomaMar } from "@/lib/types";

type Props = {
  residenteId: string;
  residenteNombre: string;
  sucursalId: string;
  medicamentosContinuos: MedicamentoResidente[];
  medicamentosSos: MedicamentoResidente[];
  tomas: TomaMar[];
  dosisSosHoy: Record<string, number>;
  polifarmacia: AvisoPolifarmacia;
};

const ESTADO_TOMA_INICIAL: RegistrarEstadoTomaEstado = { error: null };
const ESTADO_SOS_INICIAL: RegistrarDosisSosEstado = { error: null };

function esCambioReciente(fecha: string | null): boolean {
  if (!fecha) return false;
  return Date.now() - new Date(fecha).getTime() < 24 * 60 * 60 * 1000;
}

const ESTILO_CIRCULO: Record<EstadoToma, string> = {
  pendiente: "bg-amber-400 border-amber-500",
  administrado: "bg-emerald-500 border-emerald-600",
  rechazado: "bg-red-500 border-red-600",
  suspendido: "bg-red-500 border-red-600",
  omitido: "bg-ink-soft border-ink-soft",
};

const ETIQUETA_ESTADO: Record<EstadoToma, string> = {
  pendiente: "Pendiente",
  administrado: "Administrado",
  rechazado: "Rechazado",
  suspendido: "Suspendido",
  omitido: "Omitido",
};

function CirculoToma({
  toma,
  residenteId,
  sucursalId,
}: {
  toma: TomaMar;
  residenteId: string;
  sucursalId: string;
}) {
  const accionConSucursal = registrarEstadoToma.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConSucursal, ESTADO_TOMA_INICIAL);
  const [pidiendoMotivo, setPidiendoMotivo] = useState<"rechazado" | "suspendido" | null>(null);
  const [motivo, setMotivo] = useState("");

  function siguienteEstado(actual: EstadoToma): "administrado" | "rechazado" | "suspendido" {
    if (actual === "pendiente") return "administrado";
    if (actual === "administrado") return "rechazado";
    if (actual === "rechazado") return "suspendido";
    return "administrado";
  }

  async function manejarClick() {
    const nuevo = siguienteEstado(toma.estado);
    if (nuevo === "rechazado" || nuevo === "suspendido") {
      setPidiendoMotivo(nuevo);
      return;
    }
    const fd = new FormData();
    fd.set("medicamento_id", toma.medicamentoId);
    fd.set("residente_id", residenteId);
    fd.set("horario", toma.horario);
    fd.set("estado", nuevo);
    if (toma.dosisId) fd.set("dosis_id", toma.dosisId);
    await formAction(fd);
  }

  async function confirmarMotivo() {
    if (!pidiendoMotivo || !motivo.trim()) return;
    const fd = new FormData();
    fd.set("medicamento_id", toma.medicamentoId);
    fd.set("residente_id", residenteId);
    fd.set("horario", toma.horario);
    fd.set("estado", pidiendoMotivo);
    fd.set("motivo", motivo.trim());
    if (toma.dosisId) fd.set("dosis_id", toma.dosisId);
    await formAction(fd);
    setPidiendoMotivo(null);
    setMotivo("");
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={manejarClick}
        disabled={enviando}
        title={`${ETIQUETA_ESTADO[toma.estado]}${toma.motivo ? ` · ${toma.motivo}` : ""}`}
        className={`h-6 w-6 rounded-full border-2 disabled:opacity-50 ${ESTILO_CIRCULO[toma.estado]}`}
        aria-label={`${toma.horario}: ${ETIQUETA_ESTADO[toma.estado]}`}
      />
      {pidiendoMotivo && (
        <div className="absolute z-10 mt-8 w-52 rounded-lg border border-edge bg-card p-2 shadow-lg">
          <p className="mb-1 text-[0.65rem] font-medium text-ink-soft">
            Motivo ({ETIQUETA_ESTADO[pidiendoMotivo]})
          </p>
          <input
            autoFocus
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: paciente dormido"
            className="mb-2 w-full rounded-md border border-edge bg-panel-deep px-2 py-1 text-xs text-ink focus:border-brass focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setPidiendoMotivo(null);
                setMotivo("");
              }}
              className="text-[0.65rem] text-ink-soft hover:text-ink"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarMotivo}
              disabled={!motivo.trim()}
              className="text-[0.65rem] font-semibold text-brass hover:text-ink disabled:opacity-40"
            >
              Guardar
            </button>
          </div>
        </div>
      )}
      {estado.error && <p className="text-[0.6rem] text-red-700">{estado.error}</p>}
    </div>
  );
}

function BotonSos({
  residenteId,
  sucursalId,
  medicamento,
  dadasHoy,
}: {
  residenteId: string;
  sucursalId: string;
  medicamento: MedicamentoResidente;
  dadasHoy: number;
}) {
  const accionConSucursal = registrarDosisSos.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConSucursal, ESTADO_SOS_INICIAL);
  const tope = medicamento.dosis_maxima_diaria;
  const alTope = tope != null && dadasHoy >= tope;

  return (
    <form
      action={(fd) => {
        fd.set("medicamento_id", medicamento.id);
        fd.set("residente_id", residenteId);
        formAction(fd);
      }}
      className="flex items-center gap-2"
    >
      <button
        type="submit"
        disabled={enviando || alTope}
        className="rounded-lg bg-brass px-3 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-40"
      >
        {alTope ? "Tope alcanzado" : "Dar dosis SOS"}
      </button>
      <span className="text-xs text-ink-soft">
        {dadasHoy}
        {tope != null ? ` / ${tope}` : ""} hoy
      </span>
      {estado.error && <span className="text-xs text-red-700">{estado.error}</span>}
    </form>
  );
}

export function MarResidente({
  residenteId,
  residenteNombre,
  sucursalId,
  medicamentosContinuos,
  medicamentosSos,
  tomas,
  dosisSosHoy,
  polifarmacia,
}: Props) {
  const horas = [...new Set(tomas.map((t) => t.horario))].sort();
  const tomasPorClave = new Map(tomas.map((t) => [`${t.medicamentoId}-${t.horario}`, t]));

  if (medicamentosContinuos.length === 0 && medicamentosSos.length === 0) {
    return (
      <section className="rounded-2xl border border-edge bg-card p-5">
        <p className="mb-1 font-display text-base font-semibold text-ink">{residenteNombre}</p>
        <p className="text-xs text-ink-soft">Sin medicación activa.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-edge bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-base font-semibold text-ink">{residenteNombre}</p>
        <div className="flex flex-wrap items-center gap-2">
          {polifarmacia.esPolifarmacia && (
            <span
              className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-800"
              title="5 o más fármacos activos"
            >
              Polifarmacia: {polifarmacia.totalActivos}
            </span>
          )}
          {polifarmacia.duplicados.length > 0 && (
            <span
              className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[0.65rem] font-semibold text-red-800"
              title={polifarmacia.duplicados.join(", ")}
            >
              Posible duplicidad
            </span>
          )}
        </div>
      </div>

      {medicamentosContinuos.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                <th className="px-3 py-2">Medicamento</th>
                <th className="px-3 py-2">Vía</th>
                {horas.map((h) => (
                  <th key={h} className="px-3 py-2 text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {medicamentosContinuos.map((m) => (
                <tr key={m.id} className="border-t border-edge">
                  <td className="px-3 py-2 text-sm text-ink">
                    {m.nombre}
                    {m.dosis && <span className="text-ink-soft"> · {m.dosis}</span>}
                    {esCambioReciente(m.cambio_reciente_at) && (
                      <span
                        className="ml-2 rounded-full border border-blue-300 bg-blue-100 px-1.5 py-0.5 text-[0.6rem] font-semibold text-blue-800"
                        title="Modificado por el médico en las últimas 24hs"
                      >
                        Cambio reciente
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-soft">{m.via_administracion ?? "—"}</td>
                  {horas.map((h) => {
                    const toma = tomasPorClave.get(`${m.id}-${h}`);
                    return (
                      <td key={h} className="relative px-3 py-2 text-center">
                        {toma ? (
                          <CirculoToma toma={toma} residenteId={residenteId} sucursalId={sucursalId} />
                        ) : (
                          <span className="text-ink-soft/40">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {medicamentosSos.length > 0 && (
        <div className="space-y-2 border-t border-edge pt-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
            SOS (según necesidad)
          </p>
          {medicamentosSos.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-ink">
                {m.nombre}
                {m.dosis && <span className="text-ink-soft"> · {m.dosis}</span>}
                {m.via_administracion && <span className="text-ink-soft"> · {m.via_administracion}</span>}
              </span>
              <BotonSos
                residenteId={residenteId}
                sucursalId={sucursalId}
                medicamento={m}
                dadasHoy={dosisSosHoy[m.id] ?? 0}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
