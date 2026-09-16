"use client";

import { useEffect, useState } from "react";
import { listarFichadasPorEmpleado } from "@/app/empleados/fichadas-actions";
import { descargarPdf } from "@/lib/pdf";
import type { Fichada } from "@/lib/types";

type Periodo = "dia" | "semana" | "mes";

type Props = {
  empleadoId: string;
  empleadoNombre: string;
};

type FilaResumen = { fecha: string; horaEntrada: string | null; horaSalida: string | null };

function formatearFecha(d: Date): string {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function calcularRango(periodo: Periodo, fechaRef: string) {
  const d = new Date(fechaRef + "T00:00:00");

  if (periodo === "dia") {
    return { desde: fechaRef, hasta: fechaRef, etiqueta: d.toLocaleDateString("es-AR") };
  }

  if (periodo === "semana") {
    const diaSemana = d.getDay();
    const offsetLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
    const lunes = new Date(d);
    lunes.setDate(d.getDate() + offsetLunes);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return {
      desde: formatearFecha(lunes),
      hasta: formatearFecha(domingo),
      etiqueta: `${lunes.toLocaleDateString("es-AR")} – ${domingo.toLocaleDateString("es-AR")}`,
    };
  }

  const primero = new Date(d.getFullYear(), d.getMonth(), 1);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    desde: formatearFecha(primero),
    hasta: formatearFecha(ultimo),
    etiqueta: primero.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
  };
}

function agruparPorDia(fichadas: Fichada[]): FilaResumen[] {
  const mapa = new Map<string, FilaResumen>();

  for (const f of fichadas) {
    const fila = mapa.get(f.fecha) ?? { fecha: f.fecha, horaEntrada: null, horaSalida: null };
    if (f.tipo === "ingreso") {
      if (!fila.horaEntrada || f.hora < fila.horaEntrada) fila.horaEntrada = f.hora;
    } else {
      if (!fila.horaSalida || f.hora > fila.horaSalida) fila.horaSalida = f.hora;
    }
    mapa.set(f.fecha, fila);
  }

  return Array.from(mapa.values()).sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
}

export function MarcacionEmpleado({ empleadoId, empleadoNombre }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [fechaRef, setFechaRef] = useState(() => formatearFecha(new Date()));
  const [filas, setFilas] = useState<FilaResumen[]>([]);
  const [claveCargada, setClaveCargada] = useState<string | null>(null);

  const rango = calcularRango(periodo, fechaRef);
  const claveActual = `${empleadoId}_${rango.desde}_${rango.hasta}`;
  const cargando = abierto && claveCargada !== claveActual;

  useEffect(() => {
    if (!abierto) return;
    let cancelado = false;
    listarFichadasPorEmpleado(empleadoId, rango.desde, rango.hasta).then((data) => {
      if (cancelado) return;
      setFilas(agruparPorDia(data));
      setClaveCargada(claveActual);
    });
    return () => {
      cancelado = true;
    };
  }, [abierto, empleadoId, rango.desde, rango.hasta, claveActual]);

  function exportarPdf() {
    descargarPdf(
      `marcacion-${empleadoNombre.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      {
        titulo: `Marcación — ${empleadoNombre}`,
        subtitulo: rango.etiqueta,
        fecha: `Generado el ${new Date().toLocaleDateString("es-AR")}`,
      },
      [
        {
          columnas: ["Fecha", "Hora entrada", "Hora salida"],
          filas: filas.map((f) => [
            new Date(f.fecha + "T00:00:00").toLocaleDateString("es-AR"),
            f.horaEntrada ? f.horaEntrada.slice(0, 5) : "—",
            f.horaSalida ? f.horaSalida.slice(0, 5) : "—",
          ]),
        },
      ],
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
      >
        Ver
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-edge bg-card p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink">
            Marcación — {empleadoNombre}
          </h2>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="text-sm text-ink-soft hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="flex rounded-lg border border-edge bg-panel-deep p-1 text-xs font-medium">
            {(["dia", "semana", "mes"] as Periodo[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodo(p)}
                className={`rounded-md px-3 py-1.5 ${
                  periodo === p ? "bg-brass text-btn-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                {p === "dia" ? "Día" : p === "semana" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
              Fecha de referencia
            </label>
            <input
              type="date"
              value={fechaRef}
              onChange={(e) => setFechaRef(e.target.value)}
              className="rounded-lg border border-edge bg-panel-deep px-3 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
            />
          </div>
        </div>

        <p className="mb-2 text-xs capitalize text-ink-soft">{rango.etiqueta}</p>

        <div className="max-h-80 overflow-y-auto rounded-lg border border-edge">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Entrada</th>
                <th className="px-3 py-2">Salida</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-ink-soft">
                    Cargando...
                  </td>
                </tr>
              )}
              {!cargando &&
                filas.map((f) => (
                  <tr key={f.fecha} className="border-b border-edge last:border-0">
                    <td className="px-3 py-2 text-ink whitespace-nowrap">
                      {new Date(f.fecha + "T00:00:00").toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-3 py-2 text-ink-soft whitespace-nowrap">
                      {f.horaEntrada ? f.horaEntrada.slice(0, 5) : "—"}
                    </td>
                    <td className="px-3 py-2 text-ink-soft whitespace-nowrap">
                      {f.horaSalida ? f.horaSalida.slice(0, 5) : "—"}
                    </td>
                  </tr>
                ))}
              {!cargando && filas.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-ink-soft">
                    Sin marcaciones en este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={exportarPdf}
            disabled={filas.length === 0}
            className="rounded-full border border-brass/40 px-4 py-1.5 text-xs font-semibold text-brass hover:bg-brass-soft disabled:opacity-40"
          >
            Descargar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
