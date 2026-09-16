"use client";

import { useActionState, useState } from "react";
import {
  actualizarEstadoReceta,
  crearReceta,
  eliminarReceta,
  type RecetaEstado,
} from "@/app/sucursales/[id]/medicacion/recetario/actions";
import type { EstadoReceta, MedicamentoResidente, RecetaMedicamento } from "@/lib/types";

type ResidenteConMeds = {
  id: string;
  nombre: string;
  apellido: string;
  medicamentos_residente: MedicamentoResidente[];
  ficha_administrativa: { obra_social: string | null } | null;
};

type RecetaConNombres = RecetaMedicamento & {
  residente_nombre: string;
  medicamento_nombre: string | null;
};

type Props = {
  sucursalId: string;
  residentes: ResidenteConMeds[];
  recetas: RecetaConNombres[];
};

const ESTADO_INICIAL: RecetaEstado = { error: null };

const ETIQUETA_ESTADO: Record<EstadoReceta, string> = {
  pendiente_pedir: "Pendiente de pedir",
  pedida: "Pedida",
  recibida: "Recibida",
};

const ESTILO_ESTADO: Record<EstadoReceta, string> = {
  pendiente_pedir: "bg-amber-100 text-amber-800 border-amber-300",
  pedida: "bg-blue-100 text-blue-800 border-blue-300",
  recibida: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

const SIGUIENTE_ESTADO: Record<EstadoReceta, EstadoReceta | null> = {
  pendiente_pedir: "pedida",
  pedida: "recibida",
  recibida: null,
};

function semaforoVencimiento(fechaVencimiento: string | null): { texto: string; estilo: string } | null {
  if (!fechaVencimiento) return null;
  const dias = Math.ceil(
    (new Date(fechaVencimiento + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (dias < 0) return { texto: "Vencida", estilo: "bg-red-100 text-red-800 border-red-300" };
  if (dias <= 5) return { texto: `Vence en ${dias}d`, estilo: "bg-red-100 text-red-800 border-red-300" };
  if (dias <= 15) return { texto: `Vence en ${dias}d`, estilo: "bg-amber-100 text-amber-800 border-amber-300" };
  return { texto: `Vence en ${dias}d`, estilo: "bg-emerald-100 text-emerald-800 border-emerald-300" };
}

function FormularioNuevaReceta({
  sucursalId,
  residentes,
}: {
  sucursalId: string;
  residentes: ResidenteConMeds[];
}) {
  const accionConId = crearReceta.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConId, ESTADO_INICIAL);
  const [residenteId, setResidenteId] = useState("");

  const medicamentosDelResidente =
    residentes.find((r) => r.id === residenteId)?.medicamentos_residente.filter((m) => m.activo) ?? [];
  const obraSocialSugerida = residentes.find((r) => r.id === residenteId)?.ficha_administrativa?.obra_social;

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-edge bg-card p-4"
    >
      <div>
        <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
          Residente
        </label>
        <select
          name="residente_id"
          required
          value={residenteId}
          onChange={(e) => setResidenteId(e.target.value)}
          className="w-44 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
        >
          <option value="">Seleccioná...</option>
          {residentes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.apellido}, {r.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
          Medicamento
        </label>
        <select
          name="medicamento_id"
          className="w-40 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
        >
          <option value="">General / sin especificar</option>
          {medicamentosDelResidente.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
          Obra social
        </label>
        <input
          name="obra_social"
          defaultValue={obraSocialSugerida ?? ""}
          placeholder="PAMI, OSDE..."
          className="w-36 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
          Vencimiento
        </label>
        <input
          type="date"
          name="fecha_vencimiento"
          className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div className="min-w-40 flex-1">
        <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
          Notas
        </label>
        <input
          name="notas"
          placeholder="Ej: pedir antes del 20"
          className="w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        {enviando ? "Guardando..." : "+ Agregar receta"}
      </button>
      {estado.error && <p className="w-full text-xs text-red-700">{estado.error}</p>}
    </form>
  );
}

function FilaReceta({ sucursalId, receta }: { sucursalId: string; receta: RecetaConNombres }) {
  const [enviando, setEnviando] = useState(false);
  const siguiente = SIGUIENTE_ESTADO[receta.estado];

  async function avanzar() {
    if (!siguiente) return;
    setEnviando(true);
    await actualizarEstadoReceta(sucursalId, receta.id, siguiente);
    setEnviando(false);
  }

  async function borrar() {
    if (!window.confirm("¿Eliminar esta receta?")) return;
    await eliminarReceta(sucursalId, receta.id);
  }

  return (
    <tr className="border-t border-edge">
      <td className="px-3 py-2 text-sm text-ink">{receta.residente_nombre}</td>
      <td className="px-3 py-2 text-sm text-ink-soft">{receta.medicamento_nombre ?? "General"}</td>
      <td className="px-3 py-2 text-sm text-ink-soft">{receta.obra_social ?? "—"}</td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${ESTILO_ESTADO[receta.estado]}`}
          >
            {ETIQUETA_ESTADO[receta.estado]}
          </span>
          {receta.estado !== "recibida" &&
            (() => {
              const semaforo = semaforoVencimiento(receta.fecha_vencimiento);
              return semaforo ? (
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${semaforo.estilo}`}
                >
                  {semaforo.texto}
                </span>
              ) : null;
            })()}
        </div>
      </td>
      <td className="px-3 py-2 text-xs text-ink-soft">{receta.notas ?? "—"}</td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-2">
          {siguiente && (
            <button
              type="button"
              onClick={avanzar}
              disabled={enviando}
              className="text-xs font-semibold text-brass hover:text-ink disabled:opacity-50"
            >
              Marcar {ETIQUETA_ESTADO[siguiente].toLowerCase()}
            </button>
          )}
          <button type="button" onClick={borrar} className="text-xs text-red-700 hover:text-red-500">
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
}

export function RecetarioClient({ sucursalId, residentes, recetas }: Props) {
  return (
    <div className="space-y-4">
      <FormularioNuevaReceta sucursalId={sucursalId} residentes={residentes} />

      <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              <th className="px-3 py-2">Residente</th>
              <th className="px-3 py-2">Medicamento</th>
              <th className="px-3 py-2">Obra social</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Notas</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {recetas.map((r) => (
              <FilaReceta key={r.id} sucursalId={sucursalId} receta={r} />
            ))}
            {recetas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-ink-soft">
                  Sin recetas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
