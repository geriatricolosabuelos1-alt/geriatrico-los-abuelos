import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import type { Perfil, Sucursal } from "@/lib/types";

type ResumenSucursal = {
  sucursal: Sucursal;
  totalResidentes: number;
  pagosPendientes: number;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol, sucursal_id, activo")
    .eq("id", user!.id)
    .single<Perfil>();

  const esAdmin = perfil?.rol === "admin";

  const { data: sucursales } = await supabase
    .from("sucursales")
    .select("id, nombre, direccion, capacidad_camas")
    .order("nombre")
    .returns<Sucursal[]>();

  const listaSucursales = sucursales ?? [];

  const resumenes: ResumenSucursal[] = await Promise.all(
    listaSucursales.map(async (sucursal) => {
      const { count: totalResidentes } = await supabase
        .from("residentes")
        .select("id", { count: "exact", head: true })
        .eq("sucursal_id", sucursal.id)
        .eq("activo", true);

      const { count: pagosPendientes } = await supabase
        .from("pagos")
        .select("id", { count: "exact", head: true })
        .eq("sucursal_id", sucursal.id)
        .eq("estado", "pendiente");

      return {
        sucursal,
        totalResidentes: totalResidentes ?? 0,
        pagosPendientes: pagosPendientes ?? 0,
      };
    }),
  );

  const totalResidentesGlobal = resumenes.reduce(
    (acc, r) => acc + r.totalResidentes,
    0,
  );
  const totalPagosPendientesGlobal = resumenes.reduce(
    (acc, r) => acc + r.pagosPendientes,
    0,
  );

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar perfil={perfil!} activo={{ tipo: "dashboard" }} />

      <main className="flex-1 px-9 py-8">
        <h1 className="mb-6 font-display text-2xl font-bold text-ink">
          Dashboard
        </h1>

        {esAdmin && (
          <section className="mb-7">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-soft">
              Totales combinados
            </h2>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2">
              <div className="relative overflow-hidden rounded-2xl border border-edge bg-card p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Residentes activos
                </p>
                <p className="font-display text-3xl font-bold text-ink">
                  {totalResidentesGlobal}
                </p>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-edge bg-card p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Pagos pendientes
                </p>
                <p className="font-display text-3xl font-bold text-ink">
                  {totalPagosPendientesGlobal}
                </p>
              </div>
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-soft">
            {esAdmin ? "Por sucursal" : "Tu sucursal"}
          </h2>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {resumenes
              .filter(
                (r) => esAdmin || r.sucursal.id === perfil?.sucursal_id,
              )
              .map((r) => (
                <div
                  key={r.sucursal.id}
                  className="rounded-2xl border border-edge bg-card p-5"
                >
                  <p className="mb-3 font-display font-semibold text-ink">
                    {r.sucursal.nombre}
                  </p>
                  <div className="flex gap-7">
                    <div>
                      <p className="text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
                        Residentes
                      </p>
                      <p className="font-display text-xl font-bold text-brass">
                        {r.totalResidentes}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
                        Pagos pendientes
                      </p>
                      <p className="font-display text-xl font-bold text-brass">
                        {r.pagosPendientes}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}
