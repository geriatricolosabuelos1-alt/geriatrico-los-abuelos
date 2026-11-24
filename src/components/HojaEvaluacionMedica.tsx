import { calcularEdad } from "@/lib/residentes";
import type { EvaluacionMedica, IndicacionMedica } from "@/lib/types";

export type DatosHojaEvaluacion = {
  nombre: string;
  dni: string | null;
  fechaNacimiento: string | null;
  obraSocial: string | null;
  afiliado: string | null;
  habitacion: string | null;
  evaluacion: EvaluacionMedica | null;
  indicacion: IndicacionMedica | null;
};

function fecha(valor: string | null | undefined): string {
  if (!valor) return "—";
  return new Date(valor.length === 10 ? valor + "T00:00:00" : valor).toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Mendoza",
  });
}

function mesAnio(valor: string): string {
  return new Date(valor + "T00:00:00").toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

const CELDA = "border border-neutral-400 px-2 py-1 align-top";
const TITULO = "mb-1 mt-4 text-[0.75rem] font-bold uppercase tracking-wide";

// Evaluación + indicaciones médicas de un residente: una hoja cada uno (se imprimen todos de una vez).
export function HojaEvaluacionMedica({ d, sede }: { d: DatosHojaEvaluacion; sede: string }) {
  const ev = d.evaluacion;
  const ind = d.indicacion;
  const firmado = ev?.firmado_por ? ev : ind?.firmado_por ? ind : null;
  const edad = calcularEdad(d.fechaNacimiento);
  const filasEv: [string, string | null][] = ev
    ? [
        ["Antecedentes", ev.antecedentes],
        ["Estado de conciencia", ev.estado_conciencia],
        ["Orientación", ev.orientacion.length > 0 ? ev.orientacion.join(", ") : null],
        ["Obs. orientación", ev.obs_orientacion],
        ["Alimentación", ev.alimentacion],
        ["Consistencia", ev.consistencia],
        ["Obs. alimentación", ev.obs_alimentacion],
        ["Marcha / Movilidad", ev.marcha_movilidad],
        ["Control urinario", ev.control_urinario],
        ["Control fecal", ev.control_fecal],
        ["Obs. esfínteres", ev.obs_esfinteres],
        ["Conducta", ev.conducta],
      ]
    : [];

  return (
    <article className="hoja-evaluacion text-[0.8rem] leading-snug text-black">
      <header className="mb-3 border-b-2 border-black pb-2">
        <p className="text-[0.65rem] uppercase tracking-widest text-neutral-600">{sede}</p>
        <h2 className="text-lg font-bold">Evaluación médica — {d.nombre}</h2>
      </header>

      <p className="text-[0.75rem]">
        DNI {d.dni ?? "—"} · Edad {edad !== null ? `${edad} años` : "—"} · Nacimiento {fecha(d.fechaNacimiento)} ·
        Obra social {d.obraSocial ?? "—"} · Afiliado {d.afiliado ?? "—"}
        {d.habitacion ? ` · Hab. ${d.habitacion}` : ""}
      </p>

      {ev && (
        <>
          <h3 className={TITULO}>Evaluación médica — {fecha(ev.fecha)}</h3>
          <table className="w-full border-collapse">
            <tbody>
              {filasEv
                .filter(([etiqueta, valor]) => valor || !etiqueta.startsWith("Obs."))
                .map(([etiqueta, valor]) => (
                  <tr key={etiqueta}>
                    <td className={`${CELDA} w-44 font-semibold`}>{etiqueta}</td>
                    <td className={CELDA}>{valor ?? "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}

      {ind && (
        <>
          <h3 className={TITULO}>Indicaciones médicas — {mesAnio(ind.periodo_desde)}</h3>
          <table className="w-full border-collapse text-[0.75rem]">
            <thead>
              <tr className="bg-neutral-100">
                <th className={`${CELDA} text-left`}>Medicación</th>
                <th className={CELDA}>MG</th>
                <th className={CELDA}>Cant. comp.</th>
                <th className={CELDA}>8 HS</th>
                <th className={CELDA}>12 HS</th>
                <th className={CELDA}>20 HS</th>
              </tr>
            </thead>
            <tbody>
              {ind.items.map((it, i) => (
                <tr key={i}>
                  <td className={CELDA}>{it.medicacion}</td>
                  <td className={`${CELDA} text-center`}>{it.mg || "—"}</td>
                  <td className={`${CELDA} text-center`}>{it.cantidad || "—"}</td>
                  <td className={`${CELDA} text-center`}>{it.h8 ? "X" : ""}</td>
                  <td className={`${CELDA} text-center`}>{it.h12 ? "X" : ""}</td>
                  <td className={`${CELDA} text-center`}>{it.h20 ? "X" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {ind.observaciones && <p className="mt-1 text-[0.75rem]">Observaciones: {ind.observaciones}</p>}
        </>
      )}

      <div className="mt-10 flex justify-end">
        <div className="w-64 text-center">
          <div className="h-16" aria-hidden />
          <div className="mb-1 border-t border-black" />
          {firmado ? (
            <>
              <p className="font-semibold">{firmado.firmante ?? "Médica"}</p>
              <p className="text-[0.7rem]">
                {firmado.matricula ? `Matrícula ${firmado.matricula} · ` : ""}Firmado el {fecha(firmado.firmado_at)}
              </p>
            </>
          ) : (
            <p className="text-[0.7rem]">Pendiente de firma médica</p>
          )}
        </div>
      </div>
    </article>
  );
}
