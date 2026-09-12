import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { IngestaResidente } from "@/components/IngestaResidente";
import { obtenerIngestaDeHoy } from "@/app/sucursales/[id]/nutricion/actions";
import type { Perfil } from "@/lib/types";

type Params = { id: string };
type ResidenteBasico = { id: string; nombre: string; apellido: string; foto_url: string | null; habitacion: string | null };

export default async function IngestaPage({ params }: { params: Promise<Params> }) {
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
      .select("id, nombre, apellido, foto_url, habitacion")
      .eq("sucursal_id", id)
      .eq("activo", true)
      .order("habitacion")
      .returns<ResidenteBasico[]>(),
  ]);

  if (!sucursal || !perfil) notFound();

  const listaResidentes = residentes ?? [];
  const datos = await Promise.all(
    listaResidentes.map(async (r) => ({
      residenteId: r.id,
      registros: await obtenerIngestaDeHoy(r.id),
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
          subseccion: "ingesta",
          area: "medicina",
        }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal!.nombre}</p>
          <h1 className="font-display text-[32px] font-semibold text-ink">Ingesta diaria</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Registrá lo que consumió cada residente en cada comida de hoy, con un toque.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listaResidentes.map((r) => (
            <IngestaResidente
              key={r.id}
              sucursalId={id}
              residenteId={r.id}
              residenteNombre={`${r.apellido}, ${r.nombre}`}
              fotoUrl={r.foto_url}
              habitacion={r.habitacion}
              registros={datosPorResidente.get(r.id)?.registros ?? []}
            />
          ))}
          {listaResidentes.length === 0 && (
            <p className="text-sm text-ink-soft">No hay residentes activos en esta sede.</p>
          )}
        </div>
      </main>
    </div>
  );
}
