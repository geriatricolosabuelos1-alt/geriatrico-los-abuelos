import { hoyArgentina } from "@/lib/fechas";
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

export const fechaHoyArgentina = hoyArgentina;

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

// Teléfono argentino en formato internacional para WhatsApp (549 + característica + número),
// a partir de lo que esté cargado: "261 555-1234", "0261 15 555 1234", "+54 9 261...".
// Devuelve null si no parece un número válido.
export function telefonoWhatsapp(telefono: string | null): string | null {
  if (!telefono) return null;
  let d = telefono.replace(/\D/g, "");
  if (d.startsWith("549")) return d.length >= 12 ? d : null;
  if (d.startsWith("54")) d = d.slice(2);
  d = d.replace(/^0+/, "");
  // Quitar el "15" de celular que va después de la característica (2, 3 o 4 dígitos).
  if (d.length === 12) {
    for (const largo of [2, 3, 4]) {
      if (d.slice(largo, largo + 2) === "15") {
        d = d.slice(0, largo) + d.slice(largo + 2);
        break;
      }
    }
  }
  return d.length === 10 ? `549${d}` : null;
}

// "EDITH 1" -> "Edith 1"
function nombreSede(sede: string): string {
  return sede.toLowerCase().replace(/(^|\s)\p{L}/gu, (l) => l.toUpperCase());
}

export function mensajePedidoReceta(datos: {
  contacto: string | null;
  sede: string;
  residente: string;
  medicamento: string | null;
}): string {
  const saludo = datos.contacto ? `Hola ${datos.contacto.trim()}` : "Hola";
  const que = datos.medicamento ? `la receta de ${datos.medicamento}` : "una receta";
  return `${saludo}, te escribimos de la residencia ${nombreSede(datos.sede)}. Necesitamos que nos hagas llegar ${que} para ${datos.residente}. Muchas gracias`;
}
