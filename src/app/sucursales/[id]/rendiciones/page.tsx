import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { RendicionForm } from "@/components/RendicionForm";
import { RendicionCard } from "@/components/RendicionCard";
import type { Perfil, Rendicion } from "@/lib/types";

type Params = { id: string };

export default async function RendicionesSucursalPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol, sucursal_id, activo")
    .eq("id", user!.id)
    .single<Perfil>();

  const { data: sucursal } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .eq("id", id)
    .single<{ id: string; nombre: string }>();

  if (!sucursal || !perfil) {
    notFound();
  }

  const { data: rendiciones } = await supabase
    .from("rendiciones")
    .select("id, monto, descripcion, fecha, imagen_path, created_at")
    .eq("sucursal_id", id)
    .order("created_at", { ascending: false })
    .returns<Rendicion[]>();

  const listaRendiciones = rendiciones ?? [];

  const rendicionesConUrl = await Promise.all(
    listaRendiciones.map(async (r) => {
      if (!r.imagen_path) return { ...r, url: null };
      const { data } = await supabase.storage
        .from("rendiciones")
        .createSignedUrl(r.imagen_path, 3600);
      return { ...r, url: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "rendiciones" }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">
            {sucursal!.nombre}
          </p>
          <h1 className="font-display text-[32px] font-semibold text-ink">Rendiciones</h1>
        </div>

        <RendicionForm sucursalId={id} />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rendicionesConUrl.map((r) => (
            <RendicionCard key={r.id} rendicion={r} url={r.url} sucursalId={id} />
          ))}
          {rendicionesConUrl.length === 0 && (
            <p className="col-span-full text-center text-sm text-ink-soft">
              Todavía no hay rendiciones cargadas.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
