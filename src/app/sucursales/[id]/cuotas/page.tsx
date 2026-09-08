import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { ListaAranceles } from "@/components/ListaAranceles";
import { calcularResumenCuenta, diasDeAtraso, type PagoResumen } from "@/lib/aranceles";
import type { Perfil } from "@/lib/types";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

type Params = { id: string };

type FilaResidenteArancel = {
  id: string;
  nombre: string;
  apellido: string;
  fecha_ingreso: string | null;
  contacto_familiar: string | null;
  telefono_familiar: string | null;
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
      "id, nombre, apellido, fecha_ingreso, contacto_familiar, telefono_familiar, ficha_administrativa(obra_social, porcentaje_recargo_mora, fecha_vencimiento_cuota)",
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

  const todosPagos = pagos ?? [];
  const diaVencimientoPorResidente = new Map<string, number>(
    (residentes ?? []).map((r) => [
      r.id,
      r.ficha_administrativa?.fecha_vencimiento_cuota
        ? new Date(r.ficha_administrativa.fecha_vencimiento_cuota + "T00:00:00").getDate()
        : 10,
    ]),
  );

  const ahora = new Date();
  const mesActual = ahora.getMonth() + 1;
  const anioActual = ahora.getFullYear();
  const mesAnteriorFecha = new Date(anioActual, mesActual - 2, 1);

  function promedioCuota(mes: number, anio: number): number {
    const delMes = todosPagos.filter((p) => p.mes === mes && p.anio === anio);
    if (delMes.length === 0) return 0;
    return delMes.reduce((acc, p) => acc + p.monto, 0) / delMes.length;
  }

  const pagosMes = todosPagos.filter((p) => p.mes === mesActual && p.anio === anioActual);
  const pendientesMes = pagosMes.filter((p) => p.estado !== "pagado");
  const cuotaPromedio = promedioCuota(mesActual, anioActual);
  const cuotaPromedioAnterior = promedioCuota(
    mesAnteriorFecha.getMonth() + 1,
    mesAnteriorFecha.getFullYear(),
  );

  const resumenMes = {
    mesLabel: MESES[mesActual - 1],
    cobrado: pagosMes.reduce((acc, p) => acc + p.monto_pagado, 0),
    cuotasPagadas: pagosMes.filter((p) => p.estado === "pagado").length,
    cuotasTotales: pagosMes.length,
    montoPendiente: pendientesMes.reduce((acc, p) => acc + (p.monto - p.monto_pagado), 0),
    cantidadPendientes: pendientesMes.length,
    cantidadVencidas: pendientesMes.filter(
      (p) => diasDeAtraso(p, diaVencimientoPorResidente.get(p.residente_id) ?? 10) > 0,
    ).length,
    cuotaPromedio,
    variacionPromedio:
      cuotaPromedioAnterior > 0
        ? ((cuotaPromedio - cuotaPromedioAnterior) / cuotaPromedioAnterior) * 100
        : null,
  };

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
              <h1 className="font-display text-[32px] font-semibold text-ink">Aranceles</h1>
            </div>
            <p className="rounded-2xl border border-edge bg-card p-6 text-center text-ink-soft">
              No hay residentes activos en esta sucursal.
            </p>
          </>
        ) : (
          <ListaAranceles
            sucursalNombre={sucursal.nombre}
            sucursalId={id}
            resumenMes={resumenMes}
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
                  contacto_familiar: r.contacto_familiar,
                  telefono_familiar: r.telefono_familiar,
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
