import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { nombreMes } from "@/lib/fechas";
import type { PlanillaTomasResidente } from "@/app/residentes/[id]/legajo/medicacion-actions";

// Planilla de tomas en papel: una hoja por residente (apaisada), un renglón por medicamento
// y horario, y una casilla por día del mes para tildar a mano.
export function generarPlanillaTomasPdf(planillas: PlanillaTomasResidente[], mes: string): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const [anio, numeroMes] = mes.split("-").map(Number);
  const cantidadDias = new Date(anio, numeroMes, 0).getDate();
  const dias = Array.from({ length: cantidadDias }, (_, i) => String(i + 1));
  const ancho = doc.internal.pageSize.getWidth();

  planillas.forEach((p, indice) => {
    if (indice > 0) doc.addPage();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PLANILLA DE ADMINISTRACIÓN DE MEDICACIÓN", ancho / 2, 36, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      [`Residente: ${p.nombre}`, p.dni && `DNI ${p.dni}`, p.habitacion && `Hab. ${p.habitacion}`]
        .filter(Boolean)
        .join("   ·   "),
      30,
      58,
    );
    doc.text(`${p.sede} · ${nombreMes(mes)}`, ancho - 30, 58, { align: "right" });

    const filas: string[][] = [];
    for (const m of p.medicamentos) {
      const detalle = [m.nombre, m.dosis, m.via].filter(Boolean).join(" · ") + (m.tipo === "sos" ? " (SOS)" : "");
      const horarios = m.horarios.length > 0 ? m.horarios : [m.tipo === "sos" ? "SOS" : ""];
      horarios.forEach((h, i) => filas.push([i === 0 ? detalle : "", h, ...dias.map(() => "")]));
    }
    // Renglones libres para indicaciones nuevas.
    for (let i = 0; i < 3; i++) filas.push(["", "", ...dias.map(() => "")]);

    autoTable(doc, {
      startY: 70,
      head: [["MEDICAMENTO", "HORA", ...dias]],
      body: filas,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2, minCellHeight: 16, valign: "middle", halign: "center", lineColor: [0, 0, 0], lineWidth: 0.4, textColor: 0 },
      headStyles: { fillColor: [235, 235, 235], textColor: 0, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 150, halign: "left", fontSize: 7.5 },
        1: { cellWidth: 34 },
        // Todas las casillas de los días del mismo ancho.
        ...Object.fromEntries(dias.map((_, i) => [i + 2, { cellWidth: (ancho - 60 - 150 - 34) / cantidadDias }])),
      },
      margin: { left: 30, right: 30 },
    });

    const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
    doc.setFontSize(8);
    doc.text("Marcar con una tilde si se administró. Si no se dio: R = rechazó, S = suspendida, y anotar el motivo al dorso.", 30, y);
    const conIndicaciones = p.medicamentos.filter((m) => m.instrucciones);
    if (conIndicaciones.length > 0) {
      doc.text(
        `Indicaciones: ${conIndicaciones.map((m) => `${m.nombre}: ${m.instrucciones}`).join(" · ")}`,
        30,
        y + 12,
        { maxWidth: ancho - 60 },
      );
    }
  });

  return doc.output("blob");
}
