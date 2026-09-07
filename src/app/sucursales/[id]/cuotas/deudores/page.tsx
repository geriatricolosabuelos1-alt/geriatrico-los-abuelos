import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { BotonImprimir } from "@/components/BotonImprimir";
import { calcularResumenCuenta, type PagoResumen } from "@/lib/aranceles";
import type { Perfil } from "@/lib/types";

type Params = { id: string };

type FilaResidenteArancel = {
  id: string;
  nombre: string;
  apellido: string;
  contacto_familiar: string | null;
  telefono_familiar: string | null;
  ficha_administrativa: {
    porcentaje_recargo_mora: number | null;
    fecha_vencimiento_cuota: string | null;
  } | null;
};

export default async function DeudoresSucursalPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, { data: residentes }, { data: pagos }] =
    await Promise.all([
      supabase
        .from("perfiles")
        .select("id, nombre_completo, rol, sucursal_id, activo")
        .eq("id", user!.id)
        .single<Perfil>(),
      supabase.from("sucursales").select("id, nombre").eq("id", id).single<{
        id: string;
        nombre: string;
      }>(),
      supabase
        .from("residentes")
        .select(
          "id, nombre, apellido, contacto_familiar, telefono_familiar, ficha_administrativa(porcentaje_recargo_mora, fecha_vencimiento_cuota)",
        )
        .eq("sucursal_id", id)
        .eq("activo", true)
        .order("apellido")
        .returns<FilaResidenteArancel[]>(),
      supabase
        .from("pagos")
        .select("residente_id, monto, monto_pagado, mes, anio, estado, fecha_pago")
        .eq("sucursal_id", id)
        .returns<(PagoResumen & { residente_id: string })[]>(),
    ]);

  if (!sucursal || !perfil) {
    notFound();
  }

  const deudores = (residentes ?? [])
    .map((r) => {
      const pagosDelResidente = (pagos ?? []).filter((p) => p.residente_id === r.id);
      const diaVencimiento = r.ficha_administrativa?.fecha_vencimiento_cuota
        ? new Date(r.ficha_administrativa.fecha_vencimiento_cuota + "T00:00:00").getDate()
        : 10;
      const resumen = calcularResumenCuenta(
        pagosDelResidente,
        diaVencimiento,
        r.ficha_administrativa?.porcentaje_recargo_mora ?? 0,
      );
      return { residente: r, resumen };
    })
    .filter((d) => d.resumen.cantidadPendientes > 0)
    .sort((a, b) => b.resumen.diasMoraMax - a.resumen.diasMoraMax);

  return (
    <div className="flex min-h-screen w-full">
      <div className="print:hidden">
        <Sidebar
          perfil={perfil!}
          activo={{ tipo: "sucursal", sucursalId: id, seccion: "cuotas" }}
        />
      </div>

      <main className="flex-1 space-y-6 px-9 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">
              {sucursal!.nombre}
            </p>
            <h1 className="font-display text-2xl font-bold text-ink">
              Listado de residentes con cuota adeudada
            </h1>
            <p className="mt-1 text-xs text-ink-soft">
              Generado el {new Date().toLocaleDateString("es-AR")} · {deudores.length} residente(s)
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Link
              href={`/sucursales/${id}/cuotas`}
              className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink"
            >
              Volver a Aranceles
            </Link>
            <BotonImprimir />
          </div>
        </div>

        {deudores.length === 0 ? (
          <p className="rounded-2xl border border-edge bg-card p-6 text-center text-ink-soft">
            No hay residentes con cuota adeudada en esta sucursal.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-4 py-3">Residente</th>
                  <th className="px-4 py-3">Contacto familiar</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Períodos adeudados</th>
                  <th className="px-4 py-3">Días de mora</th>
                  <th className="px-4 py-3">Monto adeudado</th>
                </tr>
              </thead>
              <tbody>
                {deudores.map(({ residente: r, resumen }) => (
                  <tr key={r.id} className="border-b border-edge last:border-0">
                    <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                      {r.apellido}, {r.nombre}
                    </td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                      {r.contacto_familiar ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                      {r.telefono_familiar ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{resumen.cantidadPendientes}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={
                          resumen.diasMoraMax > 0
                            ? "font-semibold text-red-400"
                            : "text-ink-soft"
                        }
                      >
                        {resumen.diasMoraMax > 0 ? `${resumen.diasMoraMax} días` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-brass whitespace-nowrap">
                      ${resumen.totalAdeudado.toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
