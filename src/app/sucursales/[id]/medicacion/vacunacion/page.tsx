import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { areaSegunRol } from "@/lib/roles";
import { VacunacionClient } from "@/components/VacunacionClient";
import { listarVacunacionesSucursal } from "@/app/sucursales/[id]/medicacion/vacunacion-actions";
import type { Perfil } from "@/lib/types";

type Params = { id: string };
type ResidenteBasico = { id: string; nombre: string; apellido: string };

export default async function VacunacionPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, { data: residentes }, vacunaciones] = await Promise.all([
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
      .eq("activo", true)
      .order("apellido")
      .returns<ResidenteBasico[]>(),
    listarVacunacionesSucursal(id),
  ]);

  if (!sucursal || !perfil) notFound();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{
          tipo: "sucursal",
          sucursalId: id,
          seccion: "medicacion",
          subseccion: "vacunacion",
          area: areaSegunRol(perfil!.rol),
        }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal!.nombre}</p>
            <h1 className="font-display text-[32px] font-semibold text-ink">Esquema de vacunación</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Antigripal anual, neumococo, COVID-19 y otras vacunas aplicadas a los residentes.
            </p>
          </div>
          <Link
            href={`/sucursales/${id}/medicacion/vacunacion/planilla`}
            className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90"
          >
            Planilla completa (PDF)
          </Link>
        </div>

        <VacunacionClient sucursalId={id} residentes={residentes ?? []} vacunaciones={vacunaciones} />
      </main>
    </div>
  );
}
