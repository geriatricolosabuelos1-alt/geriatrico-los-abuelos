import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotonExportarPdf } from "@/components/BotonExportarPdf";
import { obtenerResumenSucursal } from "@/lib/dashboard";

type Params = { id: string };

export default async function InformeStockInsumosPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: sucursal } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .eq("id", id)
    .single<{ id: string; nombre: string }>();

  if (!sucursal) {
    notFound();
  }

  const resumen = await obtenerResumenSucursal(supabase, id);
  const filas = resumen.alertasInsumos
    .slice()
    .sort((a, b) => a.stockActual - b.stockActual);

  return (
    <div className="flex min-h-screen w-full justify-center bg-panel px-4 py-10 print:block print:min-h-0 print:bg-white print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 14mm; }`}</style>

      <div className="w-full max-w-[860px] overflow-hidden rounded-2xl border border-edge bg-card p-8 shadow-2xl print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-display text-xl font-semibold text-ink print:text-black">
              Los Abuelos
            </p>
            <p className="text-xs uppercase tracking-widest text-ink-soft print:text-neutral-600">
              Informe de stock bajo · {sucursal!.nombre}
            </p>
            <p className="mt-1 text-xs text-ink-soft print:text-neutral-600">
              Generado el {new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}
            </p>
          </div>
          <div className="print:hidden">
            <BotonExportarPdf />
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-edge text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft print:border-neutral-300 print:text-neutral-500">
              <th className="py-2 pr-3">Insumo</th>
              <th className="py-2 pr-3">Categoría</th>
              <th className="py-2 pr-3 text-right">Stock actual</th>
              <th className="py-2 text-right">Mínimo</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((i) => (
              <tr key={i.id} className="border-b border-edge print:border-neutral-300">
                <td className="py-2.5 pr-3 font-medium text-ink print:text-black">{i.nombre}</td>
                <td className="py-2.5 pr-3 text-ink-soft print:text-neutral-700">
                  {i.categoria === "medicos" ? "Insumo médico" : "Insumo varios"}
                </td>
                <td
                  className={`py-2.5 pr-3 text-right font-semibold ${
                    i.stockActual <= 0 ? "text-red-700" : "text-ink print:text-black"
                  }`}
                >
                  {i.stockActual}
                </td>
                <td className="py-2.5 text-right text-ink-soft print:text-neutral-700">
                  {i.stockMinimo}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-ink-soft print:text-neutral-600">
                  No hay insumos con stock bajo en esta sede.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
