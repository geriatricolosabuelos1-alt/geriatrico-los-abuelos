"use server";

import { createClient } from "@/lib/supabase/server";
import type { Fichada } from "@/lib/types";

export async function listarFichadas(
  mes: number,
  anio: number,
  empleadoIds: string[],
): Promise<Fichada[]> {
  if (empleadoIds.length === 0) return [];

  const supabase = await createClient();
  const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const hasta = new Date(anio, mes, 0).toISOString().slice(0, 10);

  const { data } = await supabase
    .from("fichadas")
    .select("id, empleado_id, tipo, fecha, hora, created_at")
    .in("empleado_id", empleadoIds)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false })
    .returns<Fichada[]>();

  return data ?? [];
}
