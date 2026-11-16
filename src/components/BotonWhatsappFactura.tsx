"use client";

import { useState } from "react";
import type { DatosHojaFacturaC } from "@/components/HojaFacturaC";

function importe(monto: number): string {
  return `$${monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

// Manda la factura en PDF por WhatsApp al contacto que se elija.
// En el celular usa "Compartir" (se elige WhatsApp y el contacto, con el PDF adjunto).
// En la computadora descarga el PDF y abre WhatsApp para elegir el contacto y adjuntarlo.
export function BotonWhatsappFactura({ f }: { f: DatosHojaFacturaC }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const [armando, setArmando] = useState(false);

  async function enviar() {
    setArmando(true);
    setAviso(null);
    try {
      const { crearPdfFactura, nombreArchivoFactura } = await import("@/lib/facturaPdf");
      const doc = crearPdfFactura(f);
      const nombre = nombreArchivoFactura(f);
      const texto = `Hola, te envío la factura ${f.numero} de ${f.sedeNombre} por ${importe(f.importe)}.`;
      const archivo = new File([doc.output("blob")], nombre, { type: "application/pdf" });

      if (navigator.canShare?.({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], text: texto, title: `Factura ${f.numero}` });
          return;
        } catch (err) {
          // Si la persona cerró el menú de compartir, no se hace nada más.
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }

      doc.save(nombre);
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
      setAviso("Se descargó el PDF: en WhatsApp elegí el contacto y adjuntalo con el clip 📎.");
    } finally {
      setArmando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={enviar}
        disabled={armando}
        className="rounded-full bg-[#25D366] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#1ebe5b] disabled:opacity-50"
      >
        {armando ? "Preparando..." : "Enviar por WhatsApp"}
      </button>
      {aviso && <p className="max-w-xs text-right text-[0.7rem] text-ink-soft">{aviso}</p>}
    </div>
  );
}
