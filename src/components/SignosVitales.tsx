"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  guardarSignosVitales,
  obtenerPlanillasMes,
  type SignosVitales,
  type ValoresSignos,
} from "@/app/sucursales/[id]/enfermeria/actions";

const CAMPO =
  "w-full rounded-md border border-edge bg-card px-2 py-1 text-sm text-ink placeholder:text-ink-soft/50 focus:border-brass focus:outline-none";

function valoresIniciales(r: SignosVitales | undefined): ValoresSignos {
  return {
    tension_arterial: r?.tension_arterial ?? "",
    frecuencia_cardiaca: r?.frecuencia_cardiaca?.toString() ?? "",
    frecuencia_respiratoria: r?.frecuencia_respiratoria?.toString() ?? "",
    saturacion_o2: r?.saturacion_o2?.toString() ?? "",
    temperatura: r?.temperatura?.toString() ?? "",
  };
}

const COLUMNAS: { campo: keyof ValoresSignos; placeholder: string; modo: "text" | "numeric" | "decimal" }[] = [
  { campo: "tension_arterial", placeholder: "120/80", modo: "text" },
  { campo: "frecuencia_cardiaca", placeholder: "75", modo: "numeric" },
  { campo: "frecuencia_respiratoria", placeholder: "16", modo: "numeric" },
  { campo: "saturacion_o2", placeholder: "96", modo: "numeric" },
  { campo: "temperatura", placeholder: "36.5", modo: "decimal" },
];

export const ENCABEZADOS_SIGNOS = ["TA", "FC", "FR", "SO2 (%)", "T° (°C)"];

// Una fila de la planilla: los cinco valores medidos de un residente en un día, con su botón Guardar.
export function FilaSignosVitales({
  residenteId,
  fecha,
  registro,
  etiqueta,
}: {
  residenteId: string;
  fecha: string;
  registro: SignosVitales | undefined;
  etiqueta: React.ReactNode;
}) {
  const [valores, setValores] = useState<ValoresSignos>(() => valoresIniciales(registro));
  const [guardado, setGuardado] = useState<ValoresSignos>(() => valoresIniciales(registro));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cambiado = COLUMNAS.some((c) => valores[c.campo] !== guardado[c.campo]);
  const tieneDatos = COLUMNAS.some((c) => guardado[c.campo] !== "");

  async function guardar() {
    setEnviando(true);
    setError(null);
    const resultado = await guardarSignosVitales(residenteId, fecha, valores);
    setEnviando(false);
    if (resultado.error) {
      setError(resultado.error);
      return;
    }
    setGuardado(valores);
  }

  return (
    <tr className="border-t border-edge align-top">
      <td className="px-3 py-2 text-sm text-ink">{etiqueta}</td>
      {COLUMNAS.map((c) => (
        <td key={c.campo} className="px-1.5 py-2">
          <input
            value={valores[c.campo]}
            inputMode={c.modo}
            placeholder={c.placeholder}
            onChange={(e) => setValores((v) => ({ ...v, [c.campo]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && cambiado && !enviando) guardar();
            }}
            className={CAMPO}
          />
        </td>
      ))}
      <td className="px-3 py-2 text-right whitespace-nowrap">
        {cambiado ? (
          <button
            type="button"
            onClick={guardar}
            disabled={enviando}
            className="rounded-lg bg-brass px-3 py-1 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
          >
            {enviando ? "Guardando..." : "Guardar"}
          </button>
        ) : (
          tieneDatos && <span className="text-xs text-brass">✓ Cargado</span>
        )}
        {error && <p className="mt-1 max-w-[180px] text-left text-xs whitespace-normal text-red-700">{error}</p>}
      </td>
    </tr>
  );
}

// Selector de fecha de la planilla diaria: arranca en hoy y se puede cambiar.
export function SelectorFechaSignos({ fecha, hoy }: { fecha: string; hoy: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-bold uppercase tracking-wide text-ink-soft">Fecha</label>
      <input
        type="date"
        value={fecha}
        max={hoy}
        onChange={(e) => e.target.value && router.push(`?fecha=${e.target.value}`)}
        className="rounded-lg border border-edge bg-card px-3 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
      />
      {fecha !== hoy && (
        <button
          type="button"
          onClick={() => router.push(`?fecha=${hoy}`)}
          className="text-xs text-brass hover:text-ink"
        >
          Volver a hoy
        </button>
      )}
    </div>
  );
}

// Descarga la planilla del mes en PDF: de un residente o de todos los de la sede (una hoja por residente).
export function BotonPdfSignos({
  filtro,
  mesInicial,
  etiqueta,
}: {
  filtro: { residenteId: string } | { sucursalId: string };
  mesInicial: string;
  etiqueta: string;
}) {
  const [mes, setMes] = useState(mesInicial);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function descargar() {
    setGenerando(true);
    setError(null);
    try {
      const planillas = await obtenerPlanillasMes(filtro, mes);
      if (planillas.length === 0) {
        setError("No hay residentes para ese mes.");
        return;
      }
      const { generarSignosVitalesPdf } = await import("@/lib/signosVitalesPdf");
      const pdf = generarSignosVitalesPdf(planillas, mes);
      const nombre =
        planillas.length === 1
          ? `signos-vitales-${planillas[0].nombre}-${mes}.pdf`
          : `signos-vitales-${planillas[0].sede}-${mes}.pdf`;
      const url = URL.createObjectURL(pdf);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombre.toLowerCase().replace(/[,\s]+/g, "-");
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError("No se pudo armar el PDF. Probá de nuevo.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="rounded-lg border border-edge bg-card px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
        <button
          type="button"
          onClick={descargar}
          disabled={generando || !mes}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-60"
        >
          {generando ? "Armando PDF..." : etiqueta}
        </button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
