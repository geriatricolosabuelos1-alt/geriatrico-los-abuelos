export type RolUsuario =
  | "admin"
  | "enfermero"
  | "cuidador"
  | "medico"
  | "nutricionista"
  | "kinesiologo"
  | "administrativo";

export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string | null;
  capacidad_camas: number | null;
}

export interface Perfil {
  id: string;
  nombre_completo: string;
  rol: RolUsuario;
  sucursal_id: string | null;
  activo: boolean;
}

export type NivelCuidado = "autovalido" | "asistido" | "dependiente";

export interface Residente {
  id: string;
  sucursal_id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  dni: string | null;
  nacionalidad: string | null;
  fecha_ingreso: string | null;
  fecha_egreso: string | null;
  habitacion: string | null;
  contacto_familiar: string | null;
  telefono_familiar: string | null;
  observaciones_medicas: string | null;
  foto_url: string | null;
  activo: boolean;
  nivel_cuidado: NivelCuidado | null;
}

export interface FichaAdministrativa {
  residente_id: string;
  obra_social: string | null;
  numero_afiliado: string | null;
  tipo_cobertura: string | null;
  cuota_mensual: number | null;
  notas_contrato: string | null;
  fecha_vencimiento_cuota: string | null;
  mecanismo_actualizacion: string | null;
  cud_vencimiento: string | null;
  monto_cobertura_obra_social: number | null;
  porcentaje_recargo_mora: number | null;
  contratante_nombre: string | null;
  contratante_dni: string | null;
  contratante_domicilio: string | null;
}

export type TipoDocumentoResidente =
  | "orden_internacion"
  | "cud"
  | "nota_derivacion"
  | "contrato";

export interface DocumentoResidente {
  id: string;
  residente_id: string;
  tipo: TipoDocumentoResidente;
  nombre_archivo: string;
  url: string;
  created_at: string;
}

export interface MedicamentoResidente {
  id: string;
  residente_id: string;
  nombre: string;
  dosis: string | null;
  cantidad_stock: number;
  notas: string | null;
  updated_at: string;
}

export interface DosisAdministrada {
  id: string;
  medicamento_id: string;
  residente_id: string;
  cantidad: number;
  administrado_por: string | null;
  fecha: string;
}

export interface FichaMedica {
  residente_id: string;
  medico_cabecera: string | null;
  medico_emergencia: string | null;
  telefono_emergencia_medica: string | null;
  grupo_sanguineo: string | null;
  alergias: string | null;
  diagnosticos: string | null;
}

export type TipoNotaEvolucion = "medica" | "enfermeria" | "nutricion" | "kinesiologia";

export interface NotaEvolucion {
  id: string;
  residente_id: string;
  autor_id: string;
  tipo: TipoNotaEvolucion;
  contenido: string;
  fecha: string;
}

export type TipoContratacion = "monotributo" | "relacion_dependencia";
export type FormaPago = "efectivo" | "transferencia";

export interface Empleado {
  id: string;
  sucursal_id: string;
  perfil_id: string | null;
  nombre_completo: string;
  dni: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  tipo_contratacion: TipoContratacion | null;
  forma_pago: FormaPago | null;
  turno: string | null;
  sueldo: number | null;
  activo: boolean;
}

export type TipoGasto = "fijo" | "variable";

export interface Gasto {
  id: string;
  sucursal_id: string;
  categoria: string;
  monto: number;
  mes: number;
  anio: number;
  descripcion: string | null;
  tipo: TipoGasto;
  fecha: string;
  gasto_fijo_id: string | null;
}

export interface GastoFijoCatalogo {
  id: string;
  nombre: string;
  monto_estimado: number | null;
  activo: boolean;
}

export type CategoriaInsumo = "medicos" | "varios";

export interface Insumo {
  id: string;
  nombre: string;
  categoria: CategoriaInsumo;
  unidad: string;
  stock_minimo: number;
  activo: boolean;
}

export type TipoMovimiento = "entrada" | "salida";

export interface MovimientoInventario {
  id: string;
  sucursal_id: string;
  insumo_id: string;
  tipo: TipoMovimiento;
  cantidad: number;
  precio: number | null;
  importe_total: number | null;
  es_inicial: boolean;
  fecha: string;
}

export type EstadoPago = "pendiente" | "parcial" | "pagado";
export type MetodoPago = "efectivo" | "transferencia" | "mercado_pago";

export interface Rendicion {
  id: string;
  sucursal_id: string;
  monto: number | null;
  descripcion: string | null;
  fecha: string;
  imagen_path: string;
  created_at: string;
}

export interface FacturaArca {
  id: string;
  pago_id: string;
  residente_id: string;
  sucursal_id: string;
  tipo_cbte: number;
  pto_vta: number;
  cbte_nro: number;
  cae: string;
  cae_vencimiento: string;
  importe: number;
  fecha_emision: string;
  doc_tipo: number;
  doc_nro: string;
  condicion_iva_receptor_id: number;
  created_at: string;
}

export interface Pago {
  id: string;
  residente_id: string;
  sucursal_id: string;
  monto: number;
  monto_pagado: number;
  mes: number;
  anio: number;
  estado: EstadoPago;
  fecha_pago: string | null;
}
