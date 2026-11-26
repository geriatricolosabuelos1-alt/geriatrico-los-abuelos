import { jsPDF } from "jspdf";
import type { DatosRecibo } from "@/lib/reciboDatos";

const MESES = [
  "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export const ETIQUETA_TIPO_PAGO = { obra_social: "Obra social", paciente: "Paciente / familia" } as const;

function importe(monto: number): string {
  return `$${monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

// PDF del recibo de pago (mismos datos que la hoja impresa), para mandar por mail.
export function crearPdfRecibo(r: DatosRecibo): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const ancho = doc.internal.pageSize.getWidth();
  const margen = 40;
  const mes = MESES[r.mes];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Los Abuelos", margen, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text([r.sedeNombre, r.sedeDireccion].filter(Boolean).join(" · "), margen, 78);

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("RECIBO", ancho - margen, 56, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Nº ${r.numero}`, ancho - margen, 72, { align: "right" });
  doc.text(r.emitido, ancho - margen, 86, { align: "right" });

  doc.setLineWidth(1.5);
  doc.line(margen, 104, ancho - margen, 104);

  const col2 = ancho / 2 + 10;
  doc.setFontSize(7);
  doc.setTextColor(110);
  doc.text("RECIBÍ DE", margen, 128);
  doc.text("EN CONCEPTO DE", col2, 128);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(r.residenteNombre, margen, 144);
  doc.text(`Arancel de ${mes} de ${r.anio}`, col2, 144);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (r.residenteDni) doc.text(`DNI ${r.residenteDni}`, margen, 160);
  doc.text(ETIQUETA_TIPO_PAGO[r.tipoPago], col2, 160);

  doc.setLineWidth(1.5);
  doc.rect(margen, 190, ancho - margen * 2, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL RECIBIDO", margen + 14, 215);
  doc.setFontSize(16);
  doc.text(importe(r.importe), ancho - margen - 14, 216, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setLineWidth(0.5);
  doc.line(ancho - margen - 180, 320, ancho - margen, 320);
  doc.setFontSize(8);
  doc.text("Firma y aclaración", ancho - margen - 90, 334, { align: "center" });
  doc.setTextColor(110);
  doc.setFontSize(7);
  doc.text("Este comprobante no reemplaza a la factura o recibo oficial de ARCA.", margen, 330);
  return doc;
}
