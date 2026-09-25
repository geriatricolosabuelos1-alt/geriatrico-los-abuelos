import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { BotonImprimir } from "@/components/BotonImprimir";
import {
  BotonEliminarKinesio,
  FormularioEvaluacionKinesio,
  FormularioSesionKinesio,
} from "@/components/KinesiologiaClient";
import { calcularEdad } from "@/lib/residentes";
import type { EvaluacionKinesiologia, Perfil, SesionKinesiologia } from "@/lib/types";

type Params = { id: string };

function formatearFecha(fecha: string | null): string {
  return fecha ? new Date(fecha + "T00:00:00").toLocaleDateString("es-AR") : "—";
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | number | null | undefined }) {
  if (valor === null || valor === undefined || valor === "") return null;
  return (
    <div>
      <dt className="text-[0.6rem] font-bold uppercase tracking-wide text-ink-soft print:text-neutral-500">
        {etiqueta}
      </dt>
      <dd className="whitespace-pre-wrap text-sm text-ink print:text-black">{valor}</dd>
    </div>
  );
}

export default async function KinesiologiaResidentePage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: residente }, { data: evaluaciones }, { data: sesiones }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre_completo, rol, sucursal_id, activo")
      .eq("id", user!.id)
      .single<Perfil>(),
    supabase
      .from("residentes")
      .select("id, nombre, apellido, dni, fecha_nacimiento, habitacion, sucursal_id")
      .eq("id", id)
      .single<{
        id: string;
        nombre: string;
        apellido: string;
        dni: string | null;
        fecha_nacimiento: string | null;
        habitacion: string | null;
        sucursal_id: string;
      }>(),
    supabase
      .from("kinesiologia_evaluaciones")
      .select("*")
      .eq("residente_id", id)
      .order("fecha", { ascending: false })
      .returns<EvaluacionKinesiologia[]>(),
    supabase
      .from("kinesiologia_sesiones")
      .select("*")
      .eq("residente_id", id)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<SesionKinesiologia[]>(),
  ]);

  if (!residente || !perfil) notFound();

  const idsProfesionales = [
    ...new Set(
      [...(evaluaciones ?? []), ...(sesiones ?? [])]
        .map((r) => r.profesional_id)
        .filter((x): x is string => !!x),
    ),
  ];
  const nombreProfesional = new Map<string, string>();
  if (idsProfesionales.length > 0) {
    const { data: perfiles } = await supabase
      .from("perfiles")
      .select("id, nombre_completo")
      .in("id", idsProfesionales)
      .returns<{ id: string; nombre_completo: string }[]>();
    for (const p of perfiles ?? []) nombreProfesional.set(p.id, p.nombre_completo);
  }

  const edad = calcularEdad(residente.fecha_nacimiento);
  const CELDA = "px-3 py-2 align-top";

  return (
    <div className="flex min-h-screen w-full print:block">
      <div className="print:hidden">
        <Sidebar
          perfil={perfil!}
          activo={{ tipo: "sucursal", sucursalId: residente.sucursal_id, seccion: "kinesiologia", area: "medicina" }}
        />
      </div>

      <main className="flex-1 space-y-6 px-9 py-8 print:px-0 print:py-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">Kinesiología</p>
            <h1 className="font-display text-[32px] font-semibold text-ink print:text-2xl print:text-black">
              {residente.apellido}, {residente.nombre}
            </h1>
            <p className="text-sm text-ink-soft print:text-neutral-600">
              {[
                edad !== null && `${edad} años`,
                residente.dni && `DNI ${residente.dni}`,
                residente.habitacion && `Hab. ${residente.habitacion}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <Link
              href={`/sucursales/${residente.sucursal_id}/kinesiologia`}
              className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
            >
              ← Todos los residentes
            </Link>
            <BotonImprimir />
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink print:text-black">Evaluaciones</h2>
          </div>
          <FormularioEvaluacionKinesio residenteId={id} />

          {(evaluaciones ?? []).map((e, i) => (
            <article
              key={e.id}
              className="break-inside-avoid rounded-2xl border border-edge bg-card p-5 print:border-neutral-300"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink print:text-black">
                  {i === (evaluaciones ?? []).length - 1 ? "Evaluación inicial" : "Reevaluación"} ·{" "}
                  {formatearFecha(e.fecha)}
                  <span className="ml-2 text-xs font-normal text-ink-soft">
                    {e.profesional_id ? nombreProfesional.get(e.profesional_id) ?? "" : ""}
                  </span>
                </p>
                <BotonEliminarKinesio residenteId={id} tabla="evaluacion" id={e.id} />
              </div>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Dato etiqueta="Motivo" valor={e.motivo} />
                <Dato etiqueta="Diagnóstico kinésico" valor={e.diagnostico} />
                <Dato
                  etiqueta="Dolor (EVA)"
                  valor={
                    e.dolor_eva !== null
                      ? `${e.dolor_eva}/10${e.dolor_localizacion ? ` · ${e.dolor_localizacion}` : ""}`
                      : e.dolor_localizacion
                  }
                />
                <Dato etiqueta="Movilidad" valor={e.movilidad} />
                <Dato etiqueta="Transferencias" valor={e.transferencias} />
                <Dato etiqueta="Marcha" valor={e.marcha} />
                <Dato etiqueta="Equilibrio" valor={e.equilibrio} />
                <Dato etiqueta="Riesgo de caída" valor={e.riesgo_caida} />
                <Dato etiqueta="Caídas último año" valor={e.caidas_ultimo_anio} />
                <Dato etiqueta="Ayudas técnicas" valor={e.ayudas_tecnicas.join(", ")} />
                <Dato etiqueta="Sesiones por semana" valor={e.sesiones_semanales} />
                <Dato etiqueta="Fuerza muscular" valor={e.fuerza_muscular} />
                <Dato etiqueta="Rango articular" valor={e.rango_articular} />
                <Dato etiqueta="Objetivos" valor={e.objetivos} />
                <Dato etiqueta="Plan de tratamiento" valor={e.plan} />
              </dl>
            </article>
          ))}
          {(evaluaciones ?? []).length === 0 && (
            <p className="text-sm text-ink-soft">Todavía no tiene evaluación kinésica.</p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink print:text-black">
            Sesiones ({(sesiones ?? []).length})
          </h2>
          <FormularioSesionKinesio residenteId={id} />
          <div className="overflow-x-auto rounded-2xl border border-edge bg-card print:border-neutral-300">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                  <th className={CELDA}>Fecha</th>
                  <th className={CELDA}>Min</th>
                  <th className={CELDA}>Trabajo realizado</th>
                  <th className={CELDA}>Tolerancia</th>
                  <th className={CELDA}>Evolución</th>
                  <th className={CELDA}>Profesional</th>
                  <th className={CELDA}></th>
                </tr>
              </thead>
              <tbody>
                {(sesiones ?? []).map((s) => (
                  <tr key={s.id} className="border-t border-edge">
                    <td className={`${CELDA} whitespace-nowrap text-ink`}>{formatearFecha(s.fecha)}</td>
                    <td className={`${CELDA} text-ink-soft`}>{s.duracion_minutos ?? "—"}</td>
                    <td className={`${CELDA} text-ink`}>{s.trabajo_realizado}</td>
                    <td className={`${CELDA} text-ink-soft`}>{s.tolerancia ?? "—"}</td>
                    <td className={`${CELDA} text-ink-soft`}>{s.evolucion ?? "—"}</td>
                    <td className={`${CELDA} text-ink-soft`}>
                      {s.profesional_id ? nombreProfesional.get(s.profesional_id) ?? "—" : "—"}
                    </td>
                    <td className={`${CELDA} text-right`}>
                      <BotonEliminarKinesio residenteId={id} tabla="sesion" id={s.id} />
                    </td>
                  </tr>
                ))}
                {(sesiones ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-ink-soft">
                      Sin sesiones registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
