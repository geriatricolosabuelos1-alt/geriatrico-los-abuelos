import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/app/actions";
import type { Perfil, RolUsuario, Sucursal } from "@/lib/types";

const ROLES_ADMINISTRATIVA: RolUsuario[] = ["admin", "administrativo"];
const ROLES_MEDICINA: RolUsuario[] = [
  "admin",
  "medico",
  "nutricionista",
  "kinesiologo",
  "enfermero",
  "cuidador",
];

function Tarjeta({
  href,
  titulo,
  subtitulo,
  icono,
  habilitada,
}: {
  href: string;
  titulo: string;
  subtitulo: string;
  icono: string;
  habilitada: boolean;
}) {
  const contenido = (
    <>
      <span className="text-3xl">{icono}</span>
      <p className="mt-4 font-display text-lg font-semibold text-ink">{titulo}</p>
      <p className="mt-1 text-sm text-ink-soft">{subtitulo}</p>
      {!habilitada && (
        <span className="mt-4 rounded-full bg-white/5 px-3 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
          Sin acceso
        </span>
      )}
    </>
  );

  const clases =
    "flex w-56 flex-col items-center rounded-2xl border p-8 text-center transition";

  if (!habilitada) {
    return (
      <div className={`${clases} border-edge bg-card opacity-40`}>
        {contenido}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`${clases} border-edge bg-card hover:border-brass hover:-translate-y-0.5`}
    >
      {contenido}
    </Link>
  );
}

export default async function SeleccionarAreaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol, sucursal_id, activo")
    .eq("id", user!.id)
    .single<Perfil>();

  const { data: sucursales } = await supabase
    .from("sucursales")
    .select("id, nombre, direccion, capacidad_camas")
    .order("nombre")
    .returns<Sucursal[]>();

  const rol = perfil?.rol as RolUsuario;
  const puedeAdministrativa = ROLES_ADMINISTRATIVA.includes(rol);
  const puedeMedicina = ROLES_MEDICINA.includes(rol);

  const sucursalMedicina = perfil?.sucursal_id ?? sucursales?.[0]?.id ?? null;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-panel px-4">
      <div className="mb-10 text-center">
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-brass">
          Los Abuelos
        </p>
        <h1 className="mt-1 font-display text-[32px] font-semibold text-ink">
          ¿A qué área querés entrar?
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{perfil?.nombre_completo}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-5">
        <Tarjeta
          href="/administrativa"
          titulo="Administrativa"
          subtitulo="Empleados, aranceles, inventario, rendiciones"
          icono="📋"
          habilitada={puedeAdministrativa}
        />
        <Tarjeta
          href={sucursalMedicina ? `/sucursales/${sucursalMedicina}/residentes` : "#"}
          titulo="Medicina"
          subtitulo="Residentes y evolución"
          icono="🩺"
          habilitada={puedeMedicina && !!sucursalMedicina}
        />
      </div>

      <form action={cerrarSesion} className="mt-10">
        <button
          type="submit"
          className="rounded-lg border border-edge px-4 py-2 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
