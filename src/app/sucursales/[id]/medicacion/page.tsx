import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { MedicacionResidente } from "@/components/MedicacionResidente";
import { MarResidente } from "@/components/MarResidente";
import {
  evaluarPolifarmacia,
  listarCatalogoMedicamentos,
  obtenerDosisSosHoy,
  obtenerTomasDeHoy,
} from "@/app/residentes/[id]/legajo/medicacion-actions";
import type { AlertaMedicacion, MedicamentoResidente, Perfil } from "@/lib/types";

type Params = { id: string };
type SearchParams = { vista?: string };

type ResidenteConMeds = {
  id: string;
  nombre: string;
  apellido: string;
  medicamentos_residente: MedicamentoResidente[];
};

export default async function MedicacionSucursalPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { vista } = await searchParams;
  const esMedicina = vista === "medicina";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, { data: residentes }, { data: alertas }, catalogo] =
    await Promise.all([
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
          "id, nombre, apellido, medicamentos_residente(id, residente_id, nombre, dosis, dosis_diaria, frecuencia, horario, via_administracion, tipo_administracion, dosis_maxima_diaria, horarios, instrucciones, cantidad_stock, notas, activo, cambio_reciente_at, updated_at)",
        )
        .eq("sucursal_id", id)
        .eq("activo", true)
        .order("apellido")
        .returns<ResidenteConMeds[]>(),
      supabase
        .from("alertas_medicacion")
        .select("id, medicamento_id, residente_id, dias_restantes, nivel, creada_at, notificada, resuelta")
        .eq("resuelta", false)
        .returns<AlertaMedicacion[]>(),
      listarCatalogoMedicamentos(),
    ]);

  if (!sucursal || !perfil) {
    notFound();
  }

  const listaResidentes = residentes ?? [];

  const datosMar = esMedicina
    ? await Promise.all(
        listaResidentes.map(async (r) => ({
          residenteId: r.id,
          tomas: await obtenerTomasDeHoy(r.id),
          dosisSosHoy: await obtenerDosisSosHoy(r.id),
          polifarmacia: await evaluarPolifarmacia(r.id),
        })),
      )
    : [];
  const datosMarPorResidente = new Map(datosMar.map((d) => [d.residenteId, d]));

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{
          tipo: "sucursal",
          sucursalId: id,
          seccion: "medicacion",
          area: esMedicina ? "medicina" : "administrativa",
        }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">
              {sucursal!.nombre}
            </p>
            <h1 className="font-display text-[32px] font-semibold text-ink">
              {esMedicina ? "Medicamentos" : "Medicación"}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {esMedicina
                ? "Planilla de administración de medicamentos: marcá cada toma del día por horario."
                : "Cargá, editá o dá de baja medicación, registrá ingresos y administrá dosis — todo se refleja también en el legajo de cada residente."}
            </p>
          </div>
          {!esMedicina && (
            <Link
              href={`/sucursales/${id}/medicacion/informe`}
              className="rounded-lg border border-edge px-3 py-2 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
            >
              Ver informe de stock
            </Link>
          )}
        </div>

        <div className="space-y-4">
          {listaResidentes.length === 0 && (
            <p className="text-sm text-ink-soft">No hay residentes activos en esta sede.</p>
          )}

          {esMedicina
            ? listaResidentes.map((r) => {
                const datos = datosMarPorResidente.get(r.id);
                const activos = r.medicamentos_residente.filter((m) => m.activo);
                return (
                  <MarResidente
                    key={r.id}
                    residenteId={r.id}
                    residenteNombre={`${r.apellido}, ${r.nombre}`}
                    sucursalId={id}
                    medicamentosContinuos={activos.filter((m) => m.tipo_administracion !== "sos")}
                    medicamentosSos={activos.filter((m) => m.tipo_administracion === "sos")}
                    tomas={datos?.tomas ?? []}
                    dosisSosHoy={datos?.dosisSosHoy ?? {}}
                    polifarmacia={datos?.polifarmacia ?? { totalActivos: 0, esPolifarmacia: false, duplicados: [] }}
                  />
                );
              })
            : listaResidentes.map((r) => (
                <div key={r.id}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <h2 className="font-display text-base font-semibold text-ink">
                      {r.apellido}, {r.nombre}
                    </h2>
                    <Link
                      href={`/residentes/${r.id}/legajo`}
                      className="text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                    >
                      Ver legajo
                    </Link>
                  </div>

                  <MedicacionResidente
                    residenteId={r.id}
                    medicamentos={r.medicamentos_residente}
                    alertas={(alertas ?? []).filter((a) => a.residente_id === r.id)}
                    catalogo={catalogo}
                    sucursalId={id}
                  />
                </div>
              ))}
        </div>
      </main>
    </div>
  );
}
