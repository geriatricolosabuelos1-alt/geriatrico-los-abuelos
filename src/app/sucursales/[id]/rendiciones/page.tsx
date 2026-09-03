import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { RendicionForm } from "@/components/RendicionForm";
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
          <h1 className="font-display text-2xl font-bold text-ink">Rendiciones</h1>
        </div>

        <RendicionForm sucursalId={id} />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rendicionesConUrl.map((r) => (
            <div
              key={r.id}
              className="overflow-hidden rounded-2xl border border-edge bg-card"
            >
              {r.url && r.imagen_path.toLowerCase().endsWith(".pdf") ? (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-36 w-full flex-col items-center justify-center gap-1 bg-panel-deep text-brass"
                >
                  <span className="font-display text-2xl font-bold">PDF</span>
                  <span className="text-xs text-ink-soft">Ver documento</span>
                </a>
              ) : (
                r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.url}
                      alt={r.descripcion ?? "Ticket de compra"}
                      className="h-36 w-full object-cover"
                    />
                  </a>
                )
              )}
              <div className="p-3">
                <p className="text-sm font-medium text-ink">
                  {r.monto != null ? `$${r.monto}` : "Sin monto"}
                </p>
                <p className="truncate text-xs text-ink-soft">
                  {r.descripcion ?? "—"}
                </p>
                <p className="mt-1 text-[0.65rem] text-ink-soft">
                  {new Date(r.fecha).toLocaleDateString("es-AR")}
                </p>
              </div>
            </div>
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
