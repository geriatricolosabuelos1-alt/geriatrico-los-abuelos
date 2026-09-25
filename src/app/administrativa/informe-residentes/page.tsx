import { createClient } from "@/lib/supabase/server";
import { BotonExportarPdf } from "@/components/BotonExportarPdf";

type FilaResidente = {
  id: string;
  nombre: string;
  apellido: string;
  habitacion: string | null;
  fecha_ingreso: string | null;
  sucursal_id: string;
};

export default async function InformeResidentesGeneralPage() {
  const supabase = await createClient();

  const [{ data: sucursales }, { data: residentes }] = await Promise.all([
    supabase.from("sucursales").select("id, nombre").order("nombre").returns<
      { id: string; nombre: string }[]
    >(),
    supabase
      .from("residentes")
      .select("id, nombre, apellido, habitacion, fecha_ingreso, sucursal_id")
      .eq("activo", true)
      .order("apellido")
      .returns<FilaResidente[]>(),
  ]);

  const nombreSede = new Map((sucursales ?? []).map((s) => [s.id, s.nombre]));
  const filas = (residentes ?? []).sort((a, b) => {
    const sedeA = nombreSede.get(a.sucursal_id) ?? "";
    const sedeB = nombreSede.get(b.sucursal_id) ?? "";
    return sedeA === sedeB ? a.apellido.localeCompare(b.apellido) : sedeA.localeCompare(sedeB);
  });

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
              Residentes activos · Ambas sedes
            </p>
            <p className="mt-1 text-xs text-ink-soft print:text-neutral-600">
              Generado el {new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })} · {filas.length} residentes
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
              <th className="py-2 pr-3">Habitación</th>
              <th className="py-2 text-right">Fecha de ingreso</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((r) => (
              <tr key={r.id} className="border-b border-edge print:border-neutral-300">
                <td className="py-2.5 pr-3 font-medium text-ink print:text-black">
                  {r.apellido}, {r.nombre}
                </td>
                <td className="py-2.5 pr-3 text-ink-soft print:text-neutral-700">
                  {nombreSede.get(r.sucursal_id) ?? "—"}
                </td>
                <td className="py-2.5 pr-3 text-ink-soft print:text-neutral-700">
                  {r.habitacion ?? "—"}
                </td>
                <td className="py-2.5 text-right text-ink-soft print:text-neutral-700">
                  {r.fecha_ingreso
                    ? new Date(r.fecha_ingreso + "T00:00:00").toLocaleDateString("es-AR")
                    : "—"}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-ink-soft print:text-neutral-600">
                  No hay residentes activos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
