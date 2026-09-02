export type RolUsuario = "admin" | "enfermero" | "cuidador";

export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string | null;
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
  contacto_familiar: string | null;
  telefono_familiar: string | null;
  observaciones_medicas: string | null;
  activo: boolean;
}
