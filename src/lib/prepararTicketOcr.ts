const ANCHO_MAXIMO = 1600;

async function pdfComoCanvas(archivoPdf: File): Promise<HTMLCanvasElement> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const buffer = await archivoPdf.arrayBuffer();
  const documento = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pagina = await documento.getPage(1);
  const viewportBase = pagina.getViewport({ scale: 1 });
  const escala = Math.min(2, ANCHO_MAXIMO / viewportBase.width);
  const viewport = pagina.getViewport({ scale: escala });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("No se pudo preparar el PDF.");

  await pagina.render({ canvas, canvasContext: contexto, viewport }).promise;
  return canvas;
}

async function imagenComoCanvasRedimensionado(archivo: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, ANCHO_MAXIMO / bitmap.width);
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("No se pudo preparar la imagen.");

  contexto.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();
  return canvas;
}

export async function prepararTicketParaOcr(archivo: File): Promise<HTMLCanvasElement> {
  return archivo.type === "application/pdf"
    ? pdfComoCanvas(archivo)
    : imagenComoCanvasRedimensionado(archivo);
}
