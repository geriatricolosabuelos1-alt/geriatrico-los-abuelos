import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { LibroFoliadoClient } from "@/components/LibroFoliadoClient";
import type { Perfil } from "@/lib/types";

type Params = { id: string };
type ResidenteBasico = { id: string; nombre: string; apellido: string };

export default async function LibroFoliadoPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, { data: residentes }] = await Promise.all([
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
    supabase
      .from("residentes")
      .select("id, nombre, apellido")
      .eq("sucursal_id", id)
      .order("apellido")
      .returns<ResidenteBasico[]>(),
  ]);

  if (!sucursal || !perfil) notFound();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{
          tipo: "sucursal",
          sucursalId: id,
          seccion: "legales",
          subseccion: "libro-foliado",
        }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal!.nombre}</p>
          <h1 className="font-display text-[32px] font-semibold text-ink">Libro foliado digital</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Historia clínica completa foliada, para fiscalizaciones del Ministerio de Salud o requerimientos
            judiciales.
          </p>
        </div>

        <LibroFoliadoClient sucursalNombre={sucursal!.nombre} residentes={residentes ?? []} />
      </main>
    </div>
  );
}
