import { createClient } from "@/lib/supabase/server";
import { obtenerResumenSucursal } from "@/lib/dashboard";
import { BotonExportarPdf } from "@/components/BotonExportarPdf";

export default async function InformeMedicacionGeneralPage() {
  const supabase = await createClient();

  const { data: sucursales } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .order("nombre")
    .returns<{ id: string; nombre: string }[]>();

  const filas = (
    await Promise.all(
      (sucursales ?? []).map(async (s) => {
        const resumen = await obtenerResumenSucursal(supabase, s.id);
        return resumen.alertasMedicacion.map((a) => ({ ...a, sede: s.nombre }));
      }),
    )
  )
    .flat()
    .sort((a, b) => (a.diasRestantes ?? a.stockActual ?? 99) - (b.diasRestantes ?? b.stockActual ?? 99));

  function etiqueta(a: (typeof filas)[number]): string {
    if (a.sinDosisDiaria) {
      return a.nivel === "sin_stock" ? "Sin stock (sin dosis diaria)" : `${a.stockActual} unid. (sin dosis diaria)`;
    }
    if (a.nivel === "sin_stock") return "Sin stock";
    return `${a.diasRestantes} día${a.diasRestantes === 1 ? "" : "s"}`;
  }

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
              Informe de stock de medicación · Ambas sedes
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
              <th className="py-2 pr-3">Residente</th>
              <th className="py-2 pr-3">Sede</th>
              <th className="py-2 pr-3">Medicamento</th>
              <th className="py-2 text-right">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="border-b border-edge print:border-neutral-300">
                <td className="py-2.5 pr-3 font-medium text-ink print:text-black">
                  {f.residenteNombre}
                </td>
                <td className="py-2.5 pr-3 text-ink-soft print:text-neutral-700">{f.sede}</td>
                <td className="py-2.5 pr-3 text-ink print:text-black">{f.medicamentoNombre}</td>
                <td
                  className={`py-2.5 text-right font-semibold ${
                    f.nivel === "sin_stock" || f.nivel === "aviso_5"
                      ? "text-red-700"
                      : "text-amber-700"
                  }`}
                >
                  {etiqueta(f)}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-ink-soft print:text-neutral-600">
                  No hay alertas de medicación activas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
