import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { RecetarioClient } from "@/components/RecetarioClient";
import Link from "next/link";
import { listarRecetas } from "@/app/sucursales/[id]/medicacion/recetario/actions";
import { calcularAlertasRecetas, DIAS_AVISO_PEDIDA, DIAS_AVISO_VENCIMIENTO } from "@/lib/recetas";
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

  const alertas = calcularAlertasRecetas(recetas);

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal!.nombre}</p>
            <h1 className="font-display text-[32px] font-semibold text-ink">Recetario</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Recetas de PAMI / obras sociales para pedir antes de que se agote el stock de farmacia.
            </p>
          </div>
          <Link
            href={`/sucursales/${id}/medicacion/recetario/pedido`}
            className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90"
          >
            Pedido de recetas (PDF)
          </Link>
        </div>

        {alertas.total > 0 && (
          <div className="alerta-pulso space-y-1 rounded-2xl border border-red-300 bg-red-50 px-5 py-3 text-sm text-red-800">
            <p className="flex items-center gap-2 font-semibold">
              <span className="alerta-punto h-2 w-2 rounded-full bg-red-600" />
              Recetas que requieren atención
            </p>
            {alertas.paraPedir > 0 && (
              <p>
                · {alertas.paraPedir} receta{alertas.paraPedir === 1 ? "" : "s"} pendiente
                {alertas.paraPedir === 1 ? "" : "s"} de pedir.
              </p>
            )}
            {alertas.pedidasDemoradas > 0 && (
              <p>
                · {alertas.pedidasDemoradas} pedida{alertas.pedidasDemoradas === 1 ? "" : "s"} hace más de{" "}
                {DIAS_AVISO_PEDIDA} días y todavía sin recibir.
              </p>
            )}
            {alertas.porVencer > 0 && (
              <p>
                · {alertas.porVencer} vencida{alertas.porVencer === 1 ? "" : "s"} o por vencer (menos de{" "}
                {DIAS_AVISO_VENCIMIENTO} días).
              </p>
            )}
          </div>
        )}

        <RecetarioClient sucursalId={id} residentes={residentes ?? []} recetas={recetas} />
      </main>
    </div>
  );
}
