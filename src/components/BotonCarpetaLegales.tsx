"use client";

import { useState } from "react";
import {
  obtenerDatosCarpeta,
  enviarCarpetaPorMail,
  type DatosCarpeta,
} from "@/app/sucursales/[id]/legales/carpeta-actions";

function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      const resultado = String(lector.result ?? "");
      // El data URL trae "data:application/pdf;base64," antes del contenido.
      resolve(resultado.split(",")[1] ?? "");
    };
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(blob);
  });
}

export function BotonCarpetaLegales({ sucursalId }: { sucursalId: string }) {
  const [progreso, setProgreso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mailAbierto, setMailAbierto] = useState(false);
  const [destinatario, setDestinatario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function armarPdf(): Promise<{ pdf: Blob; datos: DatosCarpeta; nombreArchivo: string }> {
    const datos = await obtenerDatosCarpeta(sucursalId);
    if (!datos) throw new Error("sin datos");
    // Se carga solo al usarlo: pdf-lib y jsPDF son pesados.
    const { generarCarpetaLegalesPdf } = await import("@/lib/carpetaLegalesPdf");
    const pdf = await generarCarpetaLegalesPdf(datos, setProgreso);
    const nombreArchivo = `documentacion-legal-${datos.sede}.pdf`.toLowerCase().replace(/\s+/g, "-");
    return { pdf, datos, nombreArchivo };
  }

  async function descargar() {
    setError(null);
    setProgreso("Buscando la documentación...");
    try {
      const { pdf, nombreArchivo } = await armarPdf();
      const url = URL.createObjectURL(pdf);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombreArchivo;
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError("No se pudo armar el PDF. Probá de nuevo.");
    } finally {
      setProgreso(null);
    }
  }

  async function enviarPorMail() {
    setError(null);
    setEnviando(true);
    try {
      const { pdf, datos, nombreArchivo } = await armarPdf();
      setProgreso("Enviando el mail...");
      const pdfBase64 = await blobABase64(pdf);
      const resultado = await enviarCarpetaPorMail(destinatario, datos.sede, nombreArchivo, pdfBase64);
      if (resultado.error) {
        setError(resultado.error);
        return;
      }
      setEnviado(true);
      setMailAbierto(false);
      setDestinatario("");
    } catch {
      setError("No se pudo enviar el mail. Probá de nuevo.");
    } finally {
      setEnviando(false);
      setProgreso(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setEnviado(false);
            setError(null);
            setMailAbierto((v) => !v);
          }}
          className="rounded-lg border border-edge bg-card px-4 py-2 text-sm font-semibold text-ink hover:border-brass"
        >
          Compartir por mail
        </button>
        <button
          type="button"
          onClick={descargar}
          disabled={progreso !== null}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-60"
        >
          {progreso ?? "Sacar todo junto (PDF)"}
        </button>
      </div>

      {mailAbierto && (
        <div className="flex items-center gap-2 rounded-lg border border-edge bg-card p-2">
          <input
            type="email"
            value={destinatario}
            onChange={(e) => setDestinatario(e.target.value)}
            placeholder="mail@destino.com"
            className="rounded-lg border border-edge bg-panel-deep px-2 py-1 text-xs text-ink focus:border-brass focus:outline-none"
          />
          <button
            type="button"
            onClick={enviarPorMail}
            disabled={enviando || !destinatario}
            className="rounded-lg bg-brass px-3 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
          >
            {enviando ? (progreso ?? "Enviando...") : "Enviar"}
          </button>
        </div>
      )}

      <p className="text-[0.65rem] text-ink-soft">Resumen + todos los documentos cargados, foliado</p>
      {enviado && <p className="text-xs text-brass">Mail enviado.</p>}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
