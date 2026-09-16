import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { RecetarioClient } from "@/components/RecetarioClient";
import { listarRecetas } from "@/app/sucursales/[id]/medicacion/recetario/actions";
import type { MedicamentoResidente, Perfil } from "@/lib/types";

type Params = { id: string };

type ResidenteConMeds = {
  id: string;
  nombre: string;
  apellido: string;
  medicamentos_residente: MedicamentoResidente[];
  ficha_administrativa: { obra_social: string | null } | null;
};

export default async function RecetarioPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, { data: residentes }, recetas] = await Promise.all([
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
      .select(
        "id, nombre, apellido, ficha_administrativa(obra_social), medicamentos_residente(id, residente_id, nombre, dosis, dosis_diaria, frecuencia, horario, via_administracion, tipo_administracion, dosis_maxima_diaria, horarios, instrucciones, cantidad_stock, notas, activo, updated_at)",
      )
      .eq("sucursal_id", id)
      .eq("activo", true)
      .order("apellido")
      .returns<ResidenteConMeds[]>(),
    listarRecetas(id),
  ]);

  if (!sucursal || !perfil) {
    notFound();
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{
          tipo: "sucursal",
          sucursalId: id,
          seccion: "medicacion",
          subseccion: "recetario",
          area: "administrativa",
        }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal!.nombre}</p>
          <h1 className="font-display text-[32px] font-semibold text-ink">Recetario</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Recetas de PAMI / obras sociales para pedir antes de que se agote el stock de farmacia.
          </p>
        </div>

        <RecetarioClient sucursalId={id} residentes={residentes ?? []} recetas={recetas} />
      </main>
    </div>
  );
}
