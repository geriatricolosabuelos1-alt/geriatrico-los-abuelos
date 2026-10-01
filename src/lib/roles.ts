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

// Profesionales que atienden en todas las sedes (la base ya les deja ver residentes de
// cualquier sede); el resto de los roles, salvo admin, ve solo su propia sede.
const ROLES_TODAS_LAS_SEDES: RolUsuario[] = ["admin", "medico", "nutricionista", "kinesiologo"];

export function veTodasLasSedes(rol: RolUsuario): boolean {
  return ROLES_TODAS_LAS_SEDES.includes(rol);
}

// Pantalla de entrada a Medicina: nutricionista y kinesiologo van directo a su especialidad.
export function inicioMedicina(rol: RolUsuario, sucursalId: string): string {
  if (rol === "nutricionista") return `/sucursales/${sucursalId}/nutricion`;
  if (rol === "kinesiologo") return `/sucursales/${sucursalId}/kinesiologia`;
  return `/sucursales/${sucursalId}/residentes?vista=medicina`;
}
