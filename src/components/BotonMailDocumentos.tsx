"use client";

import { useState } from "react";
import { enviarDocumentosHabilitacionPorMail } from "@/app/sucursales/[id]/legales/habilitacion/actions";

// Manda por mail los archivos cargados en Habilitación: algunos (documentoIds) o todos (documentoIds = null).
export function BotonMailDocumentos({
  sucursalId,
  documentoIds,
  etiqueta,
  destacado = false,
}: {
  sucursalId: string;
  documentoIds: string[] | null;
  etiqueta: string;
  destacado?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [destinatario, setDestinatario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setError(null);
    setMensaje(null);
    setEnviando(true);
    const resultado = await enviarDocumentosHabilitacionPorMail(sucursalId, documentoIds, destinatario);
    setEnviando(false);
    if (resultado.error) {
      setError(resultado.error);
      return;
    }
    setMensaje(resultado.mails && resultado.mails > 1 ? `Enviado en ${resultado.mails} mails.` : "Mail enviado.");
    setAbierto(false);
    setDestinatario("");
  }

  return (
    <div className={`flex flex-col gap-1 ${destacado ? "items-end" : "items-start"}`}>
      <button
        type="button"
        onClick={() => {
          setMensaje(null);
          setError(null);
          setAbierto((v) => !v);
        }}
        className={
          destacado
            ? "rounded-lg border border-edge bg-card px-4 py-2 text-sm font-semibold text-ink hover:border-brass"
            : "text-xs text-brass hover:text-ink"
        }
      >
        {etiqueta}
      </button>

      {abierto && (
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
            onClick={enviar}
            disabled={enviando || !destinatario}
            className="rounded-lg bg-brass px-3 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
          >
            {enviando ? "Enviando..." : "Enviar"}
          </button>
        </div>
      )}

      {mensaje && <p className="text-xs text-brass">{mensaje}</p>}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
