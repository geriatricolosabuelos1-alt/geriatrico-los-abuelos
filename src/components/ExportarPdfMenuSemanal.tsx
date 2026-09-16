"use client";

import { descargarPdf, type SeccionPdf } from "@/lib/pdf";
import type { MenuSemanal } from "@/lib/types";

const DIAS: { valor: string; label: string }[] = [
  { valor: "lunes", label: "Lunes" },
  { valor: "martes", label: "Martes" },
  { valor: "miercoles", label: "Miércoles" },
  { valor: "jueves", label: "Jueves" },
  { valor: "viernes", label: "Viernes" },
  { valor: "sabado", label: "Sábado" },
  { valor: "domingo", label: "Domingo" },
];

function seccionDesde(titulo: string, bloque: Record<string, string>): [string, ...string[]][] {
  return [[titulo, ...DIAS.map((d) => bloque?.[d.valor] || "—")]];
}

type Props = { menu: MenuSemanal; sucursalNombre: string };

export function ExportarPdfMenuSemanal({ menu, sucursalNombre }: Props) {
  function exportar() {
    const columnas = ["", ...DIAS.map((d) => d.label)];
    const filas: (string | number)[][] = [
      ...seccionDesde("Desayuno", menu.contenido.desayunos),
      ...seccionDesde("Merienda", menu.contenido.meriendas),
      ...seccionDesde("Almuerzo", menu.contenido.almuerzos),
      ...seccionDesde("Colación", menu.contenido.colaciones),
      ...seccionDesde("Cena", menu.contenido.cenas),
      ...seccionDesde("Post. almuerzo", menu.contenido.postres_almuerzo),
      ...seccionDesde("Post. cena", menu.contenido.postres_cena),
    ];

    const secciones: SeccionPdf[] = [
      { columnas, filas },
      {
        titulo: "Pacientes con dietas especiales",
        columnas: ["SNG", "Vegetarianos", "Celíacos", "Diabéticos"],
        filas: [[menu.pacientes_sng, menu.pacientes_vegetarianos, menu.pacientes_celiacos, menu.pacientes_diabeticos]],
      },
    ];

    if (menu.observaciones || menu.matricula) {
      secciones.push({
        titulo: "Observaciones y firma",
        columnas: ["Observaciones", "Matrícula"],
        filas: [[menu.observaciones ?? "—", menu.matricula ?? "—"]],
      });
    }

    descargarPdf(
      `menu-semanal-${menu.semana_desde}-al-${menu.semana_hasta}.pdf`,
      {
        titulo: "Menú semanal",
        subtitulo: sucursalNombre,
        fecha: `Semana desde ${new Date(menu.semana_desde + "T00:00:00").toLocaleDateString("es-AR")} al ${new Date(menu.semana_hasta + "T00:00:00").toLocaleDateString("es-AR")}`,
      },
      secciones,
    );
  }

  return (
    <button
      type="button"
      onClick={exportar}
      className="rounded-full border border-brass/40 px-4 py-1.5 text-xs font-semibold text-brass hover:bg-brass-soft"
    >
      Descargar PDF
    </button>
  );
}
