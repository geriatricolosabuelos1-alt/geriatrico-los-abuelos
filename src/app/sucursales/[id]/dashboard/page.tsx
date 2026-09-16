import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { obtenerResumenSucursal } from "@/lib/dashboard";
import type { Perfil } from "@/lib/types";

type Params = { id: string };

const ETIQUETA_NIVEL: Record<string, string> = {
  aviso_7: "≤ 7 días",
  aviso_5: "≤ 5 días",
  sin_stock: "Sin stock",
};

const ESTILO_NIVEL: Record<string, string> = {
  aviso_7: "bg-amber-100 text-amber-800 border-amber-300",
  aviso_5: "bg-orange-100 text-orange-800 border-orange-300",
  sin_stock: "bg-red-100 text-red-800 border-red-300",
};

function formatearMonto(monto: number): string {
  return `$${Math.round(monto).toLocaleString("es-AR")}`;
}

export default async function DashboardSucursalPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, resumen] = await Promise.all([
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
    obtenerResumenSucursal(supabase, id),
  ]);

  if (!sucursal || !perfil) {
    notFound();
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "dashboard" }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">
            {sucursal!.nombre}
          </p>
          <h1 className="font-display text-[32px] font-semibold text-ink">Dashboard</h1>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <div className="rounded-2xl border border-edge bg-card p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Residentes activos
            </p>
            <p className="font-display text-3xl font-semibold tabular-nums lining-nums text-ink">
              {resumen.residentesActivos}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-transparent bg-warn p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Monto pendiente de cobro
            </p>
            <p className="font-display text-3xl font-semibold tabular-nums lining-nums text-ink">
              {formatearMonto(resumen.montoPendiente)}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {resumen.cantidadPendientes} cuota{resumen.cantidadPendientes === 1 ? "" : "s"}
              {resumen.cantidadVencidas > 0 ? `, ${resumen.cantidadVencidas} residente(s) con atraso` : ""}
            </p>
          </div>
          <div className="rounded-2xl border border-edge bg-card p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Alertas de medicación
            </p>
            <p
              className={`font-display text-3xl font-semibold tabular-nums lining-nums ${
                resumen.alertasMedicacion.length > 0 ? "text-red-700" : "text-ink"
              }`}
            >
              {resumen.alertasMedicacion.length}
            </p>
          </div>
          <div className="rounded-2xl border border-edge bg-card p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Alertas de insumos
            </p>
            <p
              className={`font-display text-3xl font-semibold tabular-nums lining-nums ${
                resumen.alertasInsumos.length > 0 ? "text-red-700" : "text-ink"
              }`}
            >
              {resumen.alertasInsumos.length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-edge bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-ink">
                Stock de medicación bajo
              </h2>
              <Link
                href={`/sucursales/${id}/medicacion`}
                className="text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
              >
                Ver módulo
              </Link>
            </div>
            {resumen.alertasMedicacion.length === 0 ? (
              <p className="text-xs text-ink-soft">Sin alertas activas.</p>
            ) : (
              <ul className="space-y-2">
                {resumen.alertasMedicacion.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                    <div>
                      <p className="font-medium text-ink">{a.medicamentoNombre}</p>
                      <p className="text-xs text-ink-soft">{a.residenteNombre}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${ESTILO_NIVEL[a.nivel]}`}
                    >
                      {ETIQUETA_NIVEL[a.nivel]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-edge bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-ink">
                Insumos con stock bajo
              </h2>
              <Link
                href={`/sucursales/${id}/inventario`}
                className="text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
              >
                Ver inventario
              </Link>
            </div>
            {resumen.alertasInsumos.length === 0 ? (
              <p className="text-xs text-ink-soft">Sin alertas activas.</p>
            ) : (
              <ul className="space-y-2">
                {resumen.alertasInsumos.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                    <div>
                      <p className="font-medium text-ink">{i.nombre}</p>
                      <p className="text-xs text-ink-soft">
                        {i.categoria === "medicos" ? "Insumo médico" : "Insumo varios"}
                      </p>
                    </div>
                    <span className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[0.65rem] font-semibold text-red-800">
                      {i.stockActual} / mín. {i.stockMinimo}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
