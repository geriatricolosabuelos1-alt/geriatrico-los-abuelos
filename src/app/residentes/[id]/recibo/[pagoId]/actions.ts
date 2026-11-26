"use server";

import { datosRecibo } from "@/lib/reciboDatos";
import { crearPdfRecibo, ETIQUETA_TIPO_PAGO } from "@/lib/reciboPdf";
import { enviarMailConAdjunto } from "@/lib/mail";

function importe(monto: number): string {
  return `$${monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

// Manda el recibo de pago en PDF al mail que se indique (por defecto, el de facturación).
export async function enviarReciboPorMail(
  residenteId: string,
  pagoId: string,
  destinatario: string,
): Promise<{ error: string | null }> {
  const para = destinatario.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) return { error: "El mail no es válido." };

  const r = await datosRecibo(residenteId, pagoId);
  if (!r) return { error: "No se encontró el recibo." };

  try {
    const pdf = crearPdfRecibo(r);
    const nombre = r.residenteNombre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-");
    await enviarMailConAdjunto({
      destinatario: para,
      asunto: `Recibo ${r.numero} - ${r.sedeNombre} - ${r.residenteNombre}`,
      texto: [
        `Recibo de pago de ${r.sedeNombre}.`,
        `Recibí de: ${r.residenteNombre}${r.residenteDni ? ` (DNI ${r.residenteDni})` : ""}`,
        `Concepto: arancel ${String(r.mes).padStart(2, "0")}/${r.anio} · ${ETIQUETA_TIPO_PAGO[r.tipoPago]}`,
        `Total recibido: ${importe(r.importe)}`,
        "",
        "Se adjunta el recibo en PDF.",
      ].join("\n"),
      adjunto: {
        nombreArchivo: `Recibo-${r.numero}-${nombre}.pdf`,
        contenido: Buffer.from(pdf.output("arraybuffer")),
        contentType: "application/pdf",
      },
    });
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo enviar el mail." };
  }
}
