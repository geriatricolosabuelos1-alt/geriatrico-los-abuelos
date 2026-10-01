import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { PlanillaResidente } from "@/app/sucursales/[id]/enfermeria/actions";

function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

// Todos los días entre desde y hasta (AAAA-MM-DD), inclusive.
function diasDelPeriodo(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  const actual = new Date(desde + "T12:00:00Z");
  const fin = new Date(hasta + "T12:00:00Z");
  while (actual <= fin) {
    dias.push(actual.toISOString().slice(0, 10));
    actual.setUTCDate(actual.getUTCDate() + 1);
  }
  return dias;
}

// Planilla "Control de signos vitales" de un período: cada residente empieza en hoja nueva,
// un renglón por día (si el período es largo, la tabla sigue en las hojas siguientes).
export function generarSignosVitalesPdf(planillas: PlanillaResidente[], desde: string, hasta: string): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const dias = diasDelPeriodo(desde, hasta);
  const periodo = desde === hasta ? fechaCorta(desde) : `del ${fechaCorta(desde)} al ${fechaCorta(hasta)}`;

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
    doc.text(`${p.sede} · ${periodo}`, ancho - 40, 98, { align: "right" });

    const porFecha = new Map(p.registros.map((r) => [r.fecha, r]));
    const filas = dias.map((d) => {
      const r = porFecha.get(d);
      return [
        fechaCorta(d),
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
      columnStyles: { 0: { cellWidth: 72 } },
      margin: { left: 40, right: 40 },
    });
  });

  return doc.output("blob");
}
