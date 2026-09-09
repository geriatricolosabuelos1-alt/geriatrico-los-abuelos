"use client";

import { useEffect, useState } from "react";
import {
  eliminarDocumento,
  listarDocumentos,
  subirDocumento,
  type DocumentoConUrl,
} from "@/app/residentes/[id]/legajo/documentos-actions";
import type { RolUsuario, TipoDocumentoResidente } from "@/lib/types";

type Props = {
  residenteId: string;
  rolActual: RolUsuario;
};

const ROLES_CONTRATO: RolUsuario[] = ["admin", "administrativo"];

const TIPOS: { valor: TipoDocumentoResidente; etiqueta: string }[] = [
  { valor: "orden_internacion", etiqueta: "Orden médica de internación" },
  { valor: "cud", etiqueta: "Certificado Único de Discapacidad (CUD)" },
  { valor: "nota_derivacion", etiqueta: "Nota de derivación" },
  { valor: "contrato", etiqueta: "Contrato firmado" },
];

export function DocumentosResidente({ residenteId, rolActual }: Props) {
  const [documentos, setDocumentos] = useState<DocumentoConUrl[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendoTipo, setSubiendoTipo] = useState<TipoDocumentoResidente | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function recargar() {
    setCargando(true);
    const datos = await listarDocumentos(residenteId);
    setDocumentos(datos);
    setCargando(false);
  }

  useEffect(() => {
    let cancelado = false;

    async function cargarInicial() {
      setCargando(true);
      const datos = await listarDocumentos(residenteId);
      if (!cancelado) {
        setDocumentos(datos);
        setCargando(false);
      }
    }

    cargarInicial();
    return () => {
      cancelado = true;
    };
  }, [residenteId]);

  async function manejarSubida(tipo: TipoDocumentoResidente, archivo: File) {
    setSubiendoTipo(tipo);
    setError(null);

    const formData = new FormData();
    formData.append("archivo", archivo);
    formData.append("tipo", tipo);
    const resultado = await subirDocumento(residenteId, { error: null }, formData);

    setSubiendoTipo(null);
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
    <section className="rounded-2xl border border-edge bg-card p-5 lg:col-span-2 xl:col-span-3">
      <h2 className="mb-3 font-display text-base font-semibold text-ink">Documentos</h2>

      {error && <p className="mb-3 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TIPOS.map((t) => {
          const documentosDeTipo = documentos.filter((d) => d.tipo === t.valor);
          const esContrato = t.valor === "contrato";
          const puedeGestionar = !esContrato || ROLES_CONTRATO.includes(rolActual);
          return (
            <div key={t.valor} className="rounded-xl border border-edge bg-panel-deep p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">{t.etiqueta}</p>
                {puedeGestionar ? (
                  <label className="flex-shrink-0 cursor-pointer rounded-full border border-edge px-3 py-1 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink">
                    {subiendoTipo === t.valor ? "Subiendo..." : "+ Subir"}
                    <input
                      type="file"
                      accept={esContrato ? "application/pdf" : undefined}
                      className="hidden"
                      disabled={subiendoTipo !== null}
                      onChange={(e) => {
                        const archivo = e.target.files?.[0];
                        if (archivo) manejarSubida(t.valor, archivo);
                        e.target.value = "";
                      }}
                    />
                  </label>
                ) : (
                  <span className="flex-shrink-0 text-[0.65rem] text-ink-soft">
                    Solo administración
                  </span>
                )}
              </div>

              {cargando ? (
                <p className="text-xs text-ink-soft">Cargando...</p>
              ) : documentosDeTipo.length === 0 ? (
                <p className="text-xs text-ink-soft">Sin archivos cargados.</p>
              ) : (
                <ul className="space-y-1.5">
                  {documentosDeTipo.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
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
                      {puedeGestionar && (
                        <button
                          type="button"
                          onClick={() => manejarBorrar(doc)}
                          className="flex-shrink-0 text-red-700 hover:text-red-500"
                        >
                          Eliminar
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
