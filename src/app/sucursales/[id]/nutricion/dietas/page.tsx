import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { PrescripcionDietariaResidente } from "@/components/PrescripcionDietariaResidente";
import { listarPrescripcionActiva, listarRestricciones } from "@/app/sucursales/[id]/nutricion/actions";
import type { Perfil } from "@/lib/types";

type Params = { id: string };
type ResidenteBasico = { id: string; nombre: string; apellido: string };

export default async function DietasPage({ params }: { params: Promise<Params> }) {
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
  const datos = await Promise.all(
    listaResidentes.map(async (r) => ({
      residenteId: r.id,
      prescripcion: await listarPrescripcionActiva(r.id),
      restricciones: await listarRestricciones(r.id),
    })),
  );
  const datosPorResidente = new Map(datos.map((d) => [d.residenteId, d]));

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{
          tipo: "sucursal",
          sucursalId: id,
          seccion: "nutricion",
          subseccion: "dietas",
          area: "medicina",
        }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal!.nombre}</p>
          <h1 className="font-display text-[32px] font-semibold text-ink">Prescripción dietaria</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Tipo de dieta, consistencia IDDSI y restricciones por residente.
          </p>
        </div>

        <div className="space-y-4">
          {listaResidentes.length === 0 && (
            <p className="text-sm text-ink-soft">No hay residentes activos en esta sede.</p>
          )}
          {listaResidentes.map((r) => {
            const d = datosPorResidente.get(r.id);
            return (
              <PrescripcionDietariaResidente
                key={r.id}
                sucursalId={id}
                residenteId={r.id}
                residenteNombre={`${r.apellido}, ${r.nombre}`}
                prescripcion={d?.prescripcion ?? null}
                restricciones={d?.restricciones ?? []}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}
