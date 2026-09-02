import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
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
    .select("id, nombre, apellido")
    .eq("id", id)
    .single<{ id: string; nombre: string; apellido: string }>();

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
    <>
      <NavBar
        nombre={perfil?.nombre_completo ?? user?.email ?? ""}
        rol={perfil?.rol ?? ""}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
        <div>
          <p className="text-sm text-slate-500">Evolución</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            {residente.apellido}, {residente.nombre}
          </h1>
        </div>

        <NotaEvolucionForm
          residenteId={id}
          mostrarSelectorTipo={perfil?.rol === "admin"}
        />

        <div className="space-y-3">
          {(notas ?? []).map((n) => (
            <div key={n.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                  {ETIQUETA_TIPO[n.tipo] ?? n.tipo}
                </span>
                <span>
                  {n.perfiles?.nombre_completo ?? "—"} ·{" "}
                  {new Date(n.fecha).toLocaleString("es-AR")}
                </span>
              </div>
              <p className="text-sm text-slate-800">{n.contenido}</p>
            </div>
          ))}
          {(notas ?? []).length === 0 && (
            <p className="text-center text-sm text-slate-400">
              Todavía no hay notas cargadas para este residente.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
