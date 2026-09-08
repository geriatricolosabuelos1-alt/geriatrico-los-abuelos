import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { GastosFijos } from "@/components/GastosFijos";
import { GastosVariables } from "@/components/GastosVariables";
import type { Gasto, GastoFijoCatalogo, Perfil } from "@/lib/types";

type Params = { id: string };
type SearchParams = { mes?: string; anio?: string };

const NOMBRES_MES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default async function GastosSucursalPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ahora = new Date();
  const mes = Number(sp.mes) || ahora.getMonth() + 1;
  const anio = Number(sp.anio) || ahora.getFullYear();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, { data: catalogo }, { data: gastosDelMes }] =
    await Promise.all([
      supabase
        .from("perfiles")
        .select("id, nombre_completo, rol, sucursal_id, activo")
        .eq("id", user!.id)
        .single<Perfil>(),
      supabase.from("sucursales").select("id, nombre").eq("id", id).single<{
        id: string;
        nombre: string;
      }>(),
      supabase
        .from("gastos_fijos_catalogo")
        .select("id, nombre, monto_estimado, activo")
        .eq("activo", true)
        .order("nombre")
        .returns<GastoFijoCatalogo[]>(),
      supabase
        .from("gastos")
        .select("id, sucursal_id, categoria, monto, mes, anio, descripcion, tipo, fecha, gasto_fijo_id")
        .eq("sucursal_id", id)
        .eq("mes", mes)
        .eq("anio", anio)
        .order("fecha", { ascending: false })
        .returns<Gasto[]>(),
    ]);

  if (!sucursal || !perfil) {
    notFound();
  }

  const fijos = (gastosDelMes ?? []).filter((g) => g.tipo === "fijo");
  const variables = (gastosDelMes ?? []).filter((g) => g.tipo === "variable");

  const opcionesAnio = [anio - 1, anio, anio + 1];

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "gastos" }}
      />

      <main className="flex-1 space-y-8 px-9 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">
              {sucursal!.nombre}
            </p>
            <h1 className="font-display text-[32px] font-bold text-ink">Gastos</h1>
          </div>

          <form className="flex gap-2">
            <select
              name="mes"
              defaultValue={mes}
              className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
            >
              {NOMBRES_MES.map((nombre, i) => (
                <option key={nombre} value={i + 1}>
                  {nombre}
                </option>
              ))}
            </select>
            <select
              name="anio"
              defaultValue={anio}
              className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
            >
              {opcionesAnio.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-edge px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink"
            >
              Ver
            </button>
          </form>
        </div>

        <GastosFijos
          sucursalId={id}
          mes={mes}
          anio={anio}
          catalogo={catalogo ?? []}
          gastosDelMes={fijos.map((g) => ({
            id: g.id,
            categoria: g.categoria,
            monto: g.monto,
            gasto_fijo_id: g.gasto_fijo_id,
          }))}
        />

        <GastosVariables sucursalId={id} gastos={variables} />
      </main>
    </div>
  );
}
