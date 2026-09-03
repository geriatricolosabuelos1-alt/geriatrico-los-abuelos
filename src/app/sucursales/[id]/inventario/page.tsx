import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { InventarioForm } from "@/components/InventarioForm";
import type { ItemInventario, Perfil } from "@/lib/types";

type Params = { id: string };

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

  const { data: items } = await supabase
    .from("inventario")
    .select("id, item, cantidad, unidad, updated_at")
    .eq("sucursal_id", id)
    .order("item")
    .returns<ItemInventario[]>();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "inventario" }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">
            {sucursal.nombre}
          </p>
          <h1 className="font-display text-2xl font-bold text-ink">Inventario</h1>
        </div>

        <InventarioForm sucursalId={id} />

        <div className="overflow-hidden rounded-2xl border border-edge bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Ítem</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((i) => (
                <tr key={i.id} className="border-b border-edge last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{i.item}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {i.cantidad} {i.unidad}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {new Date(i.updated_at).toLocaleDateString("es-AR")}
                  </td>
                </tr>
              ))}
              {(items ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-ink-soft">
                    Todavía no hay ítems cargados.
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
