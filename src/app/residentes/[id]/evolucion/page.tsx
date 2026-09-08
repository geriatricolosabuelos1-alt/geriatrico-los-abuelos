import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { NotaEvolucionForm } from "@/components/NotaEvolucionForm";
import type { Perfil } from "@/lib/types";

type Params = { id: string };

type FilaNota = {
  id: string;
  tipo: string;
  contenido: string;
  fecha: string;
  perfiles: { nombre_completo: string } | null;
};

const ETIQUETA_TIPO: Record<string, string> = {
  medica: "Médica",
  enfermeria: "Enfermería",
  nutricion: "Nutrición",
  kinesiologia: "Kinesiología",
};

export default async function EvolucionResidentePage({
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

  const { data: residente } = await supabase
    .from("residentes")
    .select("id, nombre, apellido, sucursal_id")
    .eq("id", id)
    .single<{ id: string; nombre: string; apellido: string; sucursal_id: string }>();

  if (!residente) {
    notFound();
  }

  const { data: notas } = await supabase
    .from("notas_evolucion")
    .select("id, tipo, contenido, fecha, perfiles(nombre_completo)")
    .eq("residente_id", id)
    .order("fecha", { ascending: false })
    .returns<FilaNota[]>();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{
          tipo: "sucursal",
          sucursalId: residente.sucursal_id,
          seccion: "residentes",
        }}
      />

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">
            Evolución
          </p>
          <h1 className="font-display text-[32px] font-semibold text-ink">
            {residente.apellido}, {residente.nombre}
          </h1>
        </div>

        <NotaEvolucionForm
          residenteId={id}
          mostrarSelectorTipo={perfil?.rol === "admin"}
        />

        <div className="space-y-3">
          {(notas ?? []).map((n) => (
            <div key={n.id} className="rounded-2xl border border-edge bg-card p-4">
              <div className="mb-1.5 flex items-center justify-between text-xs text-ink-soft">
                <span className="rounded-full bg-brass-soft px-2 py-0.5 font-medium text-brass">
                  {ETIQUETA_TIPO[n.tipo] ?? n.tipo}
                </span>
                <span>
                  {n.perfiles?.nombre_completo ?? "—"} ·{" "}
                  {new Date(n.fecha).toLocaleString("es-AR")}
                </span>
              </div>
              <p className="text-sm text-ink">{n.contenido}</p>
            </div>
          ))}
          {(notas ?? []).length === 0 && (
            <p className="text-center text-sm text-ink-soft">
              Todavía no hay notas cargadas para este residente.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
