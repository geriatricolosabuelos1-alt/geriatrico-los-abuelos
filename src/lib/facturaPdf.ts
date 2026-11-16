import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { DatosHojaFacturaC } from "@/components/HojaFacturaC";

function importe(monto: number): string {
  return `$${monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

function fecha(valor: string): string {
  const [a, m, d] = valor.split("-");
  return `${d}/${m}/${a}`;
}

// PDF de la Factura C (mismos datos que la hoja impresa), para mandar por WhatsApp.
export function crearPdfFactura(f: DatosHojaFacturaC): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const ancho = doc.internal.pageSize.getWidth();
  const margen = 40;

  // Emisor
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(f.sedeNombre, margen, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  const cuit = `CUIT ${f.cuit.slice(0, 2)}-${f.cuit.slice(2, 10)}-${f.cuit.slice(10)}`;
  [f.razonSocial, cuit, f.direccion ?? "", "Monotributista"].filter(Boolean).forEach((linea, i) => {
    doc.text(linea, margen, 72 + i * 12);
  });

  // Letra C
  doc.setTextColor(0);
  doc.setDrawColor(0);
  doc.rect(ancho / 2 - 24, 36, 48, 46);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("C", ancho / 2, 64, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("COD. 011", ancho / 2, 76, { align: "center" });

  // Número y fecha
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("FACTURA", ancho - margen, 56, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Nº ${f.numero}`, ancho - margen, 72, { align: "right" });
  doc.setFontSize(9);
  doc.text(`Fecha de emisión: ${fecha(f.fechaEmision)}`, ancho - margen, 86, { align: "right" });

  doc.setLineWidth(1.5);
  doc.line(margen, 124, ancho - margen, 124);
  doc.setLineWidth(0.5);

  // Cliente y concepto
  const col2 = ancho / 2 + 10;
  doc.setFontSize(7);
  doc.setTextColor(110);
  doc.text("CLIENTE", margen, 146);
  doc.text("EN CONCEPTO DE", col2, 146);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(doc.splitTextToSize(f.clienteNombre, ancho / 2 - margen - 10), margen, 162);
  doc.text(f.concepto, col2, 162);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(f.clienteDocumento, margen, 178);
  doc.text(`Condición frente al IVA: ${f.clienteCondicionIva}`, margen, 190);
  let yc = 178;
  if (f.textoPeriodo) {
    doc.text(f.textoPeriodo, col2, yc);
    yc += 12;
  }
  if (f.condicionVenta) {
    doc.text(`Condición de venta: ${f.condicionVenta}${f.medioPago ? ` – ${f.medioPago}` : ""}`, col2, yc);
  }

  // Detalle
  autoTable(doc, {
    startY: 210,
    head: [["Descripción", "Importe"]],
    body: f.lineas.map((l) => [l.descripcion, importe(l.importe)]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [235, 235, 235], textColor: 60 },
    columnStyles: { 1: { halign: "right", cellWidth: 110 } },
    margin: { left: margen, right: margen },
  });
  const finTabla = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 260;

  // Total
  const yTotal = finTabla + 18;
  doc.setLineWidth(1.5);
  doc.rect(margen, yTotal, ancho - margen * 2, 36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("IMPORTE TOTAL", margen + 14, yTotal + 23);
  doc.setFontSize(16);
  doc.text(importe(f.importe), ancho - margen - 14, yTotal + 24, { align: "right" });

  // QR y CAE
  const yQr = yTotal + 60;
  doc.addImage(f.qrDataUri, "PNG", margen, yQr, 90, 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`CAE: ${f.cae}`, margen + 104, yQr + 30);
  doc.text(`Vto. CAE: ${fecha(f.caeVencimiento)}`, margen + 104, yQr + 44);
  doc.setFontSize(7);
  doc.setTextColor(110);
  doc.text("Comprobante Autorizado por AFIP/ARCA", margen + 104, yQr + 60);

  return doc;
}

export function nombreArchivoFactura(f: DatosHojaFacturaC): string {
  const cliente = f.clienteNombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `Factura-${f.numero.replace(/\s+/g, "-")}-${cliente}.pdf`;
}
