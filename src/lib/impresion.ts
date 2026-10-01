import type { SeccionPdf } from "@/lib/pdf";

// Regla de impresión de Medicina: lo vacío o en 0 no se imprime, y antes se avisa qué se omite.

const VACIO =
  /^\s*(—|–|-|0|0[.,]0+|\$\s*0([.,]0+)?|0\s*%|0\s*(hs|min|mg|ml|kg|unid\.?|unidades|años)|sin registros\.?|sin archivos cargados\.?)?\s*$/i;

export function esVacioOCero(valor: string | number | null | undefined): boolean {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === "number") return valor === 0;
  return VACIO.test(valor);
}

export function avisarOmitidos(omitidos: string[], destino: "imprimir" | "PDF"): void {
  if (omitidos.length === 0) return;
  const unicos = [...new Set(omitidos)];
  const lista = unicos.slice(0, 15).map((o) => `• ${o}`).join("\n");
  const resto = unicos.length > 15 ? `\n…y ${unicos.length - 15} más` : "";
  window.alert(
    `Estos campos están vacíos o en 0 y no van a salir ${destino === "PDF" ? "en el PDF" : "en la impresión"}:\n\n${lista}${resto}`,
  );
}

// PDF (jsPDF): saca columnas y filas vacías o en 0, y deja en blanco las celdas sueltas en 0.
export function limpiarSeccionesPdf(secciones: SeccionPdf[]): { secciones: SeccionPdf[]; omitidos: string[] } {
  const omitidos: string[] = [];
  const limpias: SeccionPdf[] = [];

  for (const s of secciones) {
    const prefijo = s.titulo ? `${s.titulo}: ` : "";
    const columnasVacias = new Set<number>();
    s.columnas.forEach((col, i) => {
      if (s.filas.length > 0 && s.filas.every((f) => esVacioOCero(f[i]))) {
        columnasVacias.add(i);
        if (col) omitidos.push(`${prefijo}${col}`);
      }
    });

    // Si solo queda la columna de etiquetas (fechas, nombres), la sección no tiene datos.
    if (s.columnas.length > 1 && columnasVacias.size === s.columnas.length - 1 && !columnasVacias.has(0)) {
      if (s.titulo) omitidos.push(s.titulo);
      continue;
    }
    const columnas = s.columnas.filter((_, i) => !columnasVacias.has(i));
    let filas = s.filas.map((f) => f.filter((_, i) => !columnasVacias.has(i)));

    // Filas con etiqueta en la primera columna y todo lo demás vacío.
    if (columnas.length > 1) {
      filas = filas.filter((f) => {
        const vacia = f.slice(1).every((v) => esVacioOCero(v));
        if (vacia) omitidos.push(`${prefijo}${String(f[0] ?? "")}`.trim());
        return !vacia;
      });
    }
    filas = filas.map((f) => f.map((v) => (esVacioOCero(v) ? "" : v)));

    if (columnas.length === 0 || filas.length === 0) {
      if (s.titulo) omitidos.push(s.titulo);
      continue;
    }
    limpias.push({ ...s, columnas, filas });
  }
  return { secciones: limpias, omitidos: omitidos.filter(Boolean) };
}
