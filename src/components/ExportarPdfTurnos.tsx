"use client";

import { useState } from "react";
import { descargarPdf } from "@/lib/pdf";
import type { TurnoProgramado } from "@/lib/types";

type Props = {
  turnos: TurnoProgramado[];
  empleadosPorId: Map<string, string>;
  sucursalNombre: string;
};

type Periodo = "mes" | "anio";

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DIAS_NOMBRE: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

function formatearFecha(d: Date): string {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function diaSemanaIso(d: Date): number {
  const dia = d.getDay();
  return dia === 0 ? 7 : dia;
}

export function ExportarPdfTurnos({ turnos, empleadosPorId, sucursalNombre }: Props) {
  const ahora = new Date();
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [anio, setAnio] = useState(ahora.getFullYear());

  function exportar() {
    const desde = periodo === "mes" ? new Date(anio, mes - 1, 1) : new Date(anio, 0, 1);
    const hasta = periodo === "mes" ? new Date(anio, mes, 0) : new Date(anio, 11, 31);

    const porEmpleado = new Map<string, { fecha: string; dia: string; horario: string }[]>();

    for (const d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
      const fechaStr = formatearFecha(d);
      const diaSemana = diaSemanaIso(d);

      for (const t of turnos) {
        if (t.dia_semana !== diaSemana) continue;
        if (fechaStr < t.vigente_desde || fechaStr > t.vigente_hasta) continue;

        const filas = porEmpleado.get(t.empleado_id) ?? [];
        filas.push({
          fecha: d.toLocaleDateString("es-AR"),
          dia: DIAS_NOMBRE[diaSemana],
          horario: `${t.hora_inicio.slice(0, 5)}–${t.hora_fin.slice(0, 5)}`,
        });
        porEmpleado.set(t.empleado_id, filas);
      }
    }

    const empleadoIds = Array.from(porEmpleado.keys()).sort((a, b) =>
      (empleadosPorId.get(a) ?? "").localeCompare(empleadosPorId.get(b) ?? ""),
    );

    const secciones = empleadoIds.map((id) => ({
      titulo: empleadosPorId.get(id) ?? "—",
      columnas: ["Fecha", "Día", "Horario"],
      filas: (porEmpleado.get(id) ?? []).map((f) => [f.fecha, f.dia, f.horario]),
    }));

    const etiquetaPeriodo = periodo === "mes" ? `${MESES[mes]} ${anio}` : `Año ${anio}`;

    descargarPdf(
      `turnos-${sucursalNombre.toLowerCase().replace(/\s+/g, "-")}-${periodo === "mes" ? `${anio}-${mes}` : anio}.pdf`,
      {
        titulo: "Turnos semanales",
        subtitulo: `${sucursalNombre} — ${etiquetaPeriodo}`,
        fecha: `Generado el ${new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}`,
      },
      secciones.length > 0 ? secciones : [{ columnas: ["Fecha", "Día", "Horario"], filas: [] }],
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-edge bg-card p-4">
      <div className="flex rounded-lg border border-edge bg-panel-deep p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setPeriodo("mes")}
          className={`rounded-md px-3 py-1.5 ${
            periodo === "mes" ? "bg-brass text-btn-ink" : "text-ink-soft hover:text-ink"
          }`}
        >
          Mes
        </button>
        <button
          type="button"
          onClick={() => setPeriodo("anio")}
          className={`rounded-md px-3 py-1.5 ${
            periodo === "anio" ? "bg-brass text-btn-ink" : "text-ink-soft hover:text-ink"
          }`}
        >
          Año completo
        </button>
      </div>

      {periodo === "mes" && (
        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
        >
          {MESES.slice(1).map((m, i) => (
            <option key={i + 1} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      )}

      <input
        type="number"
        value={anio}
        onChange={(e) => setAnio(Number(e.target.value))}
        className="w-24 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
      />

      <button
        type="button"
        onClick={exportar}
        className="rounded-full border border-brass/40 px-4 py-1.5 text-xs font-semibold text-brass hover:bg-brass-soft"
      >
        Descargar PDF
      </button>
    </div>
  );
}
