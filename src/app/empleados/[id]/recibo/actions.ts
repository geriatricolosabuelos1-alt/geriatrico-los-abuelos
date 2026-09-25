"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ItemRecibo = { concepto: string; tipo: "haber" | "descuento"; monto: number };

const ROLES_SUELDOS = ["admin", "gerente_sede", "administrativo"];

export async function guardarReciboSueldo(
  empleadoId: string,
  periodo: string,
  fechaPago: string | null,
  items: ItemRecibo[],
): Promise<{ error: string | null }> {
  if (!/^\d{4}-\d{2}$/.test(periodo)) return { error: "Período inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión vencida." };

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).single<{ rol: string }>();
  if (!perfil || !ROLES_SUELDOS.includes(perfil.rol)) return { error: "No tenés permiso para generar recibos." };

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

  revalidatePath(`/empleados/${empleadoId}/recibo`);
  return { error: null };
}
