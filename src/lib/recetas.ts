import type { RecetaMedicamento } from "@/lib/types";

// Días que puede estar una receta pedida sin recibirse antes de avisar.
export const DIAS_AVISO_PEDIDA = 7;
// Días antes del vencimiento de la receta en que se avisa.
export const DIAS_AVISO_VENCIMIENTO = 5;

export type AlertasRecetas = {
  paraPedir: number;
  pedidasDemoradas: number;
  porVencer: number;
  total: number;
};

export function fechaHoyArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

function diasEntre(desde: string, hasta: string): number {
  return Math.round(
    (new Date(hasta + "T00:00:00").getTime() - new Date(desde + "T00:00:00").getTime()) / 86_400_000,
  );
}

export function calcularAlertasRecetas(
  recetas: Pick<RecetaMedicamento, "estado" | "fecha_pedido" | "fecha_vencimiento">[],
): AlertasRecetas {
  const hoy = fechaHoyArgentina();
  let paraPedir = 0;
  let pedidasDemoradas = 0;
  let porVencer = 0;

  for (const r of recetas) {
    if (r.estado === "recibida") continue;
    if (r.estado === "pendiente_pedir") paraPedir++;
    if (r.estado === "pedida" && r.fecha_pedido && diasEntre(r.fecha_pedido, hoy) > DIAS_AVISO_PEDIDA) {
      pedidasDemoradas++;
    }
    if (r.fecha_vencimiento && diasEntre(hoy, r.fecha_vencimiento) <= DIAS_AVISO_VENCIMIENTO) porVencer++;
  }

  return { paraPedir, pedidasDemoradas, porVencer, total: paraPedir + pedidasDemoradas + porVencer };
}
