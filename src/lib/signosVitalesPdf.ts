import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { avisarOmitidos, limpiarSeccionesPdf } from "@/lib/impresion";
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
// completo: planilla para completar a mano — salen todos los días y columnas, con lo cargado.
export function generarSignosVitalesPdf(
  planillas: PlanillaResidente[],
  desde: string,
  hasta: string,
  opciones?: { completo?: boolean },
): Blob {
  const completo = opciones?.completo ?? false;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const dias = diasDelPeriodo(desde, hasta);
  const periodo = desde === hasta ? fechaCorta(desde) : `del ${fechaCorta(desde)} al ${fechaCorta(hasta)}`;
  const columnas = ["FECHA", "TA", "FC", "FR", "SO2", "T°", "OBSERVACIONES"];

  // Regla de Medicina: no salen los días sin control, las columnas vacías ni los residentes sin datos.
  const omitidos: string[] = [];
  let diasSinControl = 0;
  const conDatos = planillas
    .map((p) => {
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
          r?.observaciones ?? "",
        ];
      });
      if (completo) return { p, tabla: { columnas, filas } };
      const limpio = limpiarSeccionesPdf([{ columnas, filas }]);
      const tabla = limpio.secciones[0];
      diasSinControl += filas.length - (tabla?.filas.length ?? 0);
      if (!tabla) omitidos.push(`${p.nombre}: sin controles en el período`);
      else omitidos.push(...limpio.omitidos.filter((o) => columnas.includes(o)).map((o) => `Columna "${o}" (${p.nombre})`));
      return { p, tabla };
    })
    .filter((x) => x.tabla);

  if (diasSinControl > 0) omitidos.unshift(`${diasSinControl} día${diasSinControl === 1 ? "" : "s"} sin control`);
  if (!completo) avisarOmitidos(omitidos, "PDF");

  if (conDatos.length === 0) {
    doc.setFontSize(12);
    doc.text(`Sin controles de signos vitales ${periodo}.`, 40, 60);
    return doc.output("blob");
  }

  conDatos.forEach(({ p, tabla }, indice) => {
    if (indice > 0) doc.addPage();
    const ancho = doc.internal.pageSize.getWidth();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("CONTROL DE SIGNOS VITALES", ancho / 2, 50, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`NOMBRE Y APELLIDO: ${p.nombre}`, 40, 80);
    if (p.edad !== null || completo) doc.text(`EDAD: ${p.edad ?? "______"}`, ancho - 140, 80);
    if (p.obraSocial || completo) doc.text(`OBRA SOCIAL: ${p.obraSocial ?? "______________________________"}`, 40, 98);
    doc.text(`${p.sede} · ${periodo}`, ancho - 40, 98, { align: "right" });

    const conObservaciones = tabla!.columnas.includes("OBSERVACIONES");
    autoTable(doc, {
      startY: 112,
      head: [tabla!.columnas],
      body: tabla!.filas,
      theme: "grid",
      // Para completar a mano: renglones más altos, que entre el mes en una hoja.
      styles: {
        fontSize: 9,
        cellPadding: completo ? 2.5 : 3.5,
        minCellHeight: completo ? 20 : undefined,
        valign: "middle",
        halign: "center",
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
        textColor: 0,
      },
      headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 64 },
        ...(conObservaciones
          ? { [tabla!.columnas.length - 1]: { halign: "left", cellWidth: completo ? 170 : 150 } }
          : {}),
      },
      margin: { left: 40, right: 40 },
    });
  });

  return doc.output("blob");
}
