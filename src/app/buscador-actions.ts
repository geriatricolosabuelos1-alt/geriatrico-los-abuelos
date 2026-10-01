"use server";

import { createClient } from "@/lib/supabase/server";
import type { RolUsuario } from "@/lib/types";

export type ResultadoBusqueda = {
  tipo: "residente" | "empleado" | "medicamento";
  titulo: string;
  detalle: string;
  href: string;
};

const ROLES_LEGAJO: RolUsuario[] = ["admin", "gerente_sede", "administrativo"];
const ROLES_EVOLUCION: RolUsuario[] = ["medico", "enfermero", "cuidador"];
const ROLES_EMPLEADOS: RolUsuario[] = ["admin", "gerente_sede", "administrativo"];
const ROLES_MEDICACION: RolUsuario[] = ["admin", "gerente_sede", "administrativo", "medico", "enfermero", "cuidador"];

// Pantalla del residente según el rol (la misma que abre la lista de Residentes).
function hrefResidente(rol: RolUsuario, id: string): string | null {
  if (ROLES_LEGAJO.includes(rol)) return `/residentes/${id}/legajo`;
  if (ROLES_EVOLUCION.includes(rol)) return `/residentes/${id}/evolucion`;
  if (rol === "kinesiologo") return `/residentes/${id}/kinesiologia`;
  return null;
}

// Saca comodines y caracteres que rompen el filtro "or" de PostgREST.
function limpiar(texto: string): string {
  return texto.replace(/[%_,()*\\]/g, " ").trim().slice(0, 60);
}

// Busca residentes, empleados y medicamentos. RLS ya limita a las sedes que ve cada usuario.
export async function buscarEnSistema(consulta: string): Promise<ResultadoBusqueda[]> {
  const q = limpiar(consulta);
  if (q.length < 2) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle<{ rol: RolUsuario }>();
  if (!perfil) return [];
  const rol = perfil.rol;

  const { data: sucursales } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .returns<{ id: string; nombre: string }[]>();
  const sede = new Map((sucursales ?? []).map((s) => [s.id, s.nombre]));

  const resultados: ResultadoBusqueda[] = [];
  const palabras = q.split(/\s+/).filter(Boolean);

  if (hrefResidente(rol, "x")) {
    let consultaResidentes = supabase
      .from("residentes")
      .select("id, nombre, apellido, dni, habitacion, activo, sucursal_id")
      .order("activo", { ascending: false })
      .order("apellido")
      .limit(6);
    for (const p of palabras) {
      consultaResidentes = consultaResidentes.or(`nombre.ilike.%${p}%,apellido.ilike.%${p}%,dni.ilike.%${p}%`);
    }
    const { data: residentes } = await consultaResidentes.returns<
      {
        id: string;
        nombre: string;
        apellido: string;
        dni: string | null;
        habitacion: string | null;
        activo: boolean;
        sucursal_id: string;
      }[]
    >();
    for (const r of residentes ?? []) {
      resultados.push({
        tipo: "residente",
        titulo: `${r.apellido}, ${r.nombre}`,
        detalle: [
          "Residente",
          sede.get(r.sucursal_id),
          r.dni && `DNI ${r.dni}`,
          r.habitacion && `Hab. ${r.habitacion}`,
          !r.activo && "dado de baja",
        ]
          .filter(Boolean)
          .join(" · "),
        href: hrefResidente(rol, r.id)!,
      });
    }
  }

  if (ROLES_EMPLEADOS.includes(rol)) {
    let consultaEmpleados = supabase
      .from("empleados")
      .select("id, nombre_completo, dni, activo, sucursal_id")
      .order("activo", { ascending: false })
      .order("nombre_completo")
      .limit(4);
    for (const p of palabras) {
      consultaEmpleados = consultaEmpleados.or(`nombre_completo.ilike.%${p}%,dni.ilike.%${p}%`);
    }
    const { data: empleados } = await consultaEmpleados.returns<
      { id: string; nombre_completo: string; dni: string | null; activo: boolean; sucursal_id: string | null }[]
    >();
    for (const e of empleados ?? []) {
      resultados.push({
        tipo: "empleado",
        titulo: e.nombre_completo,
        detalle: [
          "Empleado",
          e.sucursal_id && sede.get(e.sucursal_id),
          e.dni && `DNI ${e.dni}`,
          !e.activo && "dado de baja",
        ]
          .filter(Boolean)
          .join(" · "),
        href: "/empleados",
      });
    }
  }

  if (ROLES_MEDICACION.includes(rol)) {
    const { data: medicamentos } = await supabase
      .from("medicamentos_residente")
      .select("id, nombre, dosis, residentes!inner(id, nombre, apellido, sucursal_id, activo)")
      .eq("activo", true)
      .eq("residentes.activo", true)
      .ilike("nombre", `%${q}%`)
      .order("nombre")
      .limit(5)
      .returns<
        {
          id: string;
          nombre: string;
          dosis: string | null;
          residentes: { id: string; nombre: string; apellido: string; sucursal_id: string; activo: boolean };
        }[]
      >();
    for (const m of medicamentos ?? []) {
      const residente = m.residentes;
      resultados.push({
        tipo: "medicamento",
        titulo: `${m.nombre}${m.dosis ? ` ${m.dosis}` : ""}`,
        detalle: `Medicación de ${residente.apellido}, ${residente.nombre} · ${sede.get(residente.sucursal_id) ?? ""}`,
        href: ROLES_LEGAJO.includes(rol)
          ? `/residentes/${residente.id}/legajo`
          : `/sucursales/${residente.sucursal_id}/medicacion?vista=medicina`,
      });
    }
  }

  return resultados;
}
