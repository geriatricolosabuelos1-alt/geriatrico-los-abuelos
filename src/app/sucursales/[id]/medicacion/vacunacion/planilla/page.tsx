import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotonExportarPdf } from "@/components/BotonExportarPdf";
import { calcularEdad } from "@/lib/residentes";
import type { TipoVacuna, VacunacionResidente } from "@/lib/types";
import { hoyArgentina } from "@/lib/fechas";

type Params = { id: string };

type ResidentePlanilla = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  fecha_nacimiento: string | null;
  habitacion: string | null;
  ficha_administrativa: { obra_social: string | null; numero_afiliado: string | null } | null;
  vacunaciones_residente: VacunacionResidente[];
};

const COLUMNAS_VACUNA: { tipo: TipoVacuna; etiqueta: string }[] = [
  { tipo: "antigripal", etiqueta: "Antigripal" },
  { tipo: "neumococo", etiqueta: "Neumococo" },
  { tipo: "covid19", etiqueta: "COVID-19" },
  { tipo: "otra", etiqueta: "Otras" },
];

function formatearFecha(fecha: string | null): string {
  return fecha ? new Date(fecha + "T00:00:00").toLocaleDateString("es-AR") : "—";
}

function describirDosis(v: VacunacionResidente): string {
  const nombre = v.vacuna === "otra" ? `${v.vacuna_otra ?? "Otra"} ` : "";
  const dosis = v.dosis_numero ? ` (${v.dosis_numero}ª)` : "";
  return `${nombre}${formatearFecha(v.fecha_aplicacion)}${dosis}`;
}

export default async function PlanillaVacunacionPage({ params }: { params: Promise<Params> }) {
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
        "id, nombre, apellido, dni, fecha_nacimiento, habitacion, ficha_administrativa(obra_social, numero_afiliado), vacunaciones_residente(id, residente_id, vacuna, vacuna_otra, fecha_aplicacion, dosis_numero, proxima_dosis, registrado_por, created_at)",
      )
      .eq("sucursal_id", id)
      .eq("activo", true)
      .order("apellido")
      .returns<ResidentePlanilla[]>(),
  ]);

  if (!sucursal) notFound();

  const CELDA = "border border-edge px-2 py-1.5 align-top print:border-neutral-400";

  return (
    <div className="flex min-h-screen w-full justify-center bg-panel px-4 py-10 print:block print:min-h-0 print:bg-white print:px-0 print:py-0">
      <style>{`@page { size: A4 landscape; margin: 10mm; }`}</style>

      <div className="w-full max-w-[1200px] overflow-hidden rounded-2xl border border-edge bg-card p-8 shadow-2xl print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={`/sucursales/${id}/medicacion/vacunacion`}
            className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
          >
            ← Volver a vacunación
          </Link>
          <BotonExportarPdf />
        </div>

        <div className="mb-5">
          <p className="font-display text-xl font-semibold text-ink print:text-black">Los Abuelos</p>
          <p className="text-xs uppercase tracking-widest text-ink-soft print:text-neutral-600">
            Planilla de vacunación · {sucursal.nombre}
          </p>
          <p className="mt-1 text-xs text-ink-soft print:text-neutral-600">
            Generada el {new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })} · {(residentes ?? []).length} residentes
          </p>
        </div>

        <table className="w-full border-collapse text-left text-[0.7rem]">
          <thead>
            <tr className="bg-panel-deep text-[0.6rem] font-semibold uppercase tracking-wide text-ink-soft print:bg-neutral-100 print:text-neutral-600">
              <th className={CELDA}>Apellido y nombre</th>
              <th className={CELDA}>Edad</th>
              <th className={CELDA}>F. nac.</th>
              <th className={CELDA}>DNI</th>
              <th className={CELDA}>Obra social / N° afiliado</th>
              {COLUMNAS_VACUNA.map((c) => (
                <th key={c.tipo} className={CELDA}>
                  {c.etiqueta}
                </th>
              ))}
              <th className={CELDA}>Próxima dosis</th>
            </tr>
          </thead>
          <tbody>
            {(residentes ?? []).map((r) => {
              const vacunas = [...r.vacunaciones_residente].sort((a, b) =>
                a.fecha_aplicacion.localeCompare(b.fecha_aplicacion),
              );
              const hoy = hoyArgentina();
              const proximas = vacunas
                .filter((v) => v.proxima_dosis && v.proxima_dosis >= hoy)
                .map((v) => v.proxima_dosis!)
                .sort();
              return (
                <tr key={r.id} className="break-inside-avoid">
                  <td className={`${CELDA} font-medium text-ink print:text-black`}>
                    {r.apellido}, {r.nombre}
                    {r.habitacion && (
                      <span className="block text-[0.6rem] font-normal text-ink-soft">Hab. {r.habitacion}</span>
                    )}
                  </td>
                  <td className={CELDA}>{calcularEdad(r.fecha_nacimiento) ?? "—"}</td>
                  <td className={CELDA}>{formatearFecha(r.fecha_nacimiento)}</td>
                  <td className={CELDA}>{r.dni ?? "—"}</td>
                  <td className={CELDA}>
                    {r.ficha_administrativa?.obra_social ?? "—"}
                    {r.ficha_administrativa?.numero_afiliado && (
                      <span className="block">N° {r.ficha_administrativa.numero_afiliado}</span>
                    )}
                  </td>
                  {COLUMNAS_VACUNA.map((c) => {
                    const aplicadas = vacunas.filter((v) => v.vacuna === c.tipo);
                    return (
                      <td key={c.tipo} className={CELDA}>
                        {aplicadas.length === 0
                          ? "—"
                          : aplicadas.map((v) => (
                              <span key={v.id} className="block">
                                {describirDosis(v)}
                              </span>
                            ))}
                      </td>
                    );
                  })}
                  <td className={CELDA}>{proximas.length ? formatearFecha(proximas[0]) : "—"}</td>
                </tr>
              );
            })}
            {(residentes ?? []).length === 0 && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-ink-soft">
                  No hay residentes activos en esta sede.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
