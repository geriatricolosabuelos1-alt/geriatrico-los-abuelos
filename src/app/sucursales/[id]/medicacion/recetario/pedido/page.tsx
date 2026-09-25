import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotonImprimirPedidoRecetas } from "@/components/BotonImprimirPedidoRecetas";
import { fechaHoyArgentina } from "@/lib/recetas";
import type { EstadoReceta } from "@/lib/types";

type Params = { id: string };

type RecetaPedido = {
  id: string;
  estado: EstadoReceta;
  obra_social: string | null;
  fecha_pedido: string | null;
  fecha_vencimiento: string | null;
  notas: string | null;
  medicamento_texto: string | null;
  residentes: {
    id: string;
    nombre: string;
    apellido: string;
    dni: string | null;
    sucursal_id: string;
    ficha_administrativa: { obra_social: string | null; numero_afiliado: string | null } | null;
  };
  medicamentos_residente: { nombre: string; dosis: string | null; frecuencia: string | null } | null;
};

function formatearFecha(fecha: string): string {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-AR");
}

export default async function PedidoRecetasPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();
  const hoy = fechaHoyArgentina();

  const [{ data: sucursal }, { data: recetas }] = await Promise.all([
    supabase
      .from("sucursales")
      .select("id, nombre")
      .eq("id", id)
      .single<{ id: string; nombre: string }>(),
    // Pendientes de pedir + las que ya se pidieron hoy (para poder reimprimir el pedido del día).
    supabase
      .from("recetas_medicamento")
      .select(
        "id, estado, obra_social, fecha_pedido, fecha_vencimiento, notas, medicamento_texto, residentes!inner(id, nombre, apellido, dni, sucursal_id, ficha_administrativa(obra_social, numero_afiliado)), medicamentos_residente(nombre, dosis, frecuencia)",
      )
      .eq("residentes.sucursal_id", id)
      .or(`estado.eq.pendiente_pedir,and(estado.eq.pedida,fecha_pedido.eq.${hoy})`)
      .returns<RecetaPedido[]>(),
  ]);

  if (!sucursal) notFound();

  const lista = (recetas ?? []).sort((a, b) =>
    `${a.residentes.apellido} ${a.residentes.nombre}`.localeCompare(
      `${b.residentes.apellido} ${b.residentes.nombre}`,
    ),
  );
  const idsPendientes = lista.filter((r) => r.estado === "pendiente_pedir").map((r) => r.id);
  const CELDA = "py-2 pr-3 align-top";

  return (
    <div className="flex min-h-screen w-full justify-center bg-panel px-4 py-10 print:block print:min-h-0 print:bg-white print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 14mm; }`}</style>

      <div className="w-full max-w-[900px] overflow-hidden rounded-2xl border border-edge bg-card p-8 shadow-2xl print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={`/sucursales/${id}/medicacion/recetario`}
            className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
          >
            ← Volver al recetario
          </Link>
          <BotonImprimirPedidoRecetas sucursalId={id} idsPendientes={idsPendientes} />
        </div>
        {idsPendientes.length > 0 && (
          <p className="mb-4 rounded-lg border border-edge bg-panel-deep p-3 text-xs text-ink-soft print:hidden">
            Al imprimir, las {idsPendientes.length} receta{idsPendientes.length === 1 ? "" : "s"} pendiente
            {idsPendientes.length === 1 ? "" : "s"} quedan marcadas como pedidas con fecha {formatearFecha(hoy)}.
          </p>
        )}

        <div className="mb-6">
          <p className="font-display text-xl font-semibold text-ink print:text-black">Los Abuelos</p>
          <p className="text-xs uppercase tracking-widest text-ink-soft print:text-neutral-600">
            Pedido de recetas · {sucursal.nombre}
          </p>
          <p className="mt-1 text-xs text-ink-soft print:text-neutral-600">
            Fecha de pedido: {formatearFecha(hoy)} · {lista.length} receta{lista.length === 1 ? "" : "s"}
          </p>
        </div>

        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-edge text-[0.6rem] font-semibold uppercase tracking-wide text-ink-soft print:border-neutral-300 print:text-neutral-500">
              <th className={CELDA}>Residente</th>
              <th className={CELDA}>DNI</th>
              <th className={CELDA}>Obra social / N° afiliado</th>
              <th className={CELDA}>Medicamento</th>
              <th className={CELDA}>Dosis / frecuencia</th>
              <th className={CELDA}>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((r) => {
              const ficha = r.residentes.ficha_administrativa;
              const obraSocial = r.obra_social ?? ficha?.obra_social ?? "—";
              return (
                <tr key={r.id} className="border-b border-edge print:border-neutral-300">
                  <td className={`${CELDA} font-medium text-ink print:text-black`}>
                    {r.residentes.apellido}, {r.residentes.nombre}
                  </td>
                  <td className={`${CELDA} text-ink-soft print:text-neutral-700`}>{r.residentes.dni ?? "—"}</td>
                  <td className={`${CELDA} text-ink-soft print:text-neutral-700`}>
                    {obraSocial}
                    {ficha?.numero_afiliado && <span className="block">N° {ficha.numero_afiliado}</span>}
                  </td>
                  <td className={`${CELDA} text-ink print:text-black`}>
                    {r.medicamentos_residente?.nombre ?? r.medicamento_texto ?? "General"}
                  </td>
                  <td className={`${CELDA} text-ink-soft print:text-neutral-700`}>
                    {[r.medicamentos_residente?.dosis, r.medicamentos_residente?.frecuencia]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className={`${CELDA} text-ink-soft print:text-neutral-700`}>{r.notas ?? "—"}</td>
                </tr>
              );
            })}
            {lista.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-ink-soft">
                  No hay recetas pendientes de pedir.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-16 grid grid-cols-2 gap-10 print:break-inside-avoid">
          <div className="text-center">
            <div className="mb-1 border-t border-ink/60 print:border-black" />
            <p className="text-xs text-ink-soft print:text-neutral-600">Solicitado por</p>
          </div>
          <div className="text-center">
            <div className="mb-1 border-t border-ink/60 print:border-black" />
            <p className="text-xs text-ink-soft print:text-neutral-600">Firma y sello médico</p>
          </div>
        </div>
      </div>
    </div>
  );
}
