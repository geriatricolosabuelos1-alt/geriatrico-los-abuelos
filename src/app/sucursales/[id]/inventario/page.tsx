import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { InventarioForm } from "@/components/InventarioForm";
import { actualizarUnidadInsumo } from "./actions";
import type { CategoriaInsumo, Insumo, Perfil } from "@/lib/types";

type Params = { id: string };

type FilaMovimiento = {
  insumo_id: string;
  tipo: string;
  cantidad: number;
};

const ETIQUETA_CATEGORIA: Record<CategoriaInsumo, string> = {
  general: "General",
  carnes: "Carnes",
  verduras: "Verduras",
};

const ORDEN_CATEGORIAS: CategoriaInsumo[] = ["general", "carnes", "verduras"];

export default async function InventarioSucursalPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: perfil },
    { data: sucursal },
    { data: insumos },
    { data: movimientos },
  ] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre_completo, rol, sucursal_id, activo")
      .eq("id", user!.id)
      .single<Perfil>(),
    supabase
      .from("sucursales")
      .select("id, nombre")
      .eq("id", id)
      .single<{ id: string; nombre: string }>(),
    supabase
      .from("insumos")
      .select("id, nombre, categoria, unidad, activo")
      .eq("activo", true)
      .order("nombre")
      .returns<Insumo[]>(),
    supabase
      .from("movimientos_inventario")
      .select("insumo_id, tipo, cantidad")
      .eq("sucursal_id", id)
      .returns<FilaMovimiento[]>(),
  ]);

  if (!sucursal || !perfil) {
    notFound();
  }

  const stockPorInsumo = new Map<string, number>();
  (movimientos ?? []).forEach((m) => {
    const actual = stockPorInsumo.get(m.insumo_id) ?? 0;
    stockPorInsumo.set(
      m.insumo_id,
      m.tipo === "entrada" ? actual + m.cantidad : actual - m.cantidad,
    );
  });

  const listaInsumos = insumos ?? [];
  const esAdmin = perfil!.rol === "admin";

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "inventario" }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">
            {sucursal!.nombre}
          </p>
          <h1 className="font-display text-2xl font-bold text-ink">Inventario</h1>
        </div>

        <InventarioForm sucursalId={id} insumos={listaInsumos} />

        {ORDEN_CATEGORIAS.map((cat) => {
          const items = listaInsumos.filter((i) => i.categoria === cat);
          if (items.length === 0) return null;

          return (
            <div key={cat}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-soft">
                {ETIQUETA_CATEGORIA[cat]}
              </p>
              <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
                    <tr>
                      <th className="px-4 py-3">Insumo</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Unidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => {
                      const stock = stockPorInsumo.get(i.id) ?? 0;
                      return (
                        <tr key={i.id} className="border-b border-edge last:border-0">
                          <td className="px-4 py-3 font-medium text-ink">{i.nombre}</td>
                          <td className="px-4 py-3 text-ink-soft">
                            <span
                              className={
                                stock <= 0
                                  ? "font-semibold text-red-400"
                                  : "font-semibold text-brass"
                              }
                            >
                              {stock}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-ink-soft">
                            {esAdmin ? (
                              <form
                                action={actualizarUnidadInsumo}
                                className="flex items-center gap-1.5"
                              >
                                <input type="hidden" name="insumo_id" value={i.id} />
                                <input
                                  type="text"
                                  name="unidad"
                                  defaultValue={i.unidad}
                                  className="w-24 rounded-md border border-edge bg-panel-deep px-2 py-1 text-xs text-ink focus:border-brass focus:outline-none"
                                />
                                <button
                                  type="submit"
                                  className="text-xs font-medium text-brass hover:text-ink"
                                >
                                  Guardar
                                </button>
                              </form>
                            ) : (
                              i.unidad
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
