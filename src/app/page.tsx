import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
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
    .select("id, nombre, direccion")
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
    <>
      <NavBar
        nombre={perfil?.nombre_completo ?? user?.email ?? ""}
        rol={perfil?.rol ?? ""}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">
          Dashboard
        </h1>

        {esAdmin && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
              Totales combinados
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs text-slate-500">Residentes activos</p>
                <p className="text-3xl font-semibold text-slate-900">
                  {totalResidentesGlobal}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs text-slate-500">Pagos pendientes</p>
                <p className="text-3xl font-semibold text-slate-900">
                  {totalPagosPendientesGlobal}
                </p>
              </div>
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
            {esAdmin ? "Por sucursal" : "Tu sucursal"}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {resumenes
              .filter(
                (r) => esAdmin || r.sucursal.id === perfil?.sucursal_id,
              )
              .map((r) => (
                <div
                  key={r.sucursal.id}
                  className="rounded-xl border border-slate-200 bg-white p-5"
                >
                  <p className="mb-3 font-medium text-slate-900">
                    {r.sucursal.nombre}
                  </p>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-xs text-slate-500">Residentes</p>
                      <p className="text-xl font-semibold text-slate-900">
                        {r.totalResidentes}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">
                        Pagos pendientes
                      </p>
                      <p className="text-xl font-semibold text-slate-900">
                        {r.pagosPendientes}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </main>
    </>
  );
}
