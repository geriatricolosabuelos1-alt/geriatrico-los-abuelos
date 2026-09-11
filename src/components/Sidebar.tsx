import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/app/actions";
import type { CategoriaInsumo, Perfil, RolUsuario, Sucursal } from "@/lib/types";

type Seccion =
  | "residentes"
  | "cuotas"
  | "inventario"
  | "rendiciones"
  | "gastos"
  | "reportes"
  | "medicacion"
  | "legales";

type SubseccionLegales = "habilitacion";

type Props = {
  perfil: Perfil;
  activo?: { tipo: "dashboard" } | { tipo: "empleados" } | {
    tipo: "sucursal";
    sucursalId: string;
    seccion: Seccion;
    categoriaInventario?: CategoriaInsumo;
    subseccion?: SubseccionLegales;
    area?: "administrativa" | "medicina";
  };
};

const ETIQUETA_CATEGORIA_INVENTARIO: Record<CategoriaInsumo, string> = {
  medicos: "Insumos médicos",
  varios: "Insumos varios",
};

const ORDEN_CATEGORIAS_INVENTARIO: CategoriaInsumo[] = ["medicos", "varios"];

const ROLES_RESIDENTES: RolUsuario[] = [
  "admin",
  "administrativo",
  "enfermero",
  "cuidador",
  "medico",
  "nutricionista",
  "kinesiologo",
];
const ROLES_MEDICACION: RolUsuario[] = [
  "admin",
  "administrativo",
  "medico",
  "enfermero",
  "cuidador",
];
const ROLES_CUOTAS: RolUsuario[] = ["admin", "administrativo"];
const ROLES_RENDICIONES: RolUsuario[] = ["admin", "administrativo"];
const ROLES_GASTOS: RolUsuario[] = ["admin", "administrativo"];
const ROLES_REPORTES: RolUsuario[] = ["admin", "administrativo"];
const ROLES_LEGALES: RolUsuario[] = ["admin", "administrativo"];
const ROLES_INVENTARIO: RolUsuario[] = ["admin", "administrativo"];
const ROLES_EMPLEADOS: RolUsuario[] = ["admin", "administrativo"];
const ROLES_DASHBOARD: RolUsuario[] = ["admin", "administrativo"];

const ROLES_ADMINISTRATIVA: RolUsuario[] = ["admin", "administrativo"];
const ROLES_MEDICINA: RolUsuario[] = [
  "admin",
  "medico",
  "nutricionista",
  "kinesiologo",
  "enfermero",
  "cuidador",
];

const ETIQUETA_ROL: Record<string, string> = {
  admin: "Administradora",
  administrativo: "Administrativo",
  enfermero: "Enfermero/a",
  cuidador: "Cuidador/a",
  medico: "Médico/a",
  nutricionista: "Nutricionista",
  kinesiologo: "Kinesiólogo/a",
};

