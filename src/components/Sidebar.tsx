import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/app/actions";
import { ETIQUETA_ROL } from "@/lib/roles";
import { SidebarIcon, type SidebarIconName } from "@/components/SidebarIcons";
import type { CategoriaInsumo, Perfil, RolUsuario, Sucursal } from "@/lib/types";

type Seccion =
  | "dashboard"
  | "residentes"
  | "cuotas"
  | "inventario"
  | "rendiciones"
  | "gastos"
  | "reportes"
  | "medicacion"
  | "nutricion"
  | "accion-medica"
  | "legales";

type SubseccionLegales = "habilitacion" | "libro-foliado" | "certificaciones";
type SubseccionMedicacion = "recetario" | "vacunacion";
type SubseccionNutricion = "dietas" | "cocina" | "disfagia" | "ingesta" | "menu-semanal";

type Props = {
  perfil: Perfil;
  activo?: { tipo: "dashboard" } | { tipo: "empleados" } | { tipo: "claves" } | {
    tipo: "sucursal";
    sucursalId: string;
    seccion: Seccion;
    categoriaInventario?: CategoriaInsumo;
    subseccion?: SubseccionLegales | SubseccionMedicacion | SubseccionNutricion;
    area?: "administrativa" | "medicina";
  };
};

const ETIQUETA_CATEGORIA_INVENTARIO: Record<CategoriaInsumo, string> = {
  medicos: "Insumos médicos",
  varios: "Insumos varios",
};

const ORDEN_CATEGORIAS_INVENTARIO: CategoriaInsumo[] = ["medicos", "varios"];

// Nutricionista solo ve Nutricion: no entra a la lista general de Residentes.
const ROLES_RESIDENTES: RolUsuario[] = [
  "admin",
  "gerente_sede",
  "administrativo",
  "enfermero",
  "cuidador",
  "medico",
  "kinesiologo",
];
const ROLES_MEDICACION: RolUsuario[] = [
  "admin",
  "gerente_sede",
  "administrativo",
  "medico",
  "enfermero",
  "cuidador",
];
const ROLES_RECETARIO: RolUsuario[] = ["admin", "gerente_sede", "administrativo", "medico"];
// Medico ya no ve Nutricion: solo Medicacion, Accion Medica y Evolucion (via Residentes).
const ROLES_NUTRICION: RolUsuario[] = ["admin", "gerente_sede", "nutricionista", "enfermero", "cuidador"];
const ROLES_NUTRICION_CLINICO: RolUsuario[] = ["admin", "gerente_sede", "nutricionista"];
const ROLES_ACCION_MEDICA: RolUsuario[] = ["admin", "gerente_sede", "medico"];
const ROLES_CUOTAS: RolUsuario[] = ["admin", "gerente_sede", "administrativo"];
const ROLES_RENDICIONES: RolUsuario[] = ["admin", "gerente_sede", "administrativo"];
const ROLES_GASTOS: RolUsuario[] = ["admin", "gerente_sede", "administrativo"];
const ROLES_REPORTES: RolUsuario[] = ["admin", "gerente_sede", "administrativo"];
const ROLES_LEGALES: RolUsuario[] = ["admin", "gerente_sede", "administrativo"];
const ROLES_INVENTARIO: RolUsuario[] = ["admin", "gerente_sede", "administrativo"];
const ROLES_EMPLEADOS: RolUsuario[] = ["admin", "gerente_sede", "administrativo"];
const ROLES_DASHBOARD: RolUsuario[] = ["admin", "gerente_sede", "administrativo"];

// gerente_sede ve Administrativa y Medicina completas, pero solo de su propia
// sede: sucursalesVisibles ya filtra por perfil.sucursal_id para todo rol que
// no sea "admin", asi que no requiere logica extra ademas de sumarlo aqui.
const ROLES_ADMINISTRATIVA: RolUsuario[] = ["admin", "gerente_sede", "administrativo"];
const ROLES_MEDICINA: RolUsuario[] = [
  "admin",
  "gerente_sede",
  "medico",
  "nutricionista",
  "kinesiologo",
  "enfermero",
  "cuidador",
];

