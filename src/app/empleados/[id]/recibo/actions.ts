"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ItemRecibo = { concepto: string; tipo: "haber" | "descuento"; monto: number };

export type GuardarReciboEstado = { error: string | null; conflicto?: boolean };

const ROLES_SUELDOS = ["admin", "gerente_sede", "administrativo"];
const FORMATO_PERIODO = /^\d{4}-\d{2}$/;

async function autorizar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sesión vencida." };

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).single<{ rol: string }>();
  if (!perfil || !ROLES_SUELDOS.includes(perfil.rol)) {
    return { ok: false as const, error: "No tenés permiso para generar recibos." };
  }
  return { ok: true as const, supabase, user };
}

function refrescar(empleadoId: string) {
  revalidatePath(`/empleados/${empleadoId}/recibo`);
  revalidatePath("/empleados/recibos");
}

// Guarda el recibo del período. Si se pasa periodoAnterior (recibo ya emitido al que se le
// corrigió el período), el recibo se muda al período nuevo y el anterior se elimina.
export async function guardarReciboSueldo(
  empleadoId: string,
  periodo: string,
  fechaPago: string | null,
  items: ItemRecibo[],
  opciones?: { periodoAnterior?: string | null; reemplazar?: boolean },
): Promise<GuardarReciboEstado> {
  if (!FORMATO_PERIODO.test(periodo)) return { error: "Período inválido." };

  const periodoAnterior = opciones?.periodoAnterior ?? null;
  const mudaDePeriodo = !!periodoAnterior && periodoAnterior !== periodo;
  if (mudaDePeriodo && !FORMATO_PERIODO.test(periodoAnterior)) return { error: "Período inválido." };

  const auth = await autorizar();
  if (!auth.ok) return { error: auth.error };
  const { supabase, user } = auth;

  if (mudaDePeriodo && !opciones?.reemplazar) {
    const { data: existente } = await supabase
      .from("recibos_sueldo")
      .select("periodo")
      .eq("empleado_id", empleadoId)
      .eq("periodo", periodo)
      .maybeSingle<{ periodo: string }>();
    if (existente) return { error: null, conflicto: true };
  }

  const limpios = items
    .map((i) => ({
      concepto: i.concepto.trim(),
      tipo: i.tipo === "descuento" ? ("descuento" as const) : ("haber" as const),
      monto: Math.round(Number(i.monto) * 100) / 100,
    }))
    .filter((i) => i.concepto && Number.isFinite(i.monto));

  const totalHaberes = limpios.filter((i) => i.tipo === "haber").reduce((a, i) => a + i.monto, 0);
  const totalDescuentos = limpios.filter((i) => i.tipo === "descuento").reduce((a, i) => a + i.monto, 0);

  const { error } = await supabase.from("recibos_sueldo").upsert(
    {
      empleado_id: empleadoId,
      periodo,
      fecha_pago: fechaPago || null,
      items: limpios,
      total_haberes: totalHaberes,
      total_descuentos: totalDescuentos,
      neto: totalHaberes - totalDescuentos,
      generado_por: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "empleado_id,periodo" },
  );
  if (error) return { error: error.message };

  if (mudaDePeriodo) {
    const { error: errorBorrado } = await supabase
      .from("recibos_sueldo")
      .delete()
      .eq("empleado_id", empleadoId)
      .eq("periodo", periodoAnterior);
    if (errorBorrado) {
      refrescar(empleadoId);
      return {
        error: `El recibo quedó guardado en el período nuevo, pero no se pudo quitar el del período anterior: ${errorBorrado.message}`,
      };
    }
  }

  refrescar(empleadoId);
  return { error: null };
}

export async function eliminarReciboSueldo(empleadoId: string, periodo: string): Promise<{ error: string | null }> {
  if (!FORMATO_PERIODO.test(periodo)) return { error: "Período inválido." };

  const auth = await autorizar();
  if (!auth.ok) return { error: auth.error };

  const { error } = await auth.supabase
    .from("recibos_sueldo")
    .delete()
    .eq("empleado_id", empleadoId)
    .eq("periodo", periodo);
  if (error) return { error: error.message };

  refrescar(empleadoId);
  return { error: null };
}
