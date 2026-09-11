import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { HabilitacionChecklist } from "@/components/HabilitacionChecklist";
import { listarDocumentosHabilitacion, listarItemsHabilitacion } from "./actions";
import type { Perfil } from "@/lib/types";

type Params = { id: string };

export default async function HabilitacionSucursalPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, items, documentos] = await Promise.all([
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
    listarItemsHabilitacion(),
    listarDocumentosHabilitacion(id),
  ]);

  if (!sucursal || !perfil) {
    notFound();
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "legales", subseccion: "habilitacion" }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">
            {sucursal!.nombre}
          </p>
          <h1 className="font-display text-[32px] font-semibold text-ink">
            Legales · Habilitación
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Listado de requisitos para la habilitación del efector. Marcá cada ítem como
            actualizado subiendo el archivo o registrando la fecha de presentación.
          </p>
        </div>

        <HabilitacionChecklist sucursalId={id} items={items} documentos={documentos} />
      </main>
    </div>
  );
}
