"use client";

import { useEffect, useState } from "react";
import {
  eliminarDocumento,
  listarDocumentos,
  subirDocumento,
  type DocumentoConUrl,
} from "@/app/residentes/[id]/legajo/documentos-actions";
import type { TipoDocumentoResidente } from "@/lib/types";

type Props = {
  residenteId: string;
  tipo: TipoDocumentoResidente;
  etiquetaBoton?: string;
};

export function SubirPdfUnico({ residenteId, tipo, etiquetaBoton = "+ Subir PDF" }: Props) {
  const [documentos, setDocumentos] = useState<DocumentoConUrl[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function recargar() {
    const datos = await listarDocumentos(residenteId);
    setDocumentos(datos.filter((d) => d.tipo === tipo));
    setCargando(false);
  }

  useEffect(() => {
    let cancelado = false;

    async function cargarInicial() {
      const datos = await listarDocumentos(residenteId);
      if (!cancelado) {
        setDocumentos(datos.filter((d) => d.tipo === tipo));
        setCargando(false);
      }
    }

    cargarInicial();
    return () => {
      cancelado = true;
    };
  }, [residenteId, tipo]);

  async function manejarSubida(archivo: File) {
    setSubiendo(true);
    setError(null);

    const formData = new FormData();
    formData.append("archivo", archivo);
    formData.append("tipo", tipo);
    const resultado = await subirDocumento(residenteId, { error: null }, formData);

    setSubiendo(false);
    if (resultado.error) {
      setError(resultado.error);
      return;
    }
    await recargar();
  }

  async function manejarBorrar(doc: DocumentoConUrl) {
    if (!window.confirm(`¿Eliminar "${doc.nombre_archivo}"?`)) return;
    await eliminarDocumento(residenteId, doc.id, doc.url);
    await recargar();
  }

  return (
    <div className="rounded-xl border border-edge bg-panel-deep p-3 print:hidden">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">PDF adjunto</p>
        <label className="flex-shrink-0 cursor-pointer rounded-full border border-edge bg-card px-3 py-1 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink">
          {subiendo ? "Subiendo..." : etiquetaBoton}
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={subiendo}
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              if (archivo) manejarSubida(archivo);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {error && <p className="mb-2 text-xs text-red-700">{error}</p>}

      {cargando ? (
        <p className="text-xs text-ink-soft">Cargando...</p>
      ) : documentos.length === 0 ? (
        <p className="text-xs text-ink-soft">Sin PDF cargado todavía.</p>
      ) : (
        <ul className="space-y-1.5">
          {documentos.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2 text-xs">
              {doc.urlFirmada ? (
                <a
                  href={doc.urlFirmada}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                >
                  {doc.nombre_archivo}
                </a>
              ) : (
                <span className="truncate text-ink-soft">{doc.nombre_archivo}</span>
              )}
              <button
                type="button"
                onClick={() => manejarBorrar(doc)}
                className="flex-shrink-0 text-red-700 hover:text-red-500"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
