import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { NuevoPagoForm } from "@/components/NuevoPagoForm";
import { AccionesPago } from "@/components/AccionesPago";
import type { Perfil } from "@/lib/types";

type Params = { id: string };

type FilaPago = {
  id: string;
  monto: number;
  mes: number;
  anio: number;
  estado: "pendiente" | "pagado";
  fecha_pago: string | null;
};

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function diasDeAtraso(pago: FilaPago, diaVencimiento: number): number {
  const fechaVencimiento = new Date(pago.anio, pago.mes - 1, diaVencimiento);
  const fechaComparar = pago.fecha_pago ? new Date(pago.fecha_pago + "T00:00:00") : new Date();
  const diffMs = fechaComparar.getTime() - fechaVencimiento.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

export default async function CuentaCorrientePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol, sucursal_id, activo")
    .eq("id", user!.id)
    .single<Perfil>();

  const { data: residente } = await supabase
    .from("residentes")
    .select("id, nombre, apellido, sucursal_id")
    .eq("id", id)
    .single<{ id: string; nombre: string; apellido: string; sucursal_id: string }>();

  if (!residente || !perfil) {
    notFound();
  }

  const { data: fichaAdministrativa } = await supabase
    .from("ficha_administrativa")
    .select("porcentaje_recargo_mora, fecha_vencimiento_cuota")
    .eq("residente_id", id)
    .maybeSingle<{ porcentaje_recargo_mora: number | null; fecha_vencimiento_cuota: string | null }>();

  const { data: pagos } = await supabase
    .from("pagos")
    .select("id, monto, mes, anio, estado, fecha_pago")
    .eq("residente_id", id)
    .order("anio", { ascending: false })
    .order("mes", { ascending: false })
    .returns<FilaPago[]>();

  const diaVencimiento = fichaAdministrativa?.fecha_vencimiento_cuota
    ? new Date(fichaAdministrativa.fecha_vencimiento_cuota + "T00:00:00").getDate()
    : 10;
  const porcentajeRecargo = fichaAdministrativa?.porcentaje_recargo_mora ?? 0;

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil}
        activo={{
          tipo: "sucursal",
          sucursalId: residente.sucursal_id,
          seccion: "cuotas",
        }}
      />

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-9 py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">
              Cuenta corriente
            </p>
            <h1 className="font-display text-2xl font-bold text-ink">
              {residente.apellido}, {residente.nombre}
            </h1>
          </div>
          <Link
            href={`/sucursales/${residente.sucursal_id}/cuotas`}
            className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
          >
            Volver a Aranceles
          </Link>
        </div>

        <NuevoPagoForm residenteId={id} sucursalId={residente.sucursal_id} />

        <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha de pago</th>
                <th className="px-4 py-3">Días de atraso</th>
                <th className="px-4 py-3">Recargo por mora</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(pagos ?? []).map((p) => {
                const atraso = diasDeAtraso(p, diaVencimiento);
                const recargo = atraso > 0 ? (p.monto * porcentajeRecargo) / 100 : 0;
                return (
                  <tr key={p.id} className="border-b border-edge last:border-0">
                    <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                      {MESES[p.mes]} {p.anio}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">${p.monto.toLocaleString("es-AR")}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          p.estado === "pagado"
                            ? "rounded-full bg-brass-soft px-2 py-0.5 text-xs font-medium text-brass"
                            : "rounded-full bg-edge px-2 py-0.5 text-xs font-medium text-ink-soft"
                        }
                      >
                        {p.estado === "pagado" ? "Pagado" : "Pendiente"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                      {p.fecha_pago
                        ? new Date(p.fecha_pago + "T00:00:00").toLocaleDateString("es-AR")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {atraso > 0 ? (
                        <span className="text-red-400">{atraso} días</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {recargo > 0 ? `$${recargo.toLocaleString("es-AR")}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AccionesPago residenteId={id} pagoId={p.id} estado={p.estado} />
                    </td>
                  </tr>
                );
              })}
              {(pagos ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-ink-soft">
                    Todavía no hay pagos cargados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
