import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { MenuSemanalClient } from "@/components/MenuSemanalClient";
import { listarMenusSemanales } from "@/app/sucursales/[id]/nutricion/actions";
import type { Perfil } from "@/lib/types";

type Params = { id: string };

export default async function MenuSemanalPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, menus] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre_completo, rol, sucursal_id, activo")
      .eq("id", user!.id)
      .single<Perfil>(),
    supabase
      .from("sucursales")
      .select("id, nombre")
      .eq("id", id)
      .single<{ id: string; nombre: string }>(),
    listarMenusSemanales(id),
  ]);

  if (!sucursal || !perfil) notFound();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{
          tipo: "sucursal",
          sucursalId: id,
          seccion: "nutricion",
          subseccion: "menu-semanal",
          area: "medicina",
        }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal!.nombre}</p>
          <h1 className="font-display text-[32px] font-semibold text-ink">Menú semanal</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Planilla obligatoria para auditorías del Ministerio de Salud, firmada por el/la nutricionista.
          </p>
        </div>

        <MenuSemanalClient sucursalId={id} sucursalNombre={sucursal!.nombre} menus={menus} />
      </main>
    </div>
  );
}
