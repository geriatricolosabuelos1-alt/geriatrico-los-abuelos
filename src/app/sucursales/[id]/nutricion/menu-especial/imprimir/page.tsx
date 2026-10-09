import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotonImprimir } from "@/components/BotonImprimir";
import { HojaMenuEspecial } from "@/components/HojaMenuEspecial";
import { obtenerMenusEspeciales } from "@/app/sucursales/[id]/nutricion/menu-especial/actions";

type Params = { id: string };

// Ficha de menú especial para imprimir (una o las dos), con renglones libres para pacientes.
export default async function ImprimirMenuEspecialPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { id } = await params;
  const { tipo } = await searchParams;
  const supabase = await createClient();
  const [{ data: sucursal }, menus] = await Promise.all([
    supabase
      .from("sucursales")
      .select("id, nombre, direccion")
      .eq("id", id)
      .single<{ id: string; nombre: string; direccion: string | null }>(),
    obtenerMenusEspeciales(id),
  ]);
  if (!sucursal) notFound();
  const aImprimir = tipo ? menus.filter((m) => m.tipo === tipo) : menus;

  return (
    <div className="flex min-h-screen w-full justify-center bg-panel px-4 py-10 print:block print:min-h-0 print:bg-white print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 12mm; } .hoja-menu-especial:last-child { break-after: auto; }`}</style>
      <div className="w-full max-w-[900px] rounded-2xl border border-edge bg-card p-8 shadow-2xl print:bg-white print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
          <Link
            href={`/sucursales/${id}/nutricion/menu-especial`}
            className="text-sm text-brass underline underline-offset-2 hover:text-ink"
          >
            ← Volver a Menú especial
          </Link>
          <BotonImprimir />
        </div>
        <div className="space-y-12 print:space-y-0">
          {aImprimir.map((m) => (
            <HojaMenuEspecial
              key={m.tipo}
              menu={m}
              sedeNombre={sucursal.nombre}
              sedeDireccion={sucursal.direccion}
              renglonesLibres={3}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
