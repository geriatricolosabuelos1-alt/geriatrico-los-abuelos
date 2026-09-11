import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { BotonDarDosis } from "@/components/BotonDarDosis";
import type { MedicamentoResidente, Perfil } from "@/lib/types";

type Params = { id: string };

function diasRestantes(m: MedicamentoResidente): number | null {
  if (!m.dosis_diaria || m.dosis_diaria <= 0) return null;
  return Math.floor(m.cantidad_stock / m.dosis_diaria);
}

type ResidenteConMeds = {
  id: string;
  nombre: string;
  apellido: string;
  medicamentos_residente: MedicamentoResidente[];
};

export default async function MedicacionSucursalPage({
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
      .select("id, nombre")
      .eq("id", id)
      .single<{ id: string; nombre: string }>(),
    supabase
      .from("residentes")
      .select(
        "id, nombre, apellido, medicamentos_residente(id, residente_id, nombre, dosis, cantidad_stock, notas, updated_at, dosis_diaria, frecuencia, horario, instrucciones, activo)",
      )
      .eq("sucursal_id", id)
      .eq("activo", true)
      .order("apellido")
      .returns<ResidenteConMeds[]>(),
  ]);

  if (!sucursal || !perfil) {
    notFound();
  }

  const residentesConMedicacion = (residentes ?? []).filter(
    (r) => r.medicamentos_residente.length > 0,
  );

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "medicacion" }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">
              {sucursal!.nombre}
            </p>
            <h1 className="font-display text-[32px] font-semibold text-ink">Medicación</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Registrá cada dosis administrada — el stock se descuenta automáticamente.
            </p>
          </div>
          <Link
            href={`/sucursales/${id}/medicacion/informe`}
            className="rounded-lg border border-edge px-3 py-2 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
          >
            Ver informe de stock
          </Link>
        </div>

        <div className="space-y-4">
          {residentesConMedicacion.length === 0 && (
            <p className="text-sm text-ink-soft">
              Ningún residente tiene medicación cargada todavía. Agregala desde el legajo de
              cada residente.
            </p>
          )}

          {residentesConMedicacion.map((r) => (
            <section key={r.id} className="rounded-2xl border border-edge bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
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

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
                      <th className="px-3 py-2">Medicamento</th>
                      <th className="px-3 py-2">Dosis</th>
                      <th className="px-3 py-2">Horario</th>
                      <th className="px-3 py-2">Stock</th>
                      <th className="px-3 py-2">Días restantes</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.medicamentos_residente
                      .sort((a, b) => a.nombre.localeCompare(b.nombre))
                      .map((m) => {
                        const restantes = diasRestantes(m);
                        return (
                          <tr key={m.id} className="border-t border-edge">
                            <td className="px-3 py-2 text-sm text-ink">{m.nombre}</td>
                            <td className="px-3 py-2 text-sm text-ink-soft">{m.dosis ?? "—"}</td>
                            <td className="px-3 py-2 text-xs text-ink-soft">
                              {m.horario ?? m.frecuencia ?? "—"}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`text-sm font-semibold ${
                                  m.cantidad_stock <= 5 ? "text-red-700" : "text-ink"
                                }`}
                              >
                                {m.cantidad_stock}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {restantes === null ? (
                                <span className="text-ink-soft">—</span>
                              ) : (
                                <span
                                  className={
                                    restantes <= 7
                                      ? "font-semibold text-red-700"
                                      : restantes <= 14
                                        ? "font-semibold text-amber-600"
                                        : "text-ink-soft"
                                  }
                                >
                                  {restantes} día{restantes === 1 ? "" : "s"}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <BotonDarDosis
                                sucursalId={id}
                                residenteId={r.id}
                                medicamentoId={m.id}
                                stockActual={m.cantidad_stock}
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
