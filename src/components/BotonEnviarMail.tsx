"use client";

import { useState } from "react";
import { MAIL_FACTURAS } from "@/lib/facturacion";

// Envía un comprobante (factura o recibo) en PDF por mail: viene con el mail de facturación,
// pero se puede cambiar. `accion` es la acción del servidor que arma el PDF y lo manda.
export function BotonEnviarMail({ accion }: { accion: (destinatario: string) => Promise<{ error: string | null }> }) {
  const [abierto, setAbierto] = useState(false);
  const [destinatario, setDestinatario] = useState(MAIL_FACTURAS);
  const [estado, setEstado] = useState<"listo" | "enviando" | "enviado">("listo");
  const [enviadaA, setEnviadaA] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEstado("enviando");
    setError(null);
    const r = await accion(destinatario);
    if (r.error) {
      setError(r.error);
      setEstado("listo");
    } else {
      setEnviadaA(destinatario.trim());
      setEstado("enviado");
      setAbierto(false);
    }
  }

  if (!abierto) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="rounded-full border border-edge px-4 py-1.5 text-xs font-semibold text-ink hover:border-brass"
        >
          {estado === "enviado" ? "Enviada ✓ (reenviar)" : "Enviar por mail"}
        </button>
        {enviadaA && <p className="text-[0.7rem] text-ink-soft">Enviada a {enviadaA}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <input
          type="email"
          value={destinatario}
          onChange={(e) => setDestinatario(e.target.value)}
          aria-label="Mail de destino"
          className="w-60 rounded-full border border-edge bg-panel-deep px-3 py-1.5 text-xs text-ink focus:border-brass focus:outline-none"
        />
        <button
          type="button"
          onClick={enviar}
          disabled={estado === "enviando" || !destinatario.trim()}
          className="rounded-full bg-brass px-4 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {estado === "enviando" ? "Enviando..." : "Enviar"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="text-xs text-ink-soft hover:text-ink">
          Cancelar
        </button>
      </div>
      {error && <p className="max-w-xs text-right text-[0.7rem] text-red-700">{error}</p>}
    </div>
  );
}
