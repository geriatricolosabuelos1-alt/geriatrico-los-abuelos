import type { Insumo } from "@/lib/types";

export interface ItemDetectado {
  insumoId: string;
  nombre: string;
  cantidad: number;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function extraerCantidad(linea: string): number {
  const match = linea.match(/(\d+)\s*(?:x|un|u\.|kg|unid)/i) ?? linea.match(/\b(\d{1,3})\b/);
  if (!match) return 1;
  const numero = Number(match[1]);
  return numero > 0 && numero < 1000 ? numero : 1;
}

function normalizarMonto(crudo: string): number | null {
  let limpio = crudo.replace(/[^\d.,]/g, "");
  if (!limpio) return null;

  const tieneComa = limpio.includes(",");
  const tienePunto = limpio.includes(".");

  if (tieneComa && tienePunto) {
    const separadorDecimal = limpio.lastIndexOf(",") > limpio.lastIndexOf(".") ? "," : ".";
    const separadorMiles = separadorDecimal === "," ? "." : ",";
    limpio = limpio.split(separadorMiles).join("").replace(separadorDecimal, ".");
  } else if (tieneComa) {
    limpio = limpio.replace(",", ".");
  } else if (tienePunto) {
    const partes = limpio.split(".");
    if (partes.length > 2 || partes[partes.length - 1].length === 3) {
      limpio = limpio.replace(/\./g, "");
    }
  }

  const numero = Number(limpio);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

export function extraerTotal(textoOcr: string): number | null {
  const lineas = textoOcr.split("\n").map((l) => l.trim()).filter(Boolean);
  const candidatos: number[] = [];

  for (const linea of lineas) {
    if (!/total/i.test(linea) || /sub\s*total/i.test(linea)) continue;
    const numeros = linea.match(/[\d][\d.,]*\d|\d/g) ?? [];
    for (const n of numeros) {
      const valor = normalizarMonto(n);
      if (valor !== null) candidatos.push(valor);
    }
  }

  if (candidatos.length === 0) return null;
  return Math.max(...candidatos);
}

export function detectarItems(textoOcr: string, insumos: Insumo[]): ItemDetectado[] {
  const lineas = textoOcr.split("\n").map((l) => l.trim()).filter(Boolean);
  const insumosOrdenados = [...insumos].sort((a, b) => b.nombre.length - a.nombre.length);
  const detectados = new Map<string, ItemDetectado>();

  for (const linea of lineas) {
    const lineaNormalizada = normalizar(linea);
    for (const insumo of insumosOrdenados) {
      const nombreNormalizado = normalizar(insumo.nombre);
      if (lineaNormalizada.includes(nombreNormalizado) && !detectados.has(insumo.id)) {
        detectados.set(insumo.id, {
          insumoId: insumo.id,
          nombre: insumo.nombre,
          cantidad: extraerCantidad(linea),
        });
        break;
      }
    }
  }

  return Array.from(detectados.values());
}
