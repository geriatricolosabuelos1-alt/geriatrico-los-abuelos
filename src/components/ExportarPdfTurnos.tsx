"use client";

import { useState } from "react";
import { descargarPdf } from "@/lib/pdf";
import { sumarDia, turnosEfectivos } from "@/lib/turnos";
import type { CambioTurno, TurnoProgramado } from "@/lib/types";

type Props = {
  turnos: TurnoProgramado[];
  cambios: CambioTurno[];
  empleadosPorId: Map<string, string>;
  sucursalNombre: string;
  empleadoInicial: string;
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

export function ExportarPdfTurnos({ turnos, cambios, empleadosPorId, sucursalNombre, empleadoInicial }: Props) {
  const ahora = new Date();
  const [empleado, setEmpleado] = useState(empleadoInicial);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [anio, setAnio] = useState(ahora.getFullYear());

  function exportar() {
    const desde = periodo === "mes" ? new Date(anio, mes - 1, 1) : new Date(anio, 0, 1);
    const hasta = periodo === "mes" ? new Date(anio, mes, 0) : new Date(anio, 11, 31);

    const inicio = formatearFecha(desde);
    const fin = formatearFecha(hasta);

    // Turnos de cada día con los cambios de turno y guardias ya aplicados.
    const delDia = new Map<string, ReturnType<typeof turnosEfectivos>>();
    for (const t of turnosEfectivos(turnos, cambios, inicio, fin)) {
      const clave = `${t.empleadoId}|${t.fecha}`;
      delDia.set(clave, [...(delDia.get(clave) ?? []), t]);
    }

    // Empleadas con turno en el período: salen todos los días, y los que no trabaja como "Franco".
    const empleadoIds = Array.from(
      new Set([...turnos.map((t) => t.empleado_id), ...[...delDia.keys()].map((k) => k.split("|")[0])]),
    )
      .filter((id) => !empleado || id === empleado)
      .filter((id) => empleadosPorId.has(id))
      .sort((a, b) => (empleadosPorId.get(a) ?? "").localeCompare(empleadosPorId.get(b) ?? ""));

    const dias: string[] = [];
    for (let f = inicio; f <= fin; f = sumarDia(f)) dias.push(f);

    const secciones = empleadoIds.map((id) => {
      const filas: string[][] = [];
      for (const fecha of dias) {
        const [a, m, d] = fecha.split("-");
        const dia = DIAS_NOMBRE[diaSemanaIso(new Date(Number(a), Number(m) - 1, Number(d)))];
        const turnosDia = delDia.get(`${id}|${fecha}`) ?? [];
        const cedido = cambios.find((c) => c.fecha === fecha && c.tipo === "cambio" && c.empleado_original_id === id);
        if (turnosDia.length === 0) {
          filas.push([
            `${d}/${m}/${a}`,
            dia,
            "FRANCO",
            cedido ? `Cambio: la cubre ${empleadosPorId.get(cedido.empleado_reemplazo_id) ?? "otra empleada"}` : "",
          ]);
          continue;
        }
        for (const t of turnosDia) {
          filas.push([
            `${d}/${m}/${a}`,
            dia,
            `${t.horaInicio.slice(0, 5)}–${t.horaFin.slice(0, 5)}`,
            t.origen === "cambio"
              ? `Cambio: cubre a ${empleadosPorId.get(t.reemplazaA ?? "") ?? "otra empleada"}`
              : t.origen === "guardia"
                ? `Guardia${t.reemplazaA ? ` (por ${empleadosPorId.get(t.reemplazaA) ?? "otra empleada"})` : ""}`
                : "",
          ]);
        }
      }
      return { titulo: empleadosPorId.get(id) ?? "—", columnas: ["Fecha", "Día", "Horario", "Observación"], filas };
    });

    const etiquetaPeriodo = periodo === "mes" ? `${MESES[mes]} ${anio}` : `Año ${anio}`;

    const quien = empleado ? (empleadosPorId.get(empleado) ?? "empleado") : sucursalNombre;
    descargarPdf(
      `turnos-${quien.toLowerCase().replace(/[,\s]+/g, "-")}-${periodo === "mes" ? `${anio}-${mes}` : anio}.pdf`,
      {
        titulo: "Turnos y francos",
        subtitulo: `${sucursalNombre}${empleado ? ` · ${empleadosPorId.get(empleado) ?? ""}` : ""} — ${etiquetaPeriodo}`,
        fecha: `Generado el ${new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Mendoza" })}`,
      },
      secciones.length > 0 ? secciones : [{ columnas: ["Fecha", "Día", "Horario", "Observación"], filas: [] }],
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-edge bg-card p-4">
      <select
        value={empleado}
        onChange={(e) => setEmpleado(e.target.value)}
        className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
      >
        <option value="">Todos los empleados</option>
        {[...empleadosPorId.entries()]
          .sort((a, b) => a[1].localeCompare(b[1]))
          .map(([id, nombre]) => (
            <option key={id} value={id}>
              {nombre}
            </option>
          ))}
      </select>
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
