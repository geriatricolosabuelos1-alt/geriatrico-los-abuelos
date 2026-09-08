"use client";

import { useState } from "react";
import {
  crearPagoManual,
  type RegistrarPagoEstado,
} from "@/app/residentes/[id]/cuenta-corriente/actions";

type Props = {
  residenteId: string;
  sucursalId: string;
};

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const CAMPO =
  "rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none";

export function AgregarPeriodoManual({ residenteId, sucursalId }: Props) {
  const [mostrar, setMostrar] = useState(false);
  const [estado, setEstado] = useState<RegistrarPagoEstado>({ error: null });
  const [enviando, setEnviando] = useState(false);
  const ahora = new Date();

  async function manejarSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    const formData = new FormData(e.currentTarget);
    const resultado = await crearPagoManual(
      residenteId,
      sucursalId,
      { error: null },
      formData,
    );
    setEnviando(false);
    if (resultado.error) {
      setEstado(resultado);
    } else {
      setEstado({ error: null });
      setMostrar(false);
      (e.target as HTMLFormElement).reset();
    }
  }

  if (!mostrar) {
    return (
      <button
        type="button"
        onClick={() => setMostrar(true)}
        className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink"
      >
        + Agregar período manual
      </button>
    );
  }

  return (
    <form
      onSubmit={manejarSubmit}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-edge bg-card p-4"
    >
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft">
          Mes
        </label>
        <select name="mes" defaultValue={ahora.getMonth() + 1} className={CAMPO}>
          {MESES.slice(1).map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft">
          Año
        </label>
        <input
          type="number"
          name="anio"
          defaultValue={ahora.getFullYear()}
          className={`${CAMPO} w-24`}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft">
          Parte
        </label>
        <select name="tipo_pago" defaultValue="paciente" className={CAMPO}>
          <option value="paciente">Paciente</option>
          <option value="obra_social">Obra social</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft">
          Monto
        </label>
        <input type="number" step="0.01" name="monto" required className={CAMPO} />
      </div>

      {estado.error && <p className="text-sm text-red-700">{estado.error}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        {enviando ? "Guardando..." : "Agregar"}
      </button>
      <button
        type="button"
        onClick={() => setMostrar(false)}
        className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink"
      >
        Cancelar
      </button>
    </form>
  );
}
