import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { crearPdfTablas, type SeccionPdf } from "@/lib/pdf";
import type { DatosCarpeta, ItemCarpeta } from "@/app/sucursales/[id]/legales/carpeta-actions";

// A4 en puntos
const ANCHO = 595.28;
const ALTO = 841.89;
const MARGEN = 40;

// La fuente estándar del PDF solo admite caracteres latinos (WinAnsi): se reemplaza el resto.
function limpiar(texto: string): string {
  return texto
    .normalize("NFC")
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]/g, "?");
}

function fecha(valor: string | null): string {
  return valor ? new Date(valor + "T00:00:00").toLocaleDateString("es-AR") : "—";
}

function estadoVencimiento(valor: string | null): string {
  if (!valor) return "—";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Math.ceil((new Date(valor + "T00:00:00").getTime() - hoy.getTime()) / 86_400_000);
  if (dias < 0) return "VENCIDO";
  if (dias <= 30) return `Vence en ${dias} días`;
  return "Vigente";
}

// Resumen (índice) de la carpeta, armado con jsPDF.
function crearResumen(datos: DatosCarpeta, conArchivo: Set<ItemCarpeta>): ArrayBuffer {
  const presentados = datos.items.filter((i) => i.presentado).length;
  const secciones: SeccionPdf[] = [
    {
      titulo: `1. Habilitación (${presentados} de ${datos.items.length} ítems presentados)`,
      columnas: ["Categoría", "Requisito", "Estado", "Presentado", "Documento"],
      filas: datos.items.map((i) => [
        i.categoria,
        i.descripcion,
        i.presentado ? "Presentado" : "PENDIENTE",
        fecha(i.fechaPresentacion),
        i.nombreArchivo
          ? conArchivo.has(i)
            ? `Adjunto más adelante (${i.nombreArchivo})`
            : `En otro formato, no incluido (${i.nombreArchivo})`
          : (i.notas ?? "—"),
      ]),
    },
    {
      titulo: "2. Contratos con proveedores de salud",
      columnas: ["Proveedor", "Tipo", "Contacto", "Vencimiento", "Estado"],
      filas: datos.contratos.length
        ? datos.contratos.map((c) => [c.proveedor, c.tipo, c.contacto ?? "—", fecha(c.vencimiento), estadoVencimiento(c.vencimiento)])
        : [["Sin contratos registrados", "", "", "", ""]],
    },
    {
      titulo: "3. Libretas sanitarias del personal",
      columnas: ["Empleado", "DNI", "N° libreta", "Emitida por", "Vigente hasta", "Estado"],
      filas: datos.libretas.length
        ? datos.libretas.map((l) => [
            l.empleado,
            l.dni ?? "—",
            l.numero ?? "—",
            l.emisor ?? "—",
            fecha(l.vence),
            l.vence ? estadoVencimiento(l.vence) : "SIN LIBRETA",
          ])
        : [["Sin empleados activos", "", "", "", "", ""]],
    },
    {
      titulo: "4. Retiro de residuos patogénicos",
      columnas: ["Fecha", "Empresa transportista", "Kg", "N° manifiesto"],
      filas: datos.residuos.length
        ? datos.residuos.map((r) => [fecha(r.fecha), r.empresa, r.kg ?? "—", r.manifiesto ?? "—"])
        : [["Sin retiros registrados", "", "", ""]],
    },
    {
      titulo: `5. Servicio de emergencias ${datos.anio}`,
      columnas: ["Prestador", "Llamadas", "Satisfactorias", "No satisfactorias"],
      filas: datos.emergencias.length
        ? datos.emergencias.map((e) => [e.prestador, e.total, e.si, e.no])
        : [[`Sin llamadas registradas en ${datos.anio}`, "", "", ""]],
    },
  ];

  const doc = crearPdfTablas(
    {
      titulo: `Documentación legal · Residencia ${datos.sede}`,
      subtitulo: datos.direccion ?? undefined,
      fecha: `Emitido el ${new Date().toLocaleDateString("es-AR")}`,
    },
    secciones,
  );
  return doc.output("arraybuffer");
}

