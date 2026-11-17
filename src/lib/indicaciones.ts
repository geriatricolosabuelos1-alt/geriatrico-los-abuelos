import type { ItemIndicacionMedica, MedicamentoResidente } from "@/lib/types";

// "0.5" -> "1/2", "1.5" -> "1 1/2" (cantidad de comprimidos por toma).
function fraccion(valor: number): string {
  const entero = Math.floor(valor);
  const resto = Math.round((valor - entero) * 100) / 100;
  const fr = resto === 0.25 ? "1/4" : resto === 0.5 ? "1/2" : resto === 0.75 ? "3/4" : resto ? String(resto) : "";
  if (!fr) return String(entero);
  return entero ? `${entero} ${fr}` : fr;
}

// Cuadro de indicaciones a partir de la medicación activa del residente (lo que la médica
// revisó en el kardex), para no cargarlo de a uno. Los horarios se ubican en la columna
// más cercana de la planilla: mañana (8 hs), mediodía (12 hs) o noche (20 hs).
export function itemsDesdeKardex(medicamentos: MedicamentoResidente[]): ItemIndicacionMedica[] {
  return medicamentos
    .filter((m) => m.activo && (m.horarios?.length || m.horario || m.dosis_diaria))
    .map((m) => {
      const horarios = m.horarios?.length ? m.horarios : m.horario ? [m.horario] : [];
      const horas = horarios.map((h) => Number(h.split(":")[0])).filter((h) => !Number.isNaN(h));
      const porToma = m.dosis_diaria && horas.length ? m.dosis_diaria / horas.length : m.dosis_diaria;
      const mg = m.dosis?.match(/^\s*([\d.,]+)\s*mg\s*$/i)?.[1] ?? m.dosis ?? "";
      return {
        medicacion: m.nombre,
        mg,
        cantidad: porToma ? fraccion(Number(porToma)) : "",
        h8: horas.some((h) => h < 10),
        h12: horas.some((h) => h >= 10 && h < 16),
        h20: horas.some((h) => h >= 16),
      };
    });
}
