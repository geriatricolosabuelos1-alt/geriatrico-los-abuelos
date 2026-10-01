import { avisarOmitidos, esVacioOCero } from "@/lib/impresion";

function textoDe(el: Element): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

function tieneControles(el: Element): boolean {
  return !!el.querySelector("input, select, textarea, img, svg, canvas, button, a");
}

// Imprime la página sin lo que está vacío o en 0: columnas y filas de tablas, campos
// marcados con data-campo y secciones marcadas con data-seccion. Avisa antes qué se omite.
export function imprimirSinVacios(): void {
  const raiz = document.querySelector("main") ?? document.body;
  const marcados: { el: Element; clase: string }[] = [];
  const omitidos: string[] = [];
  let celdasEnBlanco = 0;

  const marcar = (el: Element, clase: "omitir-impresion" | "vaciar-impresion") => {
    if (el.classList.contains(clase)) return;
    el.classList.add(clase);
    marcados.push({ el, clase });
  };

  // 1) Secciones sin contenido ("Sin registros").
  raiz.querySelectorAll("[data-seccion]").forEach((sec) => {
    const titulo = sec.getAttribute("data-seccion") ?? "";
    const cuerpo = [...sec.children].filter((h) => !/^H[1-6]$/.test(h.tagName));
    if (cuerpo.length > 0 && cuerpo.every((c) => esVacioOCero(textoDe(c)) && !c.querySelector("img"))) {
      marcar(sec, "omitir-impresion");
      omitidos.push(titulo);
    }
  });

  // 2) Campos "etiqueta: valor".
  raiz.querySelectorAll("[data-campo]").forEach((campo) => {
    const valor = campo.querySelector("[data-valor]");
    if (valor && esVacioOCero(textoDe(valor))) {
      marcar(campo, "omitir-impresion");
      omitidos.push(campo.getAttribute("data-campo") ?? "");
    }
  });

  // 3) Tablas.
  raiz.querySelectorAll("table").forEach((tabla) => {
    if (tabla.closest(".omitir-impresion")) return;
    const filas = [...tabla.querySelectorAll("tbody tr")].filter((f) => ![...f.children].some((c) => (c as HTMLTableCellElement).colSpan > 1));
    if (filas.length === 0) return;
    const encabezado = tabla.querySelector("thead tr");
    const titulos = encabezado ? [...encabezado.children].map(textoDe) : [];
    const nCols = filas[0].children.length;
    const columnasParejas = filas.every((f) => f.children.length === nCols) && (!encabezado || encabezado.children.length === nCols);

    if (columnasParejas) {
      for (let c = 0; c < nCols; c++) {
        const celdas = filas.map((f) => f.children[c]);
        if (celdas.every((td) => esVacioOCero(textoDe(td)) && !tieneControles(td))) {
          celdas.forEach((td) => marcar(td, "omitir-impresion"));
          if (encabezado) marcar(encabezado.children[c], "omitir-impresion");
          if (titulos[c]) omitidos.push(`Columna "${titulos[c]}"`);
        }
      }
    }

    filas.forEach((f) => {
      const celdas = [...f.children];
      const resto = celdas.slice(1).filter((td) => !td.classList.contains("omitir-impresion"));
      if (celdas.length > 1 && resto.length > 0 && resto.every((td) => esVacioOCero(textoDe(td)) && !tieneControles(td))) {
        marcar(f, "omitir-impresion");
        omitidos.push(textoDe(celdas[0]));
        return;
      }
      celdas.forEach((td) => {
        const t = textoDe(td);
        if (t !== "" && esVacioOCero(t) && !tieneControles(td) && !td.classList.contains("omitir-impresion")) {
          marcar(td, "vaciar-impresion");
          celdasEnBlanco++;
        }
      });
    });
  });

  if (celdasEnBlanco > 0) omitidos.push(`${celdasEnBlanco} casillero${celdasEnBlanco === 1 ? "" : "s"} con "—" o 0 (salen en blanco)`);
  avisarOmitidos(omitidos.filter(Boolean), "imprimir");

  const restaurar = () => marcados.forEach(({ el, clase }) => el.classList.remove(clase));
  window.addEventListener("afterprint", restaurar, { once: true });
  window.print();
}