// Corta un texto en líneas que entren en el ancho indicado.
function partirTexto(texto: string, fuente: PDFFont, tamano: number, ancho: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (fuente.widthOfTextAtSize(prueba, tamano) > ancho && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function agregarSeparador(pdf: PDFDocument, fuente: PDFFont, negrita: PDFFont, item: ItemCarpeta, aviso?: string) {
  const pagina = pdf.addPage([ANCHO, ALTO]);
  let y = ALTO / 2 + 60;
  pagina.drawText(limpiar(item.categoria.toUpperCase()), { x: MARGEN, y, size: 10, font: fuente, color: rgb(0.45, 0.45, 0.45) });
  y -= 28;
  for (const linea of partirTexto(limpiar(item.descripcion), negrita, 18, ANCHO - MARGEN * 2)) {
    pagina.drawText(linea, { x: MARGEN, y, size: 18, font: negrita });
    y -= 24;
  }
  y -= 6;
  const detalle = [
    item.fechaPresentacion && `Presentado el ${fecha(item.fechaPresentacion)}`,
    item.nombreArchivo && `Archivo: ${item.nombreArchivo}`,
  ]
    .filter(Boolean)
    .join(" · ");
  if (detalle) pagina.drawText(limpiar(detalle), { x: MARGEN, y, size: 10, font: fuente, color: rgb(0.3, 0.3, 0.3) });
  if (aviso) {
    y -= 22;
    for (const linea of partirTexto(aviso, fuente, 10, ANCHO - MARGEN * 2)) {
      pagina.drawText(linea, { x: MARGEN, y, size: 10, font: fuente, color: rgb(0.7, 0.1, 0.1) });
      y -= 14;
    }
  }
}

// Convierte cualquier imagen que el navegador pueda mostrar a PNG (pdf-lib solo acepta PNG/JPG).
async function imagenAPng(blob: Blob): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  bitmap.close();
  const png: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("imagen"))), "image/png"),
  );
  return new Uint8Array(await png.arrayBuffer());
}

function agregarImagenEnPagina(pagina: PDFPage, imagen: Awaited<ReturnType<PDFDocument["embedPng"]>>) {
  const maxAncho = ANCHO - MARGEN * 2;
  const maxAlto = ALTO - MARGEN * 2 - 20;
  const escala = Math.min(maxAncho / imagen.width, maxAlto / imagen.height, 1);
  const w = imagen.width * escala;
  const h = imagen.height * escala;
  pagina.drawImage(imagen, { x: (ANCHO - w) / 2, y: (ALTO - h) / 2 + 10, width: w, height: h });
}

function tipoArchivo(nombre: string | null, contentType: string): "pdf" | "imagen" | "otro" {
  const ext = (nombre ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (contentType.includes("pdf") || ext === "pdf") return "pdf";
  if (contentType.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif", "bmp", "heic"].includes(ext)) {
    return "imagen";
  }
  return "otro";
}

function esTipoIncluible(nombre: string | null): boolean {
  const ext = (nombre ?? "").split(".").pop()?.toLowerCase() ?? "";
  return ["pdf", "jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext);
}

// Arma un único PDF: resumen + separador y documento de cada ítem de habilitación, todo foliado.
export async function generarCarpetaLegalesPdf(
  datos: DatosCarpeta,
  onProgreso?: (texto: string) => void,
): Promise<Blob> {
  const conArchivo = new Set(datos.items.filter((i) => i.urlArchivo && esTipoIncluible(i.nombreArchivo)));

  const pdf = await PDFDocument.create();
  const fuente = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);

  onProgreso?.("Armando el resumen...");
  const resumen = await PDFDocument.load(crearResumen(datos, conArchivo));
  for (const p of await pdf.copyPages(resumen, resumen.getPageIndices())) pdf.addPage(p);

  const conDocumento = datos.items.filter((i) => i.urlArchivo);
  let n = 0;
  for (const item of conDocumento) {
    n++;
    onProgreso?.(`Agregando documento ${n} de ${conDocumento.length}...`);

    try {
      const respuesta = await fetch(item.urlArchivo!);
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      const blob = await respuesta.blob();
      const tipo = tipoArchivo(item.nombreArchivo, blob.type);

      if (tipo === "pdf") {
        const origen = await PDFDocument.load(await blob.arrayBuffer(), { ignoreEncryption: true });
        agregarSeparador(pdf, fuente, negrita, item);
        for (const p of await pdf.copyPages(origen, origen.getPageIndices())) pdf.addPage(p);
      } else if (tipo === "imagen") {
        const imagen = await pdf.embedPng(await imagenAPng(blob));
        agregarSeparador(pdf, fuente, negrita, item);
        agregarImagenEnPagina(pdf.addPage([ANCHO, ALTO]), imagen);
      } else {
        agregarSeparador(
          pdf,
          fuente,
          negrita,
          item,
          "Este archivo está en otro formato (Word, Excel, etc.) y no se puede incluir en el PDF. Consultarlo desde el sistema.",
        );
      }
    } catch {
      agregarSeparador(
        pdf,
        fuente,
        negrita,
        item,
        "No se pudo incluir este archivo (puede estar dañado o protegido). Consultarlo desde el sistema.",
      );
    }
  }

  // Foliado en todas las hojas
  onProgreso?.("Foliando...");
  const paginas = pdf.getPages();
  paginas.forEach((pagina, i) => {
    const { width } = pagina.getSize();
    const texto = `Folio ${i + 1} de ${paginas.length}`;
    pagina.drawText(limpiar(`Documentación legal · ${datos.sede}`), { x: MARGEN, y: 18, size: 8, font: fuente, color: rgb(0.4, 0.4, 0.4) });
    pagina.drawText(texto, { x: width - MARGEN - negrita.widthOfTextAtSize(texto, 9), y: 18, size: 9, font: negrita });
  });

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
