import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotonExportarPdf } from "@/components/BotonExportarPdf";
import type { MedicamentoResidente } from "@/lib/types";

type Params = { id: string };

type ResidenteConMeds = {
  id: string;
  nombre: string;
  apellido: string;
  medicamentos_residente: MedicamentoResidente[];
};

export default async function InformeMedicacionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: sucursal }, { data: residentes }] = await Promise.all([
    supabase
      .from("sucursales")
      .select("id, nombre")
      .eq("id", id)
      .single<{ id: string; nombre: string }>(),
    supabase
      .from("residentes")
      .select(
        "id, nombre, apellido, medicamentos_residente(id, residente_id, nombre, dosis, cantidad_stock, notas, updated_at)",
      )
      .eq("sucursal_id", id)
      .eq("activo", true)
      .order("apellido")
      .returns<ResidenteConMeds[]>(),
  ]);

  if (!sucursal) {
    notFound();
  }

  const filas = (residentes ?? [])
    .filter((r) => r.medicamentos_residente.length > 0)
    .flatMap((r) =>
      r.medicamentos_residente
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((m) => ({
          residente: `${r.apellido}, ${r.nombre}`,
          medicamento: m.nombre,
          dosis: m.dosis ?? "—",
          stock: m.cantidad_stock,
          notas: m.notas,
        })),
    );

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
              Informe de stock de medicación · {sucursal!.nombre}
            </p>
            <p className="mt-1 text-xs text-ink-soft print:text-neutral-600">
              Generado el {new Date().toLocaleDateString("es-AR")}
            </p>
          </div>
          <div className="print:hidden">
            <BotonExportarPdf />
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-edge text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft print:border-neutral-300 print:text-neutral-500">
              <th className="py-2 pr-3">Residente</th>
              <th className="py-2 pr-3">Medicamento</th>
              <th className="py-2 pr-3">Dosis</th>
              <th className="py-2 pr-3 text-right">Stock actual</th>
              <th className="py-2">Notas</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className="border-b border-edge print:border-neutral-300">
                <td className="py-2.5 pr-3 font-medium text-ink print:text-black">
                  {f.residente}
                </td>
                <td className="py-2.5 pr-3 text-ink print:text-black">{f.medicamento}</td>
                <td className="py-2.5 pr-3 text-ink-soft print:text-neutral-700">{f.dosis}</td>
                <td
                  className={`py-2.5 pr-3 text-right font-semibold ${
                    f.stock <= 5 ? "text-red-700" : "text-ink print:text-black"
                  }`}
                >
                  {f.stock}
                </td>
                <td className="py-2.5 text-ink-soft print:text-neutral-700">{f.notas ?? "—"}</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-ink-soft print:text-neutral-600">
                  No hay medicación cargada en esta sede.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
