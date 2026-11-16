// Facturación de servicios externos (Factura C con el CUIT de la sede a terceros).

export type TipoDocExterno = "cuit" | "cuil" | "dni";

// Códigos de tipo de documento de ARCA.
export const DOC_TIPO_ARCA: Record<TipoDocExterno, number> = {
  cuit: 80,
  cuil: 86,
  dni: 96,
};

// Códigos de ARCA para la condición frente al IVA del receptor.
export const CONDICION_IVA_RECEPTOR: Record<number, string> = {
  1: "Responsable Inscripto",
  4: "Exento",
  5: "Consumidor Final",
  6: "Monotributo",
};

export const ETIQUETA_CONDICION_VENTA: Record<string, string> = {
  contado: "Contado",
  cuenta_corriente: "Cuenta corriente",
};

export const ETIQUETA_MEDIO_PAGO: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mercado_pago: "Mercado Pago",
};

export type FacturaExterna = {
  id: string;
  sucursal_id: string;
  receptor_nombre: string;
  doc_tipo: number;
  doc_nro: string;
  condicion_iva_receptor_id: number;
  tipo_cbte: number;
  pto_vta: number;
  cbte_nro: number;
  cae: string;
  cae_vencimiento: string;
  importe: number;
  fecha_emision: string;
  periodo_desde: string;
  periodo_hasta: string;
  detalle: { descripcion: string; importe: number }[];
  condicion_venta: string | null;
  medio_pago: string | null;
  created_at: string;
};

export function documentoReceptor(docTipo: number, docNro: string): string {
  const n = docNro.replace(/\D/g, "");
  if (docTipo === 96) return `DNI ${docNro}`;
  if (docTipo === 80 || docTipo === 86) {
    const etiqueta = docTipo === 80 ? "CUIT" : "CUIL";
    return n.length === 11 ? `${etiqueta} ${n.slice(0, 2)}-${n.slice(2, 10)}-${n.slice(10)}` : `${etiqueta} ${docNro}`;
  }
  return "Consumidor Final";
}

export function numeroFacturaC(ptoVta: number, cbteNro: number): string {
  return `C ${String(ptoVta).padStart(5, "0")}-${String(cbteNro).padStart(8, "0")}`;
}

// Dígito verificador de CUIT/CUIL (módulo 11).
export function cuitValido(valor: string): boolean {
  const n = valor.replace(/\D/g, "");
  if (n.length !== 11) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acc, p, i) => acc + p * Number(n[i]), 0);
  const resto = 11 - (suma % 11);
  const verificador = resto === 11 ? 0 : resto === 10 ? 9 : resto;
  return verificador === Number(n[10]);
}
