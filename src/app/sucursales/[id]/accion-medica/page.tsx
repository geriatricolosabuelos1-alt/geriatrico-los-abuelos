import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import type { Perfil } from "@/lib/types";

type Params = { id: string };
type ResidenteBasico = { id: string; nombre: string; apellido: string; habitacion: string | null };

export default async function AccionMedicaListaPage({ params }: { params: Promise<Params> }) {
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
      .select("id, nombre, apellido, habitacion")
      .eq("sucursal_id", id)
      .eq("activo", true)
      .order("habitacion")
      .returns<ResidenteBasico[]>(),
  ]);

  if (!sucursal || !perfil) notFound();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "accion-medica", area: "medicina" }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal!.nombre}</p>
          <h1 className="font-display text-[32px] font-semibold text-ink">Acción Médica</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Elegí un residente para cargar la evolución del pase y revisar su kardex.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(residentes ?? []).map((r) => (
            <Link
              key={r.id}
              href={`/residentes/${r.id}/accion-medica`}
              className="rounded-2xl border border-edge bg-card p-4 hover:border-brass"
            >
              <p className="text-sm font-semibold text-ink">
                {r.apellido}, {r.nombre}
              </p>
              {r.habitacion && <p className="text-xs text-ink-soft">Hab. {r.habitacion}</p>}
            </Link>
          ))}
          {(residentes ?? []).length === 0 && (
            <p className="text-sm text-ink-soft">No hay residentes activos en esta sede.</p>
          )}
        </div>
      </main>
    </div>
  );
}
