"use client";

import { useState } from "react";
import { generarLibroFoliado, type EntradaLibroFoliado } from "@/app/sucursales/[id]/legales/sanitario-actions";
import { descargarPdf } from "@/lib/pdf";

type ResidenteBasico = { id: string; nombre: string; apellido: string };

type Props = {
  sucursalNombre: string;
  residentes: ResidenteBasico[];
};

export function LibroFoliadoClient({ sucursalNombre, residentes }: Props) {
  const [residenteId, setResidenteId] = useState("");
  const [entradas, setEntradas] = useState<EntradaLibroFoliado[] | null>(null);
  const [cargando, setCargando] = useState(false);

  const residente = residentes.find((r) => r.id === residenteId);

  async function generar() {
    if (!residenteId) return;
    setCargando(true);
    const data = await generarLibroFoliado(residenteId);
    setEntradas(data);
    setCargando(false);
  }

  function exportarPdf() {
    if (!entradas || !residente) return;
    descargarPdf(
      `libro-foliado-${residente.apellido}-${residente.nombre}.pdf`.toLowerCase().replace(/\s+/g, "-"),
      {
        titulo: "Historia clínica foliada",
        subtitulo: `${sucursalNombre} · ${residente.apellido}, ${residente.nombre}`,
        fecha: `Generado el ${new Date().toLocaleDateString("es-AR")} — ${entradas.length} folios`,
      },
      [
        {
          columnas: ["Folio", "Fecha", "Tipo", "Autor", "Contenido"],
          filas: entradas.map((e) => [
            e.folio,
            new Date(e.fecha).toLocaleString("es-AR"),
            e.tipo,
            e.autor,
            e.contenido,
          ]),
        },
      ],
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-edge bg-card p-4">
        <div>
          <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
            Residente
          </label>
          <select
            value={residenteId}
            onChange={(e) => {
              setResidenteId(e.target.value);
              setEntradas(null);
            }}
            className="w-56 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
          >
            <option value="">Seleccioná...</option>
            {residentes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.apellido}, {r.nombre}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={generar}
          disabled={!residenteId || cargando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {cargando ? "Generando..." : "Generar historia foliada"}
        </button>
        {entradas && (
          <button
            type="button"
            onClick={exportarPdf}
            className="rounded-full border border-brass/40 px-4 py-1.5 text-xs font-semibold text-brass hover:bg-brass-soft"
          >
            Descargar PDF
          </button>
        )}
      </div>

      {entradas && (
        <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                <th className="px-3 py-2">Folio</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Autor</th>
                <th className="px-3 py-2">Contenido</th>
              </tr>
            </thead>
            <tbody>
              {entradas.map((e) => (
                <tr key={e.folio} className="border-t border-edge align-top">
                  <td className="px-3 py-2 font-semibold text-ink">{e.folio}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-ink-soft">
                    {new Date(e.fecha).toLocaleString("es-AR")}
                  </td>
                  <td className="px-3 py-2 text-ink-soft">{e.tipo}</td>
                  <td className="px-3 py-2 text-ink-soft">{e.autor}</td>
                  <td className="px-3 py-2 text-ink">{e.contenido}</td>
                </tr>
              ))}
              {entradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-ink-soft">
                    Sin registros clínicos para este residente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
