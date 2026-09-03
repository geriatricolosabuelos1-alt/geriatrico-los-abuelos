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
