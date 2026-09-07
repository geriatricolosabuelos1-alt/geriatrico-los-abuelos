import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { AccionesPago } from "@/components/AccionesPago";
import { EditorArancel } from "@/components/EditorArancel";
import { diasDeAtraso } from "@/lib/aranceles";
import type { Perfil } from "@/lib/types";

type Params = { id: string };

type FilaPago = {
  id: string;
  monto: number;
  monto_pagado: number;
  mes: number;
  anio: number;
  estado: "pendiente" | "parcial" | "pagado";
  fecha_pago: string | null;
  tipo_pago: "obra_social" | "paciente";
};

const ETIQUETA_ESTADO: Record<FilaPago["estado"], string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  pagado: "Pagado",
};

const CLASE_ESTADO: Record<FilaPago["estado"], string> = {
  pendiente: "bg-edge text-ink-soft",
  parcial: "bg-amber-500/15 text-amber-400",
  pagado: "bg-brass-soft text-brass",
};

const ETIQUETA_TIPO_PAGO: Record<FilaPago["tipo_pago"], string> = {
  obra_social: "Obra social",
  paciente: "Paciente",
};

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

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
    .select(
      "cuota_mensual, monto_cobertura_obra_social, porcentaje_recargo_mora, fecha_vencimiento_cuota",
    )
    .eq("residente_id", id)
    .maybeSingle<{
      cuota_mensual: number | null;
      monto_cobertura_obra_social: number | null;
      porcentaje_recargo_mora: number | null;
      fecha_vencimiento_cuota: string | null;
    }>();

  const { data: pagos } = await supabase
    .from("pagos")
    .select("id, monto, monto_pagado, mes, anio, estado, fecha_pago, tipo_pago")
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

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-9 py-8">
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

        <EditorArancel
          residenteId={id}
          sucursalId={residente.sucursal_id}
          cuotaMensual={fichaAdministrativa?.cuota_mensual ?? null}
          montoCobertura={fichaAdministrativa?.monto_cobertura_obra_social ?? null}
          porcentajeRecargo={fichaAdministrativa?.porcentaje_recargo_mora ?? null}
        />

        <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-3 py-2.5">Período</th>
                <th className="px-3 py-2.5">Parte</th>
                <th className="px-3 py-2.5">Monto</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5">Fecha de pago</th>
                <th className="px-3 py-2.5">Días de atraso</th>
                <th className="px-3 py-2.5">Recargo por mora</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {(pagos ?? []).map((p) => {
                const restante = p.monto - p.monto_pagado;
                const atraso = diasDeAtraso(p, diaVencimiento);
                const recargo = atraso > 0 ? (restante * porcentajeRecargo) / 100 : 0;
                return (
                  <tr key={p.id} className="border-b border-edge last:border-0">
                    <td className="px-3 py-2.5 font-medium text-ink whitespace-nowrap">
                      {MESES[p.mes]} {p.anio}
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft whitespace-nowrap">
                      {ETIQUETA_TIPO_PAGO[p.tipo_pago]}
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft">
                      ${p.monto.toLocaleString("es-AR")}
                      {p.estado === "parcial" && (
                        <span className="block text-xs text-amber-400">
                          Pagado ${p.monto_pagado.toLocaleString("es-AR")} · restan $
                          {restante.toLocaleString("es-AR")}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLASE_ESTADO[p.estado]}`}
                      >
                        {ETIQUETA_ESTADO[p.estado]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft whitespace-nowrap">
                      {p.fecha_pago
                        ? new Date(p.fecha_pago + "T00:00:00").toLocaleDateString("es-AR")
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft">
                      {atraso > 0 ? (
                        <span className="text-red-400">{atraso} días</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft">
                      {recargo > 0 ? `$${recargo.toLocaleString("es-AR")}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {p.monto_pagado > 0 && (
                        <Link
                          href={`/residentes/${id}/recibo/${p.id}`}
                          target="_blank"
                          className="mr-3 text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                        >
                          Recibo
                        </Link>
                      )}
                      <AccionesPago
                        residenteId={id}
                        pagoId={p.id}
                        estado={p.estado}
                        restante={restante}
                      />
                    </td>
                  </tr>
                );
              })}
              {(pagos ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-ink-soft">
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
