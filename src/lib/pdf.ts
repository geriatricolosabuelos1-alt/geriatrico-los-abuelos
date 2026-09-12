import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type SeccionPdf = {
  titulo?: string;
  columnas: string[];
  filas: (string | number)[][];
};

export type EncabezadoPdf = {
  titulo: string;
  subtitulo?: string;
  fecha?: string;
};

export function descargarPdf(nombreArchivo: string, encabezado: EncabezadoPdf, secciones: SeccionPdf[]): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 44;

  doc.setFontSize(16);
  doc.text(encabezado.titulo, 40, y);
  y += 18;

  doc.setFontSize(10);
  doc.setTextColor(110);
  if (encabezado.subtitulo) {
    doc.text(encabezado.subtitulo, 40, y);
    y += 14;
  }
  if (encabezado.fecha) {
    doc.text(encabezado.fecha, 40, y);
    y += 10;
  }
  doc.setTextColor(0);

  for (const seccion of secciones) {
    if (seccion.titulo) {
      y += 12;
      doc.setFontSize(12);
      doc.text(seccion.titulo, 40, y);
      y += 4;
    }

    autoTable(doc, {
      startY: y + 6,
      head: [seccion.columnas],
      body: seccion.filas,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [180, 145, 90] },
      margin: { left: 40, right: 40 },
    });

    const conAutoTable = doc as unknown as { lastAutoTable: { finalY: number } };
    y = conAutoTable.lastAutoTable.finalY + 16;

    if (y > 760) {
      doc.addPage();
      y = 44;
    }
  }

  doc.save(nombreArchivo);
}
