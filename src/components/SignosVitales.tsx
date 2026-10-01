"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  guardarSignosVitales,
  obtenerPlanillas,
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

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(fecha + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function ultimoDiaDelMes(fecha: string): string {
  const [anio, mes] = fecha.split("-").map(Number);
  return `${fecha.slice(0, 7)}-${String(new Date(anio, mes, 0).getDate()).padStart(2, "0")}`;
}

// Descarga la planilla de signos vitales en PDF para el período elegido (desde/hasta):
// de un residente o de todos los de la sede (cada uno empieza en hoja nueva).
export function BotonPdfSignos({
  filtro,
  hoy,
  etiqueta,
}: {
  filtro: { residenteId: string } | { sucursalId: string };
  hoy: string;
  etiqueta: string;
}) {
  const [desde, setDesde] = useState(`${hoy.slice(0, 7)}-01`);
  const [hasta, setHasta] = useState(hoy);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inicioMesAnterior = `${sumarDias(`${hoy.slice(0, 7)}-01`, -1).slice(0, 7)}-01`;
  const atajos: { etiqueta: string; desde: string; hasta: string }[] = [
    { etiqueta: "Últimos 7 días", desde: sumarDias(hoy, -6), hasta: hoy },
    { etiqueta: "Este mes", desde: `${hoy.slice(0, 7)}-01`, hasta: hoy },
    { etiqueta: "Mes anterior", desde: inicioMesAnterior, hasta: ultimoDiaDelMes(inicioMesAnterior) },
  ];

  async function descargar() {
    if (!desde || !hasta || desde > hasta) {
      setError("Revisá el período: la fecha Desde tiene que ser anterior a Hasta.");
      return;
    }
    setGenerando(true);
    setError(null);
    try {
      const planillas = await obtenerPlanillas(filtro, desde, hasta);
      if (planillas.length === 0) {
        setError("No hay residentes para imprimir.");
        return;
      }
      const { generarSignosVitalesPdf } = await import("@/lib/signosVitalesPdf");
      const pdf = generarSignosVitalesPdf(planillas, desde, hasta);
      const quien = planillas.length === 1 ? planillas[0].nombre : planillas[0].sede;
      const url = URL.createObjectURL(pdf);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `signos-vitales-${quien}-${desde}-al-${hasta}.pdf`.toLowerCase().replace(/[,\s]+/g, "-");
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError("No se pudo armar el PDF. Probá de nuevo.");
    } finally {
      setGenerando(false);
    }
  }

  const CAMPO_FECHA =
    "rounded-lg border border-edge bg-card px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none";

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="text-xs font-bold uppercase tracking-wide text-ink-soft">Desde</label>
        <input type="date" value={desde} max={hoy} onChange={(e) => setDesde(e.target.value)} className={CAMPO_FECHA} />
        <label className="text-xs font-bold uppercase tracking-wide text-ink-soft">Hasta</label>
        <input type="date" value={hasta} max={hoy} onChange={(e) => setHasta(e.target.value)} className={CAMPO_FECHA} />
        <button
          type="button"
          onClick={descargar}
          disabled={generando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-60"
        >
          {generando ? "Armando PDF..." : etiqueta}
        </button>
      </div>
      <div className="flex gap-3">
        {atajos.map((a) => (
          <button
            key={a.etiqueta}
            type="button"
            onClick={() => {
              setDesde(a.desde);
              setHasta(a.hasta);
            }}
            className={`text-xs hover:text-ink ${desde === a.desde && hasta === a.hasta ? "font-semibold text-ink" : "text-brass"}`}
          >
            {a.etiqueta}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
