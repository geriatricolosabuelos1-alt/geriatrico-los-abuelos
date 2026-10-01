import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { FichaNutricionResidente } from "@/components/FichaNutricionResidente";
import { listarFichasNutricion } from "@/app/sucursales/[id]/nutricion/actions";
import type { FichaNutricion } from "@/lib/nutricion";
import type { Perfil, RolUsuario } from "@/lib/types";

type Params = { id: string };

type ResidenteBasico = { id: string; nombre: string; apellido: string };

// Cargan la ficha: nutricionista y médica (y admin / gerente de la sede).
const ROLES_CARGAN: RolUsuario[] = ["admin", "gerente_sede", "medico", "nutricionista"];

export default async function NutricionPage({ params }: { params: Promise<Params> }) {
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
      .eq("activo", true)
      .order("apellido")
      .returns<ResidenteBasico[]>(),
  ]);

  if (!sucursal || !perfil) notFound();

  const listaResidentes = residentes ?? [];
  const fichas = await listarFichasNutricion(listaResidentes.map((r) => r.id));
  const fichasPorResidente = new Map<string, FichaNutricion[]>();
  for (const f of fichas) {
    fichasPorResidente.set(f.residente_id, [...(fichasPorResidente.get(f.residente_id) ?? []), f]);
  }
  const puedeEditar = ROLES_CARGAN.includes(perfil!.rol);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "nutricion", area: "medicina" }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal!.nombre}</p>
            <h1 className="font-display text-[32px] font-semibold text-ink">Nutrición</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Ficha nutricional de cada residente. Cada vez que se actualiza queda guardada la anterior.
            </p>
          </div>
          {listaResidentes.length > 0 && (
            <a
              href={`/sucursales/${id}/nutricion/imprimir`}
              className="rounded-lg border border-edge px-3 py-2 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
            >
              Imprimir todas las fichas
            </a>
          )}
        </div>

        <div className="space-y-4">
          {listaResidentes.length === 0 && (
            <p className="text-sm text-ink-soft">No hay residentes activos en esta sede.</p>
          )}
          {listaResidentes.map((r) => (
            <FichaNutricionResidente
              key={r.id}
              sucursalId={id}
              residenteId={r.id}
              residenteNombre={`${r.apellido}, ${r.nombre}`}
              fichas={fichasPorResidente.get(r.id) ?? []}
              puedeEditar={puedeEditar}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