function NavRow({
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
      className={`block rounded-lg px-3 py-2.5 text-[0.83rem] font-medium transition-colors ${
        activo
          ? "bg-brass text-btn-ink"
          : "text-ink-soft hover:bg-panel-deep hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}

function TabPrincipal({
  href,
  label,
  activo,
}: {
  href: string;
  label: string;
  activo: boolean;
}) {
  return <NavRow href={href} label={label} activo={activo} />;
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
  return <NavRow href={href} label={label} activo={activo} />;
}

function SubSubTab({
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
      className={`block rounded-md py-1.5 pl-10 pr-2.5 text-[0.75rem] ${
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

  const puedeAdministrativa = ROLES_ADMINISTRATIVA.includes(perfil.rol);
  const puedeMedicina = ROLES_MEDICINA.includes(perfil.rol);
  const sucursalMedicina = perfil.sucursal_id ?? todasSucursales?.[0]?.id ?? null;
  const areaActual: "administrativa" | "medicina" =
    activo?.tipo === "sucursal" && activo.area === "medicina" ? "medicina" : "administrativa";

  return (
    <aside className="flex w-60 flex-shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-edge bg-panel-deep p-4">
      <div className="mb-6 flex items-center gap-3 px-1">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-brass font-display text-[0.9rem] font-semibold text-btn-ink">
            LA
          </span>
          <span>
            <p className="font-display text-[0.95rem] font-semibold leading-tight tracking-tight text-ink">
              Los Abuelos
            </p>
            <p className="text-[0.7rem] text-ink-soft">Residencia geriátrica</p>
          </span>
        </Link>
      </div>

      {puedeAdministrativa && puedeMedicina && (
        <div className="mb-4 flex rounded-lg border border-edge bg-card p-1 text-xs font-medium">
          <Link
            href="/administrativa"
            className={`flex-1 rounded-md py-1.5 text-center ${
              areaActual === "administrativa"
                ? "bg-tab text-ink"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Administrativa
          </Link>
          <Link
            href={sucursalMedicina ? `/sucursales/${sucursalMedicina}/residentes?vista=medicina` : "#"}
            className={`flex-1 rounded-md py-1.5 text-center ${
              areaActual === "medicina"
                ? "bg-tab text-ink"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Medicina
          </Link>
        </div>
      )}

      {ROLES_DASHBOARD.includes(perfil.rol) && areaActual === "administrativa" && (
        <TabPrincipal
          href="/administrativa"
          label="Dashboard"
          activo={activo?.tipo === "dashboard"}
        />
      )}

      {sucursalesVisibles.map((s) => (
        <div key={s.id} className="mt-3 flex flex-col gap-1">
          <p className="mb-0.5 flex items-center gap-1.5 rounded-md bg-sede-soft px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-sede">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sede" />
            {s.nombre}
          </p>
          {ROLES_RESIDENTES.includes(perfil.rol) && (
            <SubTab
              href={`/sucursales/${s.id}/residentes${areaActual === "medicina" ? "?vista=medicina" : ""}`}
              label="Residentes"
              activo={
                activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "residentes"
              }
            />
          )}
          {ROLES_MEDICACION.includes(perfil.rol) && (
            <SubTab
              href={`/sucursales/${s.id}/medicacion${areaActual === "medicina" ? "?vista=medicina" : ""}`}
              label="Medicación"
              activo={
                activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "medicacion"
              }
            />
          )}
          {ROLES_CUOTAS.includes(perfil.rol) && areaActual === "administrativa" && (
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
          {ROLES_INVENTARIO.includes(perfil.rol) && areaActual === "administrativa" && (
            <>
              <SubTab
                href={`/sucursales/${s.id}/inventario`}
                label="Inventario"
                activo={
                  activo?.tipo === "sucursal" &&
                  activo.sucursalId === s.id &&
                  activo.seccion === "inventario" &&
                  !activo.categoriaInventario
                }
              />
              {activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "inventario" &&
                ORDEN_CATEGORIAS_INVENTARIO.map((cat) => (
                  <SubSubTab
                    key={cat}
                    href={`/sucursales/${s.id}/inventario?categoria=${cat}`}
                    label={ETIQUETA_CATEGORIA_INVENTARIO[cat]}
                    activo={activo.categoriaInventario === cat}
                  />
                ))}
            </>
          )}
          {ROLES_RENDICIONES.includes(perfil.rol) && areaActual === "administrativa" && (
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
          {ROLES_GASTOS.includes(perfil.rol) && areaActual === "administrativa" && (
            <SubTab
              href={`/sucursales/${s.id}/gastos`}
              label="Gastos"
              activo={
                activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "gastos"
              }
            />
          )}
          {ROLES_REPORTES.includes(perfil.rol) && areaActual === "administrativa" && (
            <SubTab
              href={`/sucursales/${s.id}/reportes`}
              label="Reportes"
              activo={
                activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "reportes"
              }
            />
          )}
          {ROLES_LEGALES.includes(perfil.rol) && areaActual === "administrativa" && (
            <>
              <SubTab
                href={`/sucursales/${s.id}/legales/habilitacion`}
                label="Legales"
                activo={
                  activo?.tipo === "sucursal" &&
                  activo.sucursalId === s.id &&
                  activo.seccion === "legales"
                }
              />
              {activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "legales" && (
                  <SubSubTab
                    href={`/sucursales/${s.id}/legales/habilitacion`}
                    label="Habilitación"
                    activo={activo.subseccion === "habilitacion"}
                  />
                )}
            </>
          )}
        </div>
      ))}

      {ROLES_EMPLEADOS.includes(perfil.rol) && areaActual === "administrativa" && (
        <div className="mt-3">
          <TabPrincipal
            href="/empleados"
            label="Empleados"
            activo={activo?.tipo === "empleados"}
          />
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3 border-t border-edge pt-4">
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brass-soft text-[0.7rem] font-bold text-brass">
            {perfil.nombre_completo
              .split(" ")
              .slice(0, 2)
              .map((p) => p[0])
              .join("")
              .toUpperCase()}
          </span>
          <span className="min-w-0 leading-tight">
            <p className="truncate text-[0.8rem] font-semibold text-ink">
              {perfil.nombre_completo}
            </p>
            <p className="text-[0.7rem] text-ink-soft">
              {ETIQUETA_ROL[perfil.rol] ?? perfil.rol}
            </p>
          </span>
        </div>
        <form action={cerrarSesion}>
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
