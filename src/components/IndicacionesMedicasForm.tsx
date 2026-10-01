"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarIndicacionMedica } from "@/app/residentes/[id]/accion-medica/evaluacion-actions";
import { hoyArgentina } from "@/lib/fechas";
import type { IndicacionMedica, ItemIndicacionMedica } from "@/lib/types";

type Props = {
  residenteId: string;
  pinConfigurado: boolean;
  ultimaIndicacion: IndicacionMedica | null;
};

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";
const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const CAMPO_CHICO =
  "w-full rounded-md border border-edge bg-card px-2 py-1 text-xs text-ink focus:border-brass focus:outline-none";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function filaVacia(): ItemIndicacionMedica {
  return { medicacion: "", mg: "", cantidad: "", h8: false, h12: false, h20: false };
}

function mesIndice(fechaISO: string): { mes: number; anio: number } {
  const [anio, mes] = fechaISO.split("-").map(Number);
  return { mes: mes - 1, anio };
}

export function IndicacionesMedicasForm({ residenteId, pinConfigurado, ultimaIndicacion }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const hoy = useMemo(() => mesIndice(hoyArgentina()), []);
  const [mesDesdeIdx, setMesDesdeIdx] = useState(hoy.mes);
  const [mesHastaIdx, setMesHastaIdx] = useState(hoy.mes);
  const [anio, setAnio] = useState(hoy.anio);
  const [filas, setFilas] = useState<ItemIndicacionMedica[]>([filaVacia()]);

  function repetirUltimoPeriodo() {
    if (!ultimaIndicacion) return;
    setFilas(ultimaIndicacion.items.length > 0 ? ultimaIndicacion.items.map((f) => ({ ...f })) : [filaVacia()]);
    const { mes, anio: anioNuevo } = mesIndice(ultimaIndicacion.periodo_hasta);
    const siguiente = mes + 1 > 11 ? 0 : mes + 1;
    const anioSiguiente = mes + 1 > 11 ? anioNuevo + 1 : anioNuevo;
    setMesDesdeIdx(siguiente);
    setMesHastaIdx(siguiente);
    setAnio(anioSiguiente);
    setAbierto(true);
  }

  function actualizarFila(i: number, campo: keyof ItemIndicacionMedica, valor: string | boolean) {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f)));
  }

  function quitarFila(i: number) {
    setFilas((prev) => prev.filter((_, idx) => idx !== i));
  }

  function enviar() {
    if (!formRef.current) return;
    if (filas.length === 0 || filas.every((f) => !f.medicacion.trim())) {
      setError("Agregá al menos un medicamento.");
      return;
    }
    if (!formRef.current.reportValidity()) return;

    const fd = new FormData(formRef.current);
    const periodo_desde = `${anio}-${String(mesDesdeIdx + 1).padStart(2, "0")}-01`;
    const ultimoDiaHasta = new Date(anio, mesHastaIdx + 1, 0).getDate();
    const periodo_hasta = `${anio}-${String(mesHastaIdx + 1).padStart(2, "0")}-${String(ultimoDiaHasta).padStart(2, "0")}`;
    fd.set("periodo_desde", periodo_desde);
    fd.set("periodo_hasta", periodo_hasta);
    fd.set("items", JSON.stringify(filas.filter((f) => f.medicacion.trim())));
    setError(null);

    startTransition(async () => {
      const res = await guardarIndicacionMedica(residenteId, { error: null }, fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      setFilas([filaVacia()]);
      formRef.current?.reset();
      setAbierto(false);
      router.refresh();
    });
  }

  if (!abierto) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="rounded-lg border border-brass px-4 py-2 text-sm font-semibold text-brass hover:bg-brass/10"
        >
          + Nuevas indicaciones médicas
        </button>
        {ultimaIndicacion && (
          <button
            type="button"
            onClick={repetirUltimoPeriodo}
            className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-ink-soft hover:border-brass hover:text-ink"
          >
            ↻ Repetir último período, igual indicación
          </button>
        )}
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-4 rounded-2xl border border-edge bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-ink">Indicaciones médicas</h3>
        <button type="button" onClick={() => setAbierto(false)} className="text-sm text-ink-soft hover:text-ink">
          ✕
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={ETIQUETA_MIN}>Período — desde</label>
          <select
            value={mesDesdeIdx}
            onChange={(e) => setMesDesdeIdx(Number(e.target.value))}
            className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
          >
            {MESES.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Hasta</label>
          <select
            value={mesHastaIdx}
            onChange={(e) => setMesHastaIdx(Number(e.target.value))}
            className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
          >
            {MESES.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
        </div>
        <div style={{ maxWidth: 90 }}>
          <label className={ETIQUETA_MIN}>Año</label>
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value) || anio)}
            className="w-24 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>
      </div>
      <p className="text-xs text-ink-soft">
        El cuadro se mantiene igual todos los meses hasta que lo modifiques — solo cambiás el período y volvés a firmar.
      </p>

      <div className="overflow-x-auto rounded-xl border border-edge">
        <table className="w-full text-left text-sm" style={{ minWidth: 520 }}>
          <thead className="border-b border-edge bg-panel-deep text-[0.6rem] font-bold uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-3 py-2">Medicación</th>
              <th className="w-16 px-2 py-2">MG</th>
              <th className="w-20 px-2 py-2">Cant. comp.</th>
              <th className="w-14 px-2 py-2 text-center">8HS</th>
              <th className="w-14 px-2 py-2 text-center">12HS</th>
              <th className="w-14 px-2 py-2 text-center">20HS</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className="border-b border-edge last:border-0">
                <td className="px-2 py-1.5">
                  <input value={f.medicacion} onChange={(e) => actualizarFila(i, "medicacion", e.target.value)} className={CAMPO_CHICO} />
                </td>
                <td className="px-2 py-1.5">
                  <input value={f.mg} onChange={(e) => actualizarFila(i, "mg", e.target.value)} className={CAMPO_CHICO} />
                </td>
                <td className="px-2 py-1.5">
                  <input value={f.cantidad} onChange={(e) => actualizarFila(i, "cantidad", e.target.value)} className={CAMPO_CHICO} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input type="checkbox" checked={f.h8} onChange={(e) => actualizarFila(i, "h8", e.target.checked)} className="h-4 w-4 accent-[var(--color-brass)]" />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input type="checkbox" checked={f.h12} onChange={(e) => actualizarFila(i, "h12", e.target.checked)} className="h-4 w-4 accent-[var(--color-brass)]" />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input type="checkbox" checked={f.h20} onChange={(e) => actualizarFila(i, "h20", e.target.checked)} className="h-4 w-4 accent-[var(--color-brass)]" />
                </td>
                <td className="px-1 py-1.5 text-right">
                  <button type="button" onClick={() => quitarFila(i)} className="text-red-700 hover:text-red-500" title="Quitar">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => setFilas((prev) => [...prev, filaVacia()])}
        className="rounded-lg border border-dashed border-edge bg-panel-deep px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-brass hover:text-ink"
      >
        + Agregar medicamento
      </button>

      <div>
        <label className={ETIQUETA_MIN}>Observaciones</label>
        <textarea name="observaciones" rows={2} className={CAMPO} placeholder="Opcional" />
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-edge pt-3">
        <div>
          <label className={ETIQUETA_MIN}>Matrícula</label>
          <input
            name="matricula"
            className="w-32 rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>
        <div>
          <label className={ETIQUETA_MIN} title={pinConfigurado ? "Ingresá tu PIN para firmar" : "Primera vez: elegí un PIN de 4 a 6 dígitos"}>
            {pinConfigurado ? "PIN de seguridad" : "Configurá tu PIN (primera vez)"}
          </label>
          <input
            type="password"
            inputMode="numeric"
            name="pin"
            required
            minLength={4}
            maxLength={6}
            className="w-28 rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={enviar}
          disabled={pending}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Firmar y guardar"}
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
