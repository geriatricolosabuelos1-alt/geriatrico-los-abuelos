import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { ListaAranceles } from "@/components/ListaAranceles";
import { calcularResumenCuenta, type PagoResumen } from "@/lib/aranceles";
import type { Perfil } from "@/lib/types";

type Params = { id: string };

type FilaResidenteArancel = {
  id: string;
  nombre: string;
  apellido: string;
  fecha_ingreso: string | null;
  ficha_administrativa: {
    obra_social: string | null;
    porcentaje_recargo_mora: number | null;
    fecha_vencimiento_cuota: string | null;
  } | null;
};

export default async function CuotasSucursalPage({
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

  const { data: sucursal } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .eq("id", id)
    .single<{ id: string; nombre: string }>();

  if (!sucursal || !perfil) {
    notFound();
  }

  const { data: residentes } = await supabase
    .from("residentes")
    .select(
      "id, nombre, apellido, fecha_ingreso, ficha_administrativa(obra_social, porcentaje_recargo_mora, fecha_vencimiento_cuota)",
    )
    .eq("sucursal_id", id)
    .eq("activo", true)
    .order("apellido")
    .returns<FilaResidenteArancel[]>();

  const { data: pagos } = await supabase
    .from("pagos")
    .select("residente_id, monto, monto_pagado, mes, anio, estado, fecha_pago")
    .eq("sucursal_id", id)
    .returns<(PagoResumen & { residente_id: string })[]>();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "cuotas" }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        {(residentes ?? []).length === 0 ? (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brass">
                {sucursal.nombre}
              </p>
              <h1 className="font-display text-2xl font-bold text-ink">Aranceles</h1>
            </div>
            <p className="rounded-2xl border border-edge bg-card p-6 text-center text-ink-soft">
              No hay residentes activos en esta sucursal.
            </p>
          </>
        ) : (
          <ListaAranceles
            sucursalNombre={sucursal.nombre}
            sucursalId={id}
            items={(residentes ?? []).map((r) => {
              const pagosDelResidente = (pagos ?? []).filter((p) => p.residente_id === r.id);
              const diaVencimiento = r.ficha_administrativa?.fecha_vencimiento_cuota
                ? new Date(r.ficha_administrativa.fecha_vencimiento_cuota + "T00:00:00").getDate()
                : 10;
              const resumen = calcularResumenCuenta(
                pagosDelResidente,
                diaVencimiento,
                r.ficha_administrativa?.porcentaje_recargo_mora ?? 0,
              );

              return {
                residente: {
                  id: r.id,
                  nombre: r.nombre,
                  apellido: r.apellido,
                  fecha_ingreso: r.fecha_ingreso,
                },
                obraSocial: r.ficha_administrativa?.obra_social ?? null,
                resumen,
              };
            })}
          />
        )}
      </main>
    </div>
  );
}
