import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { LibretasSanitariasClient } from "@/components/LibretasSanitariasClient";
import { listarLibretas } from "@/app/sucursales/[id]/legales/libretas-actions";
import type { Perfil } from "@/lib/types";

type Params = { id: string };

export default async function LibretasSanitariasPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, empleados] = await Promise.all([
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
    listarLibretas(id),
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
          subseccion: "libretas",
        }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal!.nombre}</p>
          <h1 className="font-display text-[32px] font-semibold text-ink">Libretas sanitarias</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Libretas del personal con su vigencia. Se avisa 30 días antes del vencimiento para renovarlas.
          </p>
        </div>

        <LibretasSanitariasClient sucursalId={id} empleados={empleados} />
      </main>
    </div>
  );
}
