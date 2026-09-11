import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { AccionesPago } from "@/components/AccionesPago";
import { AgregarPeriodoManual } from "@/components/AgregarPeriodoManual";
import { EditorArancel } from "@/components/EditorArancel";
import { HistorialPagos } from "@/components/HistorialPagos";
import { BotonExportarPdf } from "@/components/BotonExportarPdf";
import { BotonFacturar } from "@/components/BotonFacturar";
import { CargosExtraResidente } from "@/components/CargosExtraResidente";
import { diasDeAtraso } from "@/lib/aranceles";
import { listarCargosExtra } from "./actions";
import type { MetodoPago, Perfil } from "@/lib/types";

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
  pagos_historial: { monto: number; fecha: string; metodo_pago: MetodoPago | null }[];
  facturas_arca: { id: string }[] | null;
};

const ETIQUETA_ESTADO: Record<FilaPago["estado"], string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  pagado: "Pagado",
};

const CLASE_ESTADO: Record<FilaPago["estado"], string> = {
  pendiente: "bg-edge text-ink-soft",
  parcial: "bg-amber-100 text-amber-700",
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
    .select("id, nombre, apellido, sucursal_id, dni")
    .eq("id", id)
    .single<{ id: string; nombre: string; apellido: string; sucursal_id: string; dni: string | null }>();

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

  const [{ data: pagos }, cargosExtra] = await Promise.all([
    supabase
      .from("pagos")
      .select(
        "id, monto, monto_pagado, mes, anio, estado, fecha_pago, tipo_pago, pagos_historial(monto, fecha, metodo_pago), facturas_arca(id)",
      )
      .eq("residente_id", id)
      .order("anio", { ascending: false })
      .order("mes", { ascending: false })
      .returns<FilaPago[]>(),
    listarCargosExtra(id),
  ]);

  const diaVencimiento = fichaAdministrativa?.fecha_vencimiento_cuota
    ? new Date(fichaAdministrativa.fecha_vencimiento_cuota + "T00:00:00").getDate()
    : 10;
  const porcentajeRecargo = fichaAdministrativa?.porcentaje_recargo_mora ?? 0;

  return (
    <div className="flex min-h-screen w-full">
      <style>{`@page { size: A4; margin: 14mm; }`}</style>

      <div className="print:hidden">
        <Sidebar
          perfil={perfil}
          activo={{
            tipo: "sucursal",
            sucursalId: residente.sucursal_id,
            seccion: "cuotas",
          }}
        />
      </div>

      <main className="flex-1 space-y-6 px-9 py-8 print:space-y-4 print:px-0 print:py-0">
        <div className="hidden print:block">
          <p className="font-display text-lg font-semibold text-black">Los Abuelos</p>
          <p className="text-xs uppercase tracking-widest text-neutral-600">
            Informe de cuenta corriente
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            Generado el {new Date().toLocaleDateString("es-AR")}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft print:text-neutral-600">
              Cuenta corriente
            </p>
            <h1 className="font-display text-2xl font-semibold text-ink print:text-black">
              {residente.apellido}, {residente.nombre}
            </h1>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <BotonExportarPdf />
            <Link
              href={`/sucursales/${residente.sucursal_id}/cuotas`}
              className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
            >
              Volver a Aranceles
            </Link>
          </div>
        </div>

        <div className="print:hidden">
          <EditorArancel
            residenteId={id}
            sucursalId={residente.sucursal_id}
            cuotaMensual={fichaAdministrativa?.cuota_mensual ?? null}
            montoCobertura={fichaAdministrativa?.monto_cobertura_obra_social ?? null}
            porcentajeRecargo={fichaAdministrativa?.porcentaje_recargo_mora ?? null}
          />
        </div>

        <div className="print:hidden">
          <AgregarPeriodoManual residenteId={id} sucursalId={residente.sucursal_id} />
        </div>

        <CargosExtraResidente residenteId={id} cargos={cargosExtra} />

        <div className="overflow-x-auto rounded-2xl border border-edge bg-card print:overflow-visible print:rounded-none print:border-0 print:bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft print:border-neutral-300 print:bg-white print:text-neutral-500">
              <tr>
                <th className="px-3 py-2.5">Período</th>
                <th className="px-3 py-2.5">Parte</th>
                <th className="px-3 py-2.5">Monto</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5">Fecha de pago</th>
                <th className="px-3 py-2.5">Días de atraso</th>
                <th className="px-3 py-2.5">Recargo por mora</th>
                <th className="px-3 py-2.5 print:hidden"></th>
              </tr>
            </thead>
            <tbody>
              {(pagos ?? []).map((p) => {
                const restante = p.monto - p.monto_pagado;
                const atraso = diasDeAtraso(p, diaVencimiento);
                const recargo = atraso > 0 ? (restante * porcentajeRecargo) / 100 : 0;
                return (
                  <tr key={p.id} className="border-b border-edge last:border-0 print:border-neutral-300">
                    <td className="px-3 py-2.5 font-medium text-ink whitespace-nowrap print:text-black">
                      {MESES[p.mes]} {p.anio}
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft whitespace-nowrap print:text-neutral-700">
                      {ETIQUETA_TIPO_PAGO[p.tipo_pago]}
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft print:text-neutral-700">
                      ${p.monto.toLocaleString("es-AR")}
                      <HistorialPagos
                        montoTotal={p.monto}
                        montoPagado={p.monto_pagado}
                        historial={p.pagos_historial}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLASE_ESTADO[p.estado]} print:border print:border-neutral-400 print:bg-white print:text-black`}
                      >
                        {ETIQUETA_ESTADO[p.estado]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft whitespace-nowrap print:text-neutral-700">
                      {p.fecha_pago
                        ? new Date(p.fecha_pago + "T00:00:00").toLocaleDateString("es-AR")
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft print:text-neutral-700">
                      {atraso > 0 ? (
                        <span className="text-red-700 print:text-black">{atraso} días</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-ink-soft print:text-neutral-700">
                      {recargo > 0 ? `$${recargo.toLocaleString("es-AR")}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap print:hidden">
                      {p.monto_pagado > 0 && (
                        <Link
                          href={`/residentes/${id}/recibo/${p.id}`}
                          target="_blank"
                          className="mr-3 text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                        >
                          Recibo
                        </Link>
                      )}
                      {p.monto_pagado > 0 && (
                        <BotonFacturar
                          residenteId={id}
                          pagoId={p.id}
                          montoSugerido={p.monto_pagado}
                          dniResidente={residente.dni}
                          yaFacturado={(p.facturas_arca?.length ?? 0) > 0}
                        />
                      )}
                      <AccionesPago
                        residenteId={id}
                        pagoId={p.id}
                        estado={p.estado}
                        monto={p.monto}
                        montoPagado={p.monto_pagado}
                        fechaPago={p.fecha_pago}
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
