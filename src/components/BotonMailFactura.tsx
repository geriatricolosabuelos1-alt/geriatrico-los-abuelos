"use client";

import { useState } from "react";
import { enviarFacturaPorMail } from "@/app/sucursales/[id]/facturacion/mail-actions";
import type { TipoFactura } from "@/lib/facturaDatos";
import { MAIL_FACTURAS } from "@/lib/facturacion";

// Reenvía la factura en PDF al mail de facturación.
export function BotonMailFactura({ tipo, facturaId }: { tipo: TipoFactura; facturaId: string }) {
  const [estado, setEstado] = useState<"listo" | "enviando" | "enviado">("listo");
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEstado("enviando");
    setError(null);
    const r = await enviarFacturaPorMail(tipo, facturaId);
    if (r.error) {
      setError(r.error);
      setEstado("listo");
    } else {
      setEstado("enviado");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={enviar}
        disabled={estado === "enviando"}
        title={`Se envía a ${MAIL_FACTURAS}`}
        className="rounded-full border border-edge px-4 py-1.5 text-xs font-semibold text-ink hover:border-brass disabled:opacity-50"
      >
        {estado === "enviando" ? "Enviando..." : estado === "enviado" ? "Enviada ✓ (reenviar)" : "Enviar por mail"}
      </button>
      {estado === "enviado" && <p className="text-[0.7rem] text-ink-soft">Enviada a {MAIL_FACTURAS}</p>}
      {error && <p className="max-w-xs text-right text-[0.7rem] text-red-700">{error}</p>}
    </div>
  );
}
