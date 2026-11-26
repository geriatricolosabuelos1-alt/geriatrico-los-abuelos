import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { EvaluacionMedica, IndicacionMedica } from "@/lib/types";

export type DatosPdfEvaluacion = {
  residenteNombre: string;
  sede: string;
  dni: string | null;
  edad: number | null;
  fechaNacimiento: string | null;
  obraSocial: string | null;
  afiliado: string | null;
  evaluacion: EvaluacionMedica | null;
  indicacion: IndicacionMedica | null;
};

function fecha(valor: string | null | undefined): string {
  if (!valor) return "—";
  // Fechas "AAAA-MM-DD" (evaluación, nacimiento): se muestran tal cual, sin pasar por zona horaria
  // (si no, en el servidor salía un día antes).
  if (valor.length === 10) return valor.split("-").reverse().join("/");
  return new Date(valor).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Mendoza" });
}

function mesAnio(valor: string): string {
  return new Date(valor + "T00:00:00").toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

const MARGEN = 40;
const ESTILO_TABLA = {
  styles: { fontSize: 8.5, cellPadding: 3, lineColor: [170, 170, 170] as [number, number, number], lineWidth: 0.4 },
  headStyles: { fillColor: [235, 235, 235] as [number, number, number], textColor: 40, fontStyle: "bold" as const },
  margin: { left: MARGEN, right: MARGEN },
  theme: "grid" as const,
};

// Evaluación + indicaciones médicas en una hoja, con la firma de la médica abajo pegada al contenido.
export function crearPdfEvaluacionMedica(d: DatosPdfEvaluacion): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const finY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Evaluación médica", MARGEN, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(d.sede, ancho - MARGEN, 48, { align: "right" });
  doc.setTextColor(0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(d.residenteNombre, MARGEN, 70);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    [
      `DNI ${d.dni ?? "—"} · Edad ${d.edad !== null ? `${d.edad} años` : "—"} · Nacimiento ${fecha(d.fechaNacimiento)}`,
      `Obra social ${d.obraSocial ?? "—"} · Afiliado ${d.afiliado ?? "—"}`,
    ],
    MARGEN,
    84,
  );
  doc.setLineWidth(1);
  doc.line(MARGEN, 104, ancho - MARGEN, 104);
  let y = 112;

  const ev = d.evaluacion;
  if (ev) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Evaluación — ${fecha(ev.fecha)}`, MARGEN, y + 10);
    const filas: [string, string | null][] = [
      ["Antecedentes", ev.antecedentes],
      ["Estado de conciencia", ev.estado_conciencia],
      ["Orientación", ev.orientacion.length > 0 ? ev.orientacion.join(", ") : null],
      ["Obs. orientación", ev.obs_orientacion],
      ["Alimentación", [ev.alimentacion, ev.consistencia].filter(Boolean).join(" · ") || null],
      ["Obs. alimentación", ev.obs_alimentacion],
      ["Marcha / Movilidad", ev.marcha_movilidad],
      ["Control de esfínteres", [ev.control_urinario, ev.control_fecal].filter(Boolean).join(" · ") || null],
      ["Obs. esfínteres", ev.obs_esfinteres],
      ["Conducta", ev.conducta],
    ];
    autoTable(doc, {
      ...ESTILO_TABLA,
      startY: y + 16,
      body: filas
        .filter(([etiqueta, valor]) => valor || !etiqueta.startsWith("Obs."))
        .map(([etiqueta, valor]) => [etiqueta, valor ?? "—"]),
      columnStyles: { 0: { cellWidth: 130, fontStyle: "bold" } },
    });
    y = finY() + 8;
  }

  const ind = d.indicacion;
  if (ind) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Indicaciones médicas — ${mesAnio(ind.periodo_desde)}`, MARGEN, y + 10);
    autoTable(doc, {
      ...ESTILO_TABLA,
      startY: y + 16,
      head: [["Medicación", "MG", "Cant. comp.", "8 HS", "12 HS", "20 HS"]],
      body: ind.items.map((it) => [it.medicacion, it.mg || "—", it.cantidad || "—", it.h8 ? "X" : "", it.h12 ? "X" : "", it.h20 ? "X" : ""]),
      columnStyles: { 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "center" }, 5: { halign: "center" } },
    });
    y = finY() + 6;
    if (ind.observaciones) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const lineas = doc.splitTextToSize(`Observaciones: ${ind.observaciones}`, ancho - MARGEN * 2);
      doc.text(lineas, MARGEN, y + 10);
      y += 10 + lineas.length * 11;
    }
  }

  // Firma: solo la de la médica (nunca quién lo cargó). Va pegada al contenido; si no entra, hoja nueva.
  const firmado = ev?.firmado_por ? ev : ind?.firmado_por ? ind : null;
  let yFirma = y + 50;
  if (yFirma + 40 > alto - 40) {
    doc.addPage();
    yFirma = 90;
  }
  const xFirma = ancho - MARGEN - 200;
  doc.setLineWidth(0.6);
  doc.line(xFirma, yFirma, ancho - MARGEN, yFirma);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(firmado ? (firmado.firmante ?? "Médica") : "Pendiente de firma médica", xFirma + 100, yFirma + 12, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (firmado) {
    doc.text(
      `${firmado.matricula ? `Matrícula ${firmado.matricula} · ` : ""}Firmado el ${fecha(firmado.firmado_at)}`,
      xFirma + 100,
      yFirma + 24,
      { align: "center" },
    );
  } else if (ev?.matricula ?? ind?.matricula) {
    doc.text(`Matrícula ${ev?.matricula ?? ind?.matricula}`, xFirma + 100, yFirma + 24, { align: "center" });
  }

  // Pie chico: fecha de impresión y hoja.
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`Impreso el ${new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Mendoza" })}`, MARGEN, alto - 24);
    doc.text(`Hoja ${p} de ${total}`, ancho - MARGEN, alto - 24, { align: "right" });
    doc.setTextColor(0);
  }
  return doc;
}
