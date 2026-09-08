import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { CargaInicialForm } from "@/components/CargaInicialForm";
import type { Insumo, Perfil } from "@/lib/types";

type Params = { id: string };

export default async function CargaInicialPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, { data: insumos }] = await Promise.all([
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
  ]);

  if (!sucursal || !perfil) {
    notFound();
  }

  if (perfil!.rol !== "admin") {
    redirect(`/sucursales/${id}/inventario`);
  }

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
          <h1 className="font-display text-[32px] font-bold text-ink">Carga inicial de stock</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Cargá la cantidad que ya tenés de cada insumo. Se registra como ingreso sin precio,
            para no afectar el costo histórico.
          </p>
        </div>

        <Link
          href={`/sucursales/${id}/inventario`}
          className="inline-block text-xs font-medium text-ink-soft hover:text-ink"
        >
          ← Volver a Inventario
        </Link>

        <CargaInicialForm sucursalId={id} insumos={insumos ?? []} />
      </main>
    </div>
  );
}
