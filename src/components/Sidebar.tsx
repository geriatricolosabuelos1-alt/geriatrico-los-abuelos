import Link from "next/link";
import { cerrarSesion } from "@/app/actions";
import type { RolUsuario } from "@/lib/types";

type Props = {
  nombre: string;
  rol: string;
  activo?: "dashboard" | "residentes" | "empleados";
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

const ROLES_EMPLEADOS: RolUsuario[] = ["admin", "administrativo"];

const ETIQUETA_ROL: Record<string, string> = {
  admin: "Administradora",
  administrativo: "Administrativo",
  enfermero: "Enfermero/a",
  cuidador: "Cuidador/a",
  medico: "Médico/a",
  nutricionista: "Nutricionista",
  kinesiologo: "Kinesiólogo/a",
};

function Tab({
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

export function Sidebar({ nombre, rol, activo }: Props) {
  const rolUsuario = rol as RolUsuario;

  return (
    <aside className="flex w-52 flex-shrink-0 flex-col gap-0.5 border-r border-edge bg-panel-deep p-4">
      <div className="mb-6 px-1">
        <p className="font-display text-base font-bold tracking-tight text-ink">
          Los Abuelos
        </p>
        <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-widest text-brass">
          Suite de cuidado
        </p>
      </div>

      <Tab href="/" label="Dashboard" activo={activo === "dashboard"} />
      {ROLES_RESIDENTES.includes(rolUsuario) && (
        <Tab
          href="/residentes"
          label="Residentes"
          activo={activo === "residentes"}
        />
      )}
      {ROLES_EMPLEADOS.includes(rolUsuario) && (
        <Tab
          href="/empleados"
          label="Empleados"
          activo={activo === "empleados"}
        />
      )}

      <div className="mt-auto border-t border-edge pt-4 text-xs leading-tight text-ink-soft">
        <p className="font-display font-semibold text-ink">{nombre}</p>
        <p>{ETIQUETA_ROL[rol] ?? rol}</p>
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
