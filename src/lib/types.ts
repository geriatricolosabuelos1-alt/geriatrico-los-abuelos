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
}

export interface FichaAdministrativa {
  residente_id: string;
  obra_social: string | null;
  tipo_cobertura: string | null;
  cuota_mensual: number | null;
  notas_contrato: string | null;
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

export interface Gasto {
  id: string;
  sucursal_id: string;
  categoria: string;
  monto: number;
  mes: number;
  anio: number;
  descripcion: string | null;
}

export type CategoriaInsumo = "general" | "carnes" | "verduras";

export interface Insumo {
  id: string;
  nombre: string;
  categoria: CategoriaInsumo;
  unidad: string;
  activo: boolean;
}

export type TipoMovimiento = "entrada" | "salida";

export interface MovimientoInventario {
  id: string;
  sucursal_id: string;
  insumo_id: string;
  tipo: TipoMovimiento;
  cantidad: number;
  fecha: string;
}

export type EstadoPago = "pendiente" | "pagado";

export interface Rendicion {
  id: string;
  sucursal_id: string;
  monto: number | null;
  descripcion: string | null;
  fecha: string;
  imagen_path: string;
  created_at: string;
}

export interface Pago {
  id: string;
  residente_id: string;
  sucursal_id: string;
  monto: number;
  mes: number;
  anio: number;
  estado: EstadoPago;
  fecha_pago: string | null;
}
