import { cerrarSesion } from "@/app/actions";

type Props = {
  nombre: string;
  rol: string;
};

export function NavBar({ nombre, rol }: Props) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Geriátrico Los Abuelos
          </p>
          <p className="text-xs text-slate-500">
            {nombre} · {rol}
          </p>
        </div>
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
