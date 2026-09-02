import Link from "next/link";
import { cerrarSesion } from "@/app/actions";
import type { RolUsuario } from "@/lib/types";

type Props = {
  nombre: string;
  rol: string;
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

export function NavBar({ nombre, rol }: Props) {
  const rolUsuario = rol as RolUsuario;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Geriátrico Los Abuelos
            </p>
            <p className="text-xs text-slate-500">
              {nombre} · {rol}
            </p>
          </div>
          <div className="ml-4 flex gap-3 text-sm">
            <Link href="/" className="text-slate-600 hover:text-slate-900">
              Dashboard
            </Link>
            {ROLES_RESIDENTES.includes(rolUsuario) && (
              <Link href="/residentes" className="text-slate-600 hover:text-slate-900">
                Residentes
              </Link>
            )}
            {ROLES_EMPLEADOS.includes(rolUsuario) && (
              <Link href="/empleados" className="text-slate-600 hover:text-slate-900">
                Empleados
              </Link>
            )}
          </div>
        </nav>
        <form action={cerrarSesion}>
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </header>
  );
}
