export type ResidenteOcupacion = {
  fecha_ingreso: string | null;
  fecha_egreso: string | null;
  activo: boolean;
};

export const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export function estuvoActivoEnMes(
  r: ResidenteOcupacion,
  inicioMes: Date,
  finMes: Date,
): boolean {
  const ingreso = r.fecha_ingreso ? new Date(r.fecha_ingreso + "T00:00:00") : null;
  const egreso = r.fecha_egreso ? new Date(r.fecha_egreso + "T00:00:00") : null;

  // Sin fecha de ingreso cargada (legajo incompleto): no podemos saber
  // desde cuando ocupa la cama, asi que se toma el estado "activo" actual
  // como mejor estimacion disponible para todo el rango del grafico.
  if (!ingreso) return r.activo;

  if (ingreso > finMes) return false;
  if (egreso && egreso < inicioMes) return false;
  return true;
}

export type MesOcupacion = { label: string; ocupadas: number };

export function calcularOcupacionPorMes(
  residentes: ResidenteOcupacion[],
  meses = 9,
): MesOcupacion[] {
  const ahora = new Date();
  return Array.from({ length: meses }).map((_, i) => {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - (meses - 1 - i), 1);
    const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
    const ocupadas = residentes.filter((r) => estuvoActivoEnMes(r, inicioMes, finMes)).length;
    return { label: MESES_CORTOS[fecha.getMonth()], ocupadas };
  });
}
