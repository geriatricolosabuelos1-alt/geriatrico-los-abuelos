import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { nombreMes } from "@/lib/fechas";
import type { PlanillaResidente } from "@/app/sucursales/[id]/enfermeria/actions";

// Planilla "Control de signos vitales" del mes: una hoja por residente, un renglón por día.
export function generarSignosVitalesPdf(planillas: PlanillaResidente[], mes: string): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const [anio, numMes] = mes.split("-").map(Number);
  const dias = new Date(anio, numMes, 0).getDate();

  planillas.forEach((p, indice) => {
    if (indice > 0) doc.addPage();
    const ancho = doc.internal.pageSize.getWidth();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("CONTROL DE SIGNOS VITALES", ancho / 2, 50, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`NOMBRE Y APELLIDO: ${p.nombre}`, 40, 80);
    doc.text(`EDAD: ${p.edad ?? "—"}`, ancho - 140, 80);
    doc.text(`OBRA SOCIAL: ${p.obraSocial ?? "—"}`, 40, 98);
    doc.text(`${p.sede} · ${nombreMes(mes)}`, ancho - 40, 98, { align: "right" });

    const porFecha = new Map(p.registros.map((r) => [r.fecha, r]));
    const filas = Array.from({ length: dias }, (_, i) => {
      const dia = String(i + 1).padStart(2, "0");
      const r = porFecha.get(`${mes}-${dia}`);
      return [
        `${dia}-${String(numMes).padStart(2, "0")}`,
        r?.tension_arterial ?? "",
        r?.frecuencia_cardiaca ?? "",
        r?.frecuencia_respiratoria ?? "",
        r?.saturacion_o2 != null ? `${r.saturacion_o2}%` : "",
        r?.temperatura != null ? `${r.temperatura}°` : "",
      ];
    });

    autoTable(doc, {
      startY: 112,
      head: [["FECHA", "TA", "FC", "FR", "SO2", "T°"]],
      body: filas,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3.5, halign: "center", lineColor: [0, 0, 0], lineWidth: 0.5, textColor: 0 },
      headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 60 } },
      margin: { left: 40, right: 40 },
    });
  });

  return doc.output("blob");
}