function NavRow({
  href,
  label,
  activo,
  icono,
}: {
  href: string;
  label: string;
  activo: boolean;
  icono: SidebarIconName;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[0.83rem] font-semibold transition-colors ${
        activo
          ? "border-brass bg-brass text-btn-ink shadow-[0_4px_14px_-6px_var(--color-brass)]"
          : "border-edge bg-card text-ink-soft hover:border-brass/40 hover:text-ink"
      }`}
    >
      <SidebarIcon name={icono} />
      {label}
    </Link>
  );
}

function TabPrincipal({
  href,
  label,
  activo,
  icono,
}: {
  href: string;
  label: string;
  activo: boolean;
  icono: SidebarIconName;
}) {
  return <NavRow href={href} label={label} activo={activo} icono={icono} />;
}

function SubTab({
  href,
  label,
  activo,
  icono,
}: {
  href: string;
  label: string;
  activo: boolean;
  icono: SidebarIconName;
}) {
  return <NavRow href={href} label={label} activo={activo} icono={icono} />;
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
      className={`block rounded-md py-1.5 pl-8 pr-2.5 text-[0.75rem] ${
        activo ? "font-semibold text-brass" : "text-ink-soft hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}

function GrupoConSub({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-dashed border-edge p-1.5">
      {children}
    </div>
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
    <aside className="flex w-60 flex-shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-edge bg-panel-deep p-4">
      <div className="mb-6 flex items-center gap-3 px-1">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-vektor.png"
            alt="Vektor Geriatrixs"
            className="h-9 w-9 flex-shrink-0 rounded-[10px] object-cover"
          />
          <span>
            <p className="font-display text-[0.95rem] font-semibold leading-tight tracking-tight text-ink">
              Vektor
            </p>
            <p className="text-[0.7rem] text-ink-soft">Geriatrixs</p>
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
          icono="grid"
          activo={activo?.tipo === "dashboard"}
        />
      )}

      {sucursalesVisibles.map((s) => (
        <div key={s.id} className="mt-3 flex flex-col gap-1.5">
          <p className="mb-0.5 flex items-center gap-1.5 rounded-md bg-sede-soft px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-sede">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sede" />
            {s.nombre}
          </p>
          {ROLES_DASHBOARD.includes(perfil.rol) && areaActual === "administrativa" && (
            <SubTab
              href={`/sucursales/${s.id}/dashboard`}
              label="Dashboard"
              icono="grid"
              activo={
                activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "dashboard"
              }
            />
          )}
          {ROLES_RESIDENTES.includes(perfil.rol) && (
            <SubTab
              href={`/sucursales/${s.id}/residentes${areaActual === "medicina" ? "?vista=medicina" : ""}`}
              label="Residentes"
              icono="users"
              activo={
                activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "residentes"
              }
            />
          )}
          {ROLES_MEDICACION.includes(perfil.rol) &&
            (() => {
              const medicacionActiva =
                activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "medicacion";
              const filaMedicacion = (
                <SubTab
                  href={`/sucursales/${s.id}/medicacion${areaActual === "medicina" ? "?vista=medicina" : ""}`}
                  label={areaActual === "medicina" ? "Medicamentos" : "Medicación"}
                  icono="pill"
                  activo={medicacionActiva && !activo.subseccion}
                />
              );

              if (!medicacionActiva || areaActual !== "administrativa" || !ROLES_RECETARIO.includes(perfil.rol)) {
                return filaMedicacion;
              }

              return (
                <GrupoConSub>
                  {filaMedicacion}
                  <SubSubTab
                    href={`/sucursales/${s.id}/medicacion/recetario`}
                    label="Recetario"
                    activo={activo.subseccion === "recetario"}
                  />
                  <SubSubTab
                    href={`/sucursales/${s.id}/medicacion/vacunacion`}
                    label="Vacunación"
                    activo={activo.subseccion === "vacunacion"}
                  />
                </GrupoConSub>
              );
            })()}
          {ROLES_ACCION_MEDICA.includes(perfil.rol) && areaActual === "medicina" && (
            <SubTab
              href={`/sucursales/${s.id}/accion-medica`}
              label="Acción Médica"
              icono="shield"
              activo={
                activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "accion-medica"
              }
            />
          )}
          {ROLES_NUTRICION.includes(perfil.rol) &&
            areaActual === "medicina" &&
            (() => {
              const nutricionActiva =
                activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "nutricion";
              const filaNutricion = (
                <SubTab
                  href={`/sucursales/${s.id}/nutricion`}
                  label="Nutrición"
                  icono="utensils"
                  activo={nutricionActiva && !activo.subseccion}
                />
              );

              if (!nutricionActiva) return filaNutricion;

              return (
                <GrupoConSub>
                  {filaNutricion}
                  {ROLES_NUTRICION_CLINICO.includes(perfil.rol) && (
                    <>
                      <SubSubTab
                        href={`/sucursales/${s.id}/nutricion/dietas`}
                        label="Prescripción dietaria"
                        activo={activo.subseccion === "dietas"}
                      />
                      <SubSubTab
                        href={`/sucursales/${s.id}/nutricion/cocina`}
                        label="Cocina"
                        activo={activo.subseccion === "cocina"}
                      />
                      <SubSubTab
                        href={`/sucursales/${s.id}/nutricion/disfagia`}
                        label="Disfagia"
                        activo={activo.subseccion === "disfagia"}
                      />
                    </>
                  )}
                  <SubSubTab
                    href={`/sucursales/${s.id}/nutricion/ingesta`}
                    label="Ingesta diaria"
                    activo={activo.subseccion === "ingesta"}
                  />
                  {ROLES_NUTRICION_CLINICO.includes(perfil.rol) && (
                    <SubSubTab
                      href={`/sucursales/${s.id}/nutricion/menu-semanal`}
                      label="Menú semanal"
                      activo={activo.subseccion === "menu-semanal"}
                    />
                  )}
                </GrupoConSub>
              );
            })()}
          {ROLES_CUOTAS.includes(perfil.rol) && areaActual === "administrativa" && (
            <SubTab
              href={`/sucursales/${s.id}/cuotas`}
              label="Aranceles"
              icono="coin"
              activo={
                activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "cuotas"
              }
            />
          )}
          {ROLES_INVENTARIO.includes(perfil.rol) &&
            areaActual === "administrativa" &&
            (() => {
              const inventarioActivo =
                activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "inventario";
              const filaInventario = (
                <SubTab
                  href={`/sucursales/${s.id}/inventario`}
                  label="Inventario"
                  icono="box"
                  activo={inventarioActivo && !activo.categoriaInventario}
                />
              );

              if (!inventarioActivo) return filaInventario;

              return (
                <GrupoConSub>
                  {filaInventario}
                  {ORDEN_CATEGORIAS_INVENTARIO.map((cat) => (
                    <SubSubTab
                      key={cat}
                      href={`/sucursales/${s.id}/inventario?categoria=${cat}`}
                      label={ETIQUETA_CATEGORIA_INVENTARIO[cat]}
                      activo={activo.categoriaInventario === cat}
                    />
                  ))}
                </GrupoConSub>
              );
            })()}
          {ROLES_RENDICIONES.includes(perfil.rol) && areaActual === "administrativa" && (
            <SubTab
              href={`/sucursales/${s.id}/rendiciones`}
              label="Rendiciones"
              icono="receipt"
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
              icono="wallet"
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
              icono="chart"
              activo={
                activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "reportes"
              }
            />
          )}
          {ROLES_LEGALES.includes(perfil.rol) &&
            areaActual === "administrativa" &&
            (() => {
              const legalesActivo =
                activo?.tipo === "sucursal" &&
                activo.sucursalId === s.id &&
                activo.seccion === "legales";
              const filaLegales = (
                <SubTab
                  href={`/sucursales/${s.id}/legales/habilitacion`}
                  label="Legales"
                  icono="scale"
                  activo={legalesActivo}
                />
              );

              if (!legalesActivo) return filaLegales;

              return (
                <GrupoConSub>
                  {filaLegales}
                  <SubSubTab
                    href={`/sucursales/${s.id}/legales/habilitacion`}
                    label="Habilitación"
                    activo={activo.subseccion === "habilitacion"}
                  />
                  <SubSubTab
                    href={`/sucursales/${s.id}/legales/libro-foliado`}
                    label="Libro foliado"
                    activo={activo.subseccion === "libro-foliado"}
                  />
                  <SubSubTab
                    href={`/sucursales/${s.id}/legales/certificaciones`}
                    label="Certificaciones y proveedores"
                    activo={activo.subseccion === "certificaciones"}
                  />
                </GrupoConSub>
              );
            })()}
        </div>
      ))}

      {ROLES_EMPLEADOS.includes(perfil.rol) && areaActual === "administrativa" && (
        <div className="mt-3">
          <TabPrincipal
            href="/empleados"
            label="Empleados"
            icono="badge"
            activo={activo?.tipo === "empleados"}
          />
        </div>
      )}

      {perfil.rol === "admin" && (
        <div className="mt-3">
          <TabPrincipal
            href="/admin/claves"
            label="Claves"
            icono="key"
            activo={activo?.tipo === "claves"}
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
