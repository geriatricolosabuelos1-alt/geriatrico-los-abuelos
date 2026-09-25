// Fechas en hora de Argentina. El servidor (Vercel) corre en UTC: usar new Date() o
// toISOString() para "hoy" da el día siguiente a partir de las 21 hs. Argentina no tiene
// horario de verano, así que el desfase es siempre -03:00.

export const ZONA_ARGENTINA = "America/Argentina/Buenos_Aires";
const DESFASE = "-03:00";

// Fecha de hoy en Argentina, formato AAAA-MM-DD.
export function hoyArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_ARGENTINA }).format(new Date());
}

// Mes y año actuales en Argentina.
export function mesAnioArgentina(): { mes: number; anio: number } {
  const [anio, mes] = hoyArgentina().split("-").map(Number);
  return { mes, anio };
}

// Límites de un día argentino para filtrar columnas timestamptz.
export function inicioDiaArgentina(fecha: string): string {
  return `${fecha}T00:00:00${DESFASE}`;
}

export function finDiaArgentina(fecha: string): string {
  return `${fecha}T23:59:59.999${DESFASE}`;
}

// Días desde hoy (Argentina) hasta la fecha AAAA-MM-DD; negativo si ya pasó.
export function diasHastaFecha(fecha: string): number {
  const utc = (f: string) => {
    const [a, m, d] = f.split("-").map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((utc(fecha) - utc(hoyArgentina())) / 86_400_000);
}
