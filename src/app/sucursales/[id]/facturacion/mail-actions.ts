"use server";

import { datosFactura, type TipoFactura } from "@/lib/facturaDatos";
import { crearPdfFactura, nombreArchivoFactura } from "@/lib/facturaPdf";
import { enviarMailConAdjunto } from "@/lib/mail";
import { MAIL_FACTURAS } from "@/lib/facturacion";

function importe(monto: number): string {
  return `$${monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

// Manda la factura en PDF por mail: por defecto al mail de facturación, o al que se escriba.
export async function enviarFacturaPorMail(
  tipo: TipoFactura,
  facturaId: string,
  destinatario: string = MAIL_FACTURAS,
): Promise<{ error: string | null }> {
  const para = destinatario.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) return { error: "El mail no es válido." };

  const factura = await datosFactura(tipo, facturaId);
  if (!factura) return { error: "No se encontró la factura." };
  const f = factura.datos;

  try {
    const pdf = crearPdfFactura(f);
    await enviarMailConAdjunto({
      destinatario: para,
      asunto: `Factura ${f.numero} - ${f.sedeNombre} - ${f.clienteNombre}`,
      texto: [
        `Factura ${f.numero} emitida por ${f.sedeNombre}.`,
        `Cliente: ${f.clienteNombre} (${f.clienteDocumento})`,
        `Fecha: ${f.fechaEmision.split("-").reverse().join("/")}`,
        f.textoPeriodo,
        `Importe total: ${importe(f.importe)}`,
        `CAE: ${f.cae}`,
        "",
        "Se adjunta la factura en PDF.",
      ]
        .filter((l) => l !== "")
        .join("\n"),
      adjunto: {
        nombreArchivo: nombreArchivoFactura(f),
        contenido: Buffer.from(pdf.output("arraybuffer")),
        contentType: "application/pdf",
      },
    });
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo enviar el mail." };
  }
}
