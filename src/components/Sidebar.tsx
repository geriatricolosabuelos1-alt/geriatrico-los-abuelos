import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/app/actions";
import type { Perfil, RolUsuario, Sucursal } from "@/lib/types";

type Seccion = "residentes" | "cuotas" | "inventario" | "rendiciones";

type Props = {
  perfil: Perfil;
  activo?: { tipo: "dashboard" } | { tipo: "empleados" } | {
    tipo: "sucursal";
    sucursalId: string;
    seccion: Seccion;
  };
};

const ROLES_RESIDENTES: RolUsuario[] = [
  "admin",
  "administrativo",
  "enfermero",
  "cuidador",
  "medico",
  "nutricionista",
  "kinesiologo",
];
const ROLES_CUOTAS: RolUsuario[] = ["admin", "administrativo"];
const ROLES_RENDICIONES: RolUsuario[] = ["admin", "administrativo"];
const ROLES_INVENTARIO: RolUsuario[] = ["admin", "administrativo"];
const ROLES_EMPLEADOS: RolUsuario[] = ["admin", "administrativo"];
const ROLES_DASHBOARD: RolUsuario[] = ["admin", "administrativo"];

const ETIQUETA_ROL: Record<string, string> = {
  admin: "Administradora",
  administrativo: "Administrativo",
  enfermero: "Enfermero/a",
  cuidador: "Cuidador/a",
  medico: "Médico/a",
  nutricionista: "Nutricionista",
  kinesiologo: "Kinesiólogo/a",
};

function TabPrincipal({
  href,
  label,
  activo,
}: {
  href: string;
  label: string;
  activo: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-karla text-sm font-medium ${
        activo ? "bg-tab text-ink" : "text-ink-soft hover:bg-tab/50"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
          activo ? "bg-brass" : "bg-edge"
        }`}
      />
      {label}
    </Link>
  );
}

function SubTab({
  href,
  label,
  activo,
}: {
  href: string;
  label: string;
  activo: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-md py-1.5 pl-6 pr-2.5 font-karla text-[0.8rem] ${
        activo ? "font-semibold text-brass" : "text-ink-soft hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}

export async function Sidebar({ perfil, activo }: Props) {
  const supabase = await createClient();
  const { data: todasSucursales } = await supabase
    .from("sucursales")
    .select("id, nombre, direccion, capacidad_camas")
    .order("nombre")
    .returns<Sucursal[]>();

  const esAdmin = perfil.rol === "admin";
  const sucursalesVisibles = esAdmin
    ? (todasSucursales ?? [])
    : (todasSucursales ?? []).filter((s) => s.id === perfil.sucursal_id);

  return (
    <aside className="flex w-56 flex-shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-edge bg-panel-deep p-4">
      <div className="mb-6 px-1">
        <Link href="/" className="block">
          <p className="font-display text-base font-bold tracking-tight text-ink">
            Los Abuelos
          </p>
          <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-widest text-brass">
            Suite de cuidado
          </p>
        </Link>
      </div>

      {ROLES_DASHBOARD.includes(perfil.rol) && (
        <TabPrincipal
          href="/administrativa"
          label="Dashboard"
          activo={activo?.tipo === "dashboard"}
        />
      )}

      {sucursalesVisibles.map((s) => (
        <div key={s.id} className="mt-3">
          <p className="px-2.5 pb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
            {s.nombre}
          </p>
          {ROLES_RESIDENTES.includes(perfil.rol) && (
            <SubTab
              href={`/sucursales/${s.id}/residentes`}
              label="Residentes"
              activo={
                activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "residentes"
              }
            />
          )}
          {ROLES_CUOTAS.includes(perfil.rol) && (
            <SubTab
              href={`/sucursales/${s.id}/cuotas`}
              label="Aranceles"
              activo={
                activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "cuotas"
              }
            />
          )}
          {ROLES_INVENTARIO.includes(perfil.rol) && (
            <SubTab
              href={`/sucursales/${s.id}/inventario`}
              label="Inventario"
              activo={
                activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "inventario"
              }
            />
          )}
          {ROLES_RENDICIONES.includes(perfil.rol) && (
            <SubTab
              href={`/sucursales/${s.id}/rendiciones`}
              label="Rendiciones"
              activo={
                activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "rendiciones"
              }
            />
          )}
        </div>
      ))}

      {ROLES_EMPLEADOS.includes(perfil.rol) && (
        <div className="mt-3">
          <TabPrincipal
            href="/empleados"
            label="Empleados"
            activo={activo?.tipo === "empleados"}
          />
        </div>
      )}

      <div className="mt-auto border-t border-edge pt-4 text-xs leading-tight text-ink-soft">
        <p className="font-display font-semibold text-ink">
          {perfil.nombre_completo}
        </p>
        <p>{ETIQUETA_ROL[perfil.rol] ?? perfil.rol}</p>
        <form action={cerrarSesion} className="mt-3">
          <button
            type="submit"
            className="w-full rounded-lg border border-edge px-3 py-1.5 text-left text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
