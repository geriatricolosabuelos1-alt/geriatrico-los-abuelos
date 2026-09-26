import type { createClient } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof createClient>>;

// Stock actual por insumo en una sede (entradas - salidas).
export async function stockPorInsumo(
  supabase: Cliente,
  sucursalId: string,
  insumoIds: string[],
): Promise<Map<string, number>> {
  const stock = new Map<string, number>(insumoIds.map((id) => [id, 0]));
  if (insumoIds.length === 0) return stock;

  const { data } = await supabase
    .from("movimientos_inventario")
    .select("insumo_id, tipo, cantidad")
    .eq("sucursal_id", sucursalId)
    .in("insumo_id", insumoIds)
    .returns<{ insumo_id: string; tipo: string; cantidad: number }[]>();

  for (const m of data ?? []) {
    const signo = m.tipo === "entrada" ? 1 : -1;
    stock.set(m.insumo_id, (stock.get(m.insumo_id) ?? 0) + signo * Number(m.cantidad));
  }
  return stock;
}

// Mensaje de error si alguna salida supera el stock; null si alcanza para todas.
export async function validarSalidas(
  supabase: Cliente,
  sucursalId: string,
  salidas: { insumoId: string; nombre: string; unidad: string; cantidad: number }[],
): Promise<string | null> {
  const pedidoPorInsumo = new Map<string, { nombre: string; unidad: string; cantidad: number }>();
  for (const s of salidas) {
    const previo = pedidoPorInsumo.get(s.insumoId);
    pedidoPorInsumo.set(s.insumoId, {
      nombre: s.nombre,
      unidad: s.unidad,
      cantidad: (previo?.cantidad ?? 0) + s.cantidad,
    });
  }

  const stock = await stockPorInsumo(supabase, sucursalId, [...pedidoPorInsumo.keys()]);
  const faltantes: string[] = [];
  for (const [id, pedido] of pedidoPorInsumo) {
    const disponible = Math.max(0, stock.get(id) ?? 0);
    if (pedido.cantidad > disponible) {
      faltantes.push(
        `${pedido.nombre}: hay ${disponible} ${pedido.unidad} y se quieren sacar ${pedido.cantidad}`,
      );
    }
  }

  return faltantes.length
    ? `Stock insuficiente. ${faltantes.join("; ")}. Cargá primero la entrada o la carga inicial.`
    : null;
}
