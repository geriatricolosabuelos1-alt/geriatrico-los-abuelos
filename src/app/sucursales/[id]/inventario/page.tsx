import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { InventarioForm } from "@/components/InventarioForm";
import { InventarioTable } from "@/components/InventarioTable";
import type { CategoriaInsumo, Insumo, Perfil } from "@/lib/types";

type Params = { id: string };
type SearchParams = { categoria?: string };

const CATEGORIAS_VALIDAS: CategoriaInsumo[] = ["medicos", "varios"];
const ETIQUETA_CATEGORIA: Record<CategoriaInsumo, string> = {
  medicos: "Insumos médicos",
  varios: "Insumos varios",
};

type FilaMovimiento = {
  insumo_id: string;
  tipo: string;
  cantidad: number;
  es_inicial: boolean;
};

export default async function InventarioSucursalPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { categoria: categoriaRaw } = await searchParams;
  const categoria = CATEGORIAS_VALIDAS.includes(categoriaRaw as CategoriaInsumo)
    ? (categoriaRaw as CategoriaInsumo)
    : undefined;
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
      .select("id, nombre, categoria, unidad, stock_minimo, activo")
      .eq("activo", true)
      .order("nombre")
      .returns<Insumo[]>(),
    supabase
      .from("movimientos_inventario")
      .select("insumo_id, tipo, cantidad, es_inicial")
      .eq("sucursal_id", id)
      .returns<FilaMovimiento[]>(),
  ]);

  if (!sucursal || !perfil) {
    notFound();
  }

  type Resumen = { stockInicial: number; ingreso: number; egreso: number };
  const resumenPorInsumo = new Map<string, Resumen>();
  (movimientos ?? []).forEach((m) => {
    const actual = resumenPorInsumo.get(m.insumo_id) ?? {
      stockInicial: 0,
      ingreso: 0,
      egreso: 0,
    };
    if (m.tipo === "entrada" && m.es_inicial) {
      actual.stockInicial += m.cantidad;
    } else if (m.tipo === "entrada") {
      actual.ingreso += m.cantidad;
    } else {
      actual.egreso += m.cantidad;
    }
    resumenPorInsumo.set(m.insumo_id, actual);
  });

  const listaInsumos = insumos ?? [];
  const filasInsumo = listaInsumos
    .filter((i) => !categoria || i.categoria === categoria)
    .map((i) => {
      const resumen = resumenPorInsumo.get(i.id) ?? { stockInicial: 0, ingreso: 0, egreso: 0 };
      return {
        id: i.id,
        nombre: i.nombre,
        categoria: i.categoria,
        unidad: i.unidad,
        stockMinimo: i.stock_minimo,
        stockInicial: resumen.stockInicial,
        ingreso: resumen.ingreso,
        egreso: resumen.egreso,
        stockFinal: resumen.stockInicial + resumen.ingreso - resumen.egreso,
      };
    });
  const esAdmin = perfil!.rol === "admin";

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{
          tipo: "sucursal",
          sucursalId: id,
          seccion: "inventario",
          categoriaInventario: categoria,
        }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">
              {sucursal!.nombre}
            </p>
            <h1 className="font-display text-[32px] font-bold text-ink">
              Inventario{categoria ? ` — ${ETIQUETA_CATEGORIA[categoria]}` : ""}
            </h1>
          </div>
          {esAdmin && (
            <Link
              href={`/sucursales/${id}/inventario/carga-inicial`}
              className="inline-block rounded-lg border border-edge px-3 py-2 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
            >
              Carga inicial de stock
            </Link>
          )}
        </div>

        <InventarioForm sucursalId={id} insumos={listaInsumos} />

        <InventarioTable insumos={filasInsumo} esAdmin={esAdmin} />
      </main>
    </div>
  );
}
