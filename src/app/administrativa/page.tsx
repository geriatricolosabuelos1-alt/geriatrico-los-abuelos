import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { obtenerResumenSucursal, type ResumenSucursalDashboard } from "@/lib/dashboard";
import type { Perfil, Sucursal } from "@/lib/types";

type ResumenSucursal = {
  sucursal: Sucursal;
  resumen: ResumenSucursalDashboard;
};

function formatearMonto(monto: number): string {
  return `$${Math.round(monto).toLocaleString("es-AR")}`;
}

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
    listaSucursales.map(async (sucursal) => ({
      sucursal,
      resumen: await obtenerResumenSucursal(supabase, sucursal.id),
    })),
  );

  const totalResidentesGlobal = resumenes.reduce(
    (acc, r) => acc + r.resumen.residentesActivos,
    0,
  );
  const totalMontoPendienteGlobal = resumenes.reduce(
    (acc, r) => acc + r.resumen.montoPendiente,
    0,
  );
  const totalAlertasMedicacionGlobal = resumenes.reduce(
    (acc, r) => acc + r.resumen.alertasMedicacion.length,
    0,
  );
  const totalAlertasInsumosGlobal = resumenes.reduce(
    (acc, r) => acc + r.resumen.alertasInsumos.length,
    0,
  );

  const resumenesVisibles = resumenes.filter(
    (r) => esAdmin || r.sucursal.id === perfil?.sucursal_id,
  );

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar perfil={perfil!} activo={{ tipo: "dashboard" }} />

      <main className="flex-1 px-9 py-8">
        <h1 className="mb-6 font-display text-[32px] font-semibold text-ink">
          Dashboard general
        </h1>

        {esAdmin && (
          <section className="mb-7">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-soft">
              Totales combinados (ambas sedes)
            </h2>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <div className="rounded-2xl border border-edge bg-card p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Residentes activos
                </p>
                <p className="font-display text-3xl font-semibold tabular-nums lining-nums text-ink">
                  {totalResidentesGlobal}
                </p>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-transparent bg-warn p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Monto pendiente de cobro
                </p>
                <p className="font-display text-3xl font-semibold tabular-nums lining-nums text-ink">
                  {formatearMonto(totalMontoPendienteGlobal)}
                </p>
              </div>
              <div className="rounded-2xl border border-edge bg-card p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Alertas de medicación
                </p>
                <p
                  className={`font-display text-3xl font-semibold tabular-nums lining-nums ${
                    totalAlertasMedicacionGlobal > 0 ? "text-red-700" : "text-ink"
                  }`}
                >
                  {totalAlertasMedicacionGlobal}
                </p>
              </div>
              <div className="rounded-2xl border border-edge bg-card p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Alertas de insumos
                </p>
                <p
                  className={`font-display text-3xl font-semibold tabular-nums lining-nums ${
                    totalAlertasInsumosGlobal > 0 ? "text-red-700" : "text-ink"
                  }`}
                >
                  {totalAlertasInsumosGlobal}
                </p>
              </div>
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-soft">
            {esAdmin ? "Por sede" : "Tu sede"}
          </h2>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {resumenesVisibles.map((r) => (
              <Link
                key={r.sucursal.id}
                href={`/sucursales/${r.sucursal.id}/dashboard`}
                className="rounded-2xl border border-edge bg-card p-5 transition-colors hover:border-brass"
              >
                <p className="mb-3 font-display font-semibold text-ink">{r.sucursal.nombre}</p>
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                      Residentes
                    </p>
                    <p className="font-display text-xl font-semibold tabular-nums lining-nums text-brass">
                      {r.resumen.residentesActivos}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                      Pendiente de cobro
                    </p>
                    <p className="font-display text-xl font-semibold tabular-nums lining-nums text-brass">
                      {formatearMonto(r.resumen.montoPendiente)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                      Alertas medicación
                    </p>
                    <p
                      className={`font-display text-xl font-semibold tabular-nums lining-nums ${
                        r.resumen.alertasMedicacion.length > 0 ? "text-red-700" : "text-ink"
                      }`}
                    >
                      {r.resumen.alertasMedicacion.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                      Alertas insumos
                    </p>
                    <p
                      className={`font-display text-xl font-semibold tabular-nums lining-nums ${
                        r.resumen.alertasInsumos.length > 0 ? "text-red-700" : "text-ink"
                      }`}
                    >
                      {r.resumen.alertasInsumos.length}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
