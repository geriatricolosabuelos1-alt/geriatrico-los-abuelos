import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { BotonExportarPdf } from "@/components/BotonExportarPdf";
import type { NivelCuidado, Perfil } from "@/lib/types";

type Params = { id: string };

type FilaResidenteOcupacion = {
  fecha_ingreso: string | null;
  fecha_egreso: string | null;
  activo: boolean;
  nivel_cuidado: NivelCuidado | null;
};

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

const ETIQUETA_NIVEL: Record<NivelCuidado, string> = {
  autovalido: "Autoválido",
  asistido: "Asistido",
  dependiente: "Dependiente",
};

const ORDEN_NIVELES: NivelCuidado[] = ["autovalido", "asistido", "dependiente"];

function estuvoActivoEnMes(
  r: FilaResidenteOcupacion,
  inicioMes: Date,
  finMes: Date,
): boolean {
  const ingreso = r.fecha_ingreso ? new Date(r.fecha_ingreso + "T00:00:00") : null;
  const egreso = r.fecha_egreso ? new Date(r.fecha_egreso + "T00:00:00") : null;

  // Sin fecha de ingreso cargada (legajo incompleto): no podemos saber
  // desde cuando ocupa la cama, asi que se toma el estado "activo" actual
  // como mejor estimacion disponible para todo el rango del grafico.
  if (!ingreso) return r.activo;

  if (ingreso > finMes) return false;
  if (egreso && egreso < inicioMes) return false;
  return true;
}

export default async function ReportesSucursalPage({
  params,
}: {
  params: Promise<Params>;
}) {
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
      .select("id, nombre, capacidad_camas")
      .eq("id", id)
      .single<{ id: string; nombre: string; capacidad_camas: number | null }>(),
    supabase
      .from("residentes")
      .select("fecha_ingreso, fecha_egreso, activo, nivel_cuidado")
      .eq("sucursal_id", id)
      .returns<FilaResidenteOcupacion[]>(),
  ]);

  if (!sucursal || !perfil) {
    notFound();
  }

  const listaResidentes = residentes ?? [];
  const ahora = new Date();

  const meses = Array.from({ length: 9 }).map((_, i) => {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - (8 - i), 1);
    const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
    const ocupadas = listaResidentes.filter((r) =>
      estuvoActivoEnMes(r, inicioMes, finMes),
    ).length;
    return {
      label: MESES_CORTOS[fecha.getMonth()],
      ocupadas,
    };
  });

  const capacidad = sucursal.capacidad_camas ?? Math.max(...meses.map((m) => m.ocupadas), 1);
  const maxOcupadas = Math.max(...meses.map((m) => m.ocupadas), 1);
  const escalaMax = Math.max(capacidad, maxOcupadas);

  const activosConNivel = listaResidentes.filter((r) => r.activo);
  const totalActivos = activosConNivel.length || 1;
  const nivelesConteo = ORDEN_NIVELES.map((nivel) => {
    const cantidad = activosConNivel.filter((r) => r.nivel_cuidado === nivel).length;
    return { nivel, cantidad, porcentaje: (cantidad / totalActivos) * 100 };
  });

  return (
    <div className="flex min-h-screen w-full">
      <div className="print:hidden">
        <Sidebar
          perfil={perfil!}
          activo={{ tipo: "sucursal", sucursalId: id, seccion: "reportes" }}
        />
      </div>

      <main className="flex-1 space-y-6 px-9 py-8 print:px-0 print:py-0">
        <style>{`@page { size: A4 landscape; margin: 14mm; }`}</style>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">
              Últimos 9 meses
            </p>
            <h1 className="font-display text-[32px] font-semibold text-ink">Reportes</h1>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <p className="text-sm text-ink-soft">
              {ahora.toLocaleDateString("es-AR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <BotonExportarPdf />
            <Link
              href={`/sucursales/${id}/cuotas/informe-deudores`}
              className="rounded-full bg-brass px-4 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90"
            >
              Armar informe
            </Link>
          </div>
        </div>

        <section className="rounded-2xl border border-edge bg-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">
              Ocupación por mes · {sucursal!.nombre}
            </h2>
            <div className="flex items-center gap-4 text-xs text-ink-soft">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brass" /> Camas ocupadas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-edge" /> Libres
              </span>
            </div>
          </div>

          <div className="grid grid-cols-9 items-end gap-3" style={{ height: 220 }}>
            {meses.map((m) => {
              const alturaOcupadas = (m.ocupadas / escalaMax) * 100;
              return (
                <div key={m.label} className="flex h-full flex-col items-center justify-end">
                  <p className="mb-1.5 text-xs font-semibold text-ink">{m.ocupadas}</p>
                  <div className="flex w-full flex-1 flex-col justify-end overflow-hidden rounded-t-xl bg-edge">
                    <div
                      className="w-full rounded-t-xl bg-brass"
                      style={{ height: `${alturaOcupadas}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[0.65rem] uppercase tracking-wide text-ink-soft">
                    {m.label}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-ink-soft">
            Los meses de residentes sin fecha de ingreso cargada en el legajo se estiman
            con su estado activo/inactivo actual.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-edge bg-card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">
              Nivel de cuidado
            </h2>
            <div className="space-y-4">
              {nivelesConteo.map(({ nivel, cantidad, porcentaje }) => (
                <div key={nivel}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-ink">{ETIQUETA_NIVEL[nivel]}</span>
                    <span className="font-semibold text-ink">{cantidad}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-edge">
                    <div
                      className="h-full rounded-full bg-brass"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-ink-soft">
              Se carga desde el legajo de cada residente, sección Estadía.
            </p>
          </section>

          <section className="rounded-2xl border border-edge bg-card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">
              Informes disponibles
            </h2>
            <div className="space-y-3">
              <Link
                href={`/sucursales/${id}/cuotas/informe-deudores`}
                className="flex items-center justify-between rounded-xl border border-edge bg-panel-deep px-4 py-3 hover:border-brass"
              >
                <div>
                  <p className="text-sm font-medium text-ink">Cobranza / deudores</p>
                  <p className="text-xs text-ink-soft">PDF · generado al abrir</p>
                </div>
                <span className="text-xs font-semibold text-brass">Ver</span>
              </Link>
              <div className="flex items-center justify-between rounded-xl border border-edge bg-panel-deep px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">Ocupación · {sucursal!.nombre}</p>
                  <p className="text-xs text-ink-soft">
                    PDF · {meses[meses.length - 1].ocupadas} de {escalaMax} camas este mes
                  </p>
                </div>
                <span className="print:hidden">
                  <BotonExportarPdf />
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
