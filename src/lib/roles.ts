import type { RolUsuario } from "@/lib/types";

export const ETIQUETA_ROL: Record<RolUsuario, string> = {
  admin: "Administradora",
  gerente_sede: "Gerente de sede",
  administrativo: "Administrativo",
  enfermero: "Enfermero/a",
  cuidador: "Cuidador/a",
  medico: "Médico/a",
  nutricionista: "Nutricionista",
  kinesiologo: "Kinesiólogo/a",
};

export const ROLES_DISPONIBLES: RolUsuario[] = [
  "admin",
  "gerente_sede",
  "administrativo",
  "medico",
  "nutricionista",
  "enfermero",
  "cuidador",
  "kinesiologo",
];

const ROLES_AREA_ADMINISTRATIVA: RolUsuario[] = ["admin", "gerente_sede", "administrativo"];

// Area del menu lateral para las pantallas compartidas entre Administrativa y Medicina.
export function areaSegunRol(rol: RolUsuario): "administrativa" | "medicina" {
  return ROLES_AREA_ADMINISTRATIVA.includes(rol) ? "administrativa" : "medicina";
}
