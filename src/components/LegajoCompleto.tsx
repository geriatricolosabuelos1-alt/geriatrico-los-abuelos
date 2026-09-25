import { createClient } from "@/lib/supabase/server";
import { generarLibroFoliado } from "@/app/sucursales/[id]/legales/sanitario-actions";
import { calcularEdad } from "@/lib/residentes";
import { ETIQUETA_TIPO_INTERCONSULTA } from "@/lib/interconsultas";
import type {
  Emergencia,
  EvaluacionKinesiologia,
  FichaAdministrativa,
  FichaMedica,
  InterconsultaCompleta,
  MedicamentoResidente,
  PrescripcionDietaria,
  RestriccionResidente,
  Residente,
  SesionKinesiologia,
  VacunacionResidente,
} from "@/lib/types";

const ETIQUETA_VACUNA: Record<string, string> = {
  antigripal: "Antigripal",
  neumococo: "Neumococo",
  covid19: "COVID-19",
  otra: "Otra",
};

function fecha(valor: string | null | undefined): string {
  if (!valor) return "—";
  return new Date(valor.length === 10 ? valor + "T00:00:00" : valor).toLocaleDateString("es-AR");
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 border-b border-black pb-0.5 text-[0.8rem] font-bold uppercase tracking-wide">{titulo}</h3>
      {children}
    </section>
  );
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string | number | null | undefined }) {
  return (
    <p>
      <span className="font-semibold">{etiqueta}:</span>{" "}
      {valor === null || valor === undefined || valor === "" ? "—" : valor}
    </p>
  );
}

function Tabla({ columnas, filas }: { columnas: string[]; filas: (string | number | null)[][] }) {
  if (filas.length === 0) return <p className="text-neutral-600">Sin registros.</p>;
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-neutral-100">
          {columnas.map((c) => (
            <th key={c} className="border border-neutral-400 px-1.5 py-1 text-left text-[0.62rem] uppercase">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((f, i) => (
          <tr key={i} className="break-inside-avoid">
            {f.map((v, j) => (
              <td key={j} className="whitespace-pre-wrap border border-neutral-400 px-1.5 py-1 align-top">
                {v === null || v === "" ? "—" : v}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Legajo completo de un residente, pensado para imprimir (se usa solo o para toda la sede).
export async function LegajoCompleto({ residenteId, sede }: { residenteId: string; sede: string }) {
  const supabase = await createClient();

  // Se usa select("*") en las tablas nuevas para que el legajo salga aunque falte alguna columna.
  const [
    { data: residente },
    { data: fichaAdm },
    { data: fichaMed },
    { data: medicamentos },
    { data: vacunas },
    { data: interconsultas },
    { data: evalKinesio },
    { data: sesionesKinesio },
    { data: dieta },
    { data: restricciones },
    { data: documentos },
    { data: emergencias },
    entradasClinicas,
  ] = await Promise.all([
    supabase.from("residentes").select("*").eq("id", residenteId).single<Residente>(),
    supabase.from("ficha_administrativa").select("*").eq("residente_id", residenteId).maybeSingle<FichaAdministrativa>(),
    supabase.from("ficha_medica").select("*").eq("residente_id", residenteId).maybeSingle<FichaMedica>(),
    supabase
      .from("medicamentos_residente")
      .select("*")
      .eq("residente_id", residenteId)
      .eq("activo", true)
      .order("nombre")
      .returns<MedicamentoResidente[]>(),
    supabase
      .from("vacunaciones_residente")
      .select("*")
      .eq("residente_id", residenteId)
      .order("fecha_aplicacion")
      .returns<VacunacionResidente[]>(),
    supabase
      .from("interconsultas")
      .select("*")
      .eq("residente_id", residenteId)
      .order("created_at")
      .returns<InterconsultaCompleta[]>(),
    supabase
      .from("kinesiologia_evaluaciones")
      .select("*")
      .eq("residente_id", residenteId)
      .order("fecha")
      .returns<EvaluacionKinesiologia[]>(),
    supabase
      .from("kinesiologia_sesiones")
      .select("*")
      .eq("residente_id", residenteId)
      .order("fecha")
      .returns<SesionKinesiologia[]>(),
    supabase
      .from("prescripcion_dietaria")
      .select("*")
      .eq("residente_id", residenteId)
      .eq("activa", true)
      .order("vigente_desde", { ascending: false })
      .limit(1)
      .maybeSingle<PrescripcionDietaria>(),
    supabase
      .from("restricciones_residente")
      .select("*")
      .eq("residente_id", residenteId)
      .eq("activo", true)
      .returns<RestriccionResidente[]>(),
    supabase
      .from("documentos_residente")
      .select("tipo, nombre_archivo, created_at")
      .eq("residente_id", residenteId)
      .order("created_at")
      .returns<{ tipo: string; nombre_archivo: string; created_at: string }[]>(),
    supabase
      .from("emergencias")
      .select("*")
      .eq("residente_id", residenteId)
      .order("fecha")
      .returns<Emergencia[]>(),
    generarLibroFoliado(residenteId),
  ]);

  if (!residente) return null;

  const edad = calcularEdad(residente.fecha_nacimiento);

  return (
    <article className="legajo-completo text-[0.72rem] leading-snug text-black">
      <header className="mb-3 flex items-start justify-between border-b-2 border-black pb-2">
        <div>
          <p className="text-[0.65rem] uppercase tracking-widest text-neutral-600">Legajo del residente · {sede}</p>
          <h2 className="text-lg font-bold">
            {residente.apellido}, {residente.nombre}
          </h2>
          <p>
            {[
              residente.dni && `DNI ${residente.dni}`,
              edad !== null && `${edad} años`,
              residente.habitacion && `Hab. ${residente.habitacion}`,
              `Ingreso ${fecha(residente.fecha_ingreso)}`,
              residente.fecha_egreso && `Egreso ${fecha(residente.fecha_egreso)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <p className="text-right text-[0.62rem] text-neutral-600">Emitido el {new Date().toLocaleDateString("es-AR")}</p>
      </header>

      <Seccion titulo="1. Datos personales">
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
          <Campo etiqueta="Fecha de nacimiento" valor={fecha(residente.fecha_nacimiento)} />
          <Campo etiqueta="Nacionalidad" valor={residente.nacionalidad} />
          <Campo etiqueta="Nivel de cuidado" valor={residente.nivel_cuidado} />
          <Campo etiqueta="Estado" valor={residente.activo ? "Activo" : "Dado de baja"} />
          {!residente.activo && (
            <Campo
              etiqueta="Motivo de egreso"
              valor={[residente.motivo_egreso, residente.detalle_egreso].filter(Boolean).join(" — ")}
            />
          )}
          <Campo etiqueta="Contacto familiar" valor={residente.contacto_familiar} />
          <Campo etiqueta="Teléfono familiar" valor={residente.telefono_familiar} />
        </div>
      </Seccion>

      <Seccion titulo="2. Datos administrativos">
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
          <Campo etiqueta="Obra social" valor={fichaAdm?.obra_social} />
          <Campo etiqueta="N° de afiliado" valor={fichaAdm?.numero_afiliado} />
          <Campo etiqueta="Tipo de cobertura" valor={fichaAdm?.tipo_cobertura} />
          <Campo etiqueta="Vencimiento CUD" valor={fecha(fichaAdm?.cud_vencimiento)} />
          <Campo etiqueta="Contratante" valor={fichaAdm?.contratante_nombre} />
          <Campo etiqueta="DNI contratante" valor={fichaAdm?.contratante_dni} />
          <Campo etiqueta="Domicilio contratante" valor={fichaAdm?.contratante_domicilio} />
        </div>
      </Seccion>

      <Seccion titulo="3. Ficha médica">
        <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
          <Campo etiqueta="Médico de cabecera" valor={fichaMed?.medico_cabecera} />
          <Campo etiqueta="Médico de emergencia" valor={fichaMed?.medico_emergencia} />
          <Campo etiqueta="Teléfono emergencia" valor={fichaMed?.telefono_emergencia_medica} />
          <Campo etiqueta="Grupo sanguíneo" valor={fichaMed?.grupo_sanguineo} />
        </div>
        <Campo etiqueta="Alergias" valor={fichaMed?.alergias} />
        <Campo etiqueta="Diagnósticos" valor={fichaMed?.diagnosticos} />
        <Campo etiqueta="Observaciones médicas" valor={residente.observaciones_medicas} />
      </Seccion>

      <Seccion titulo="4. Medicación indicada">
        <Tabla
          columnas={["Medicamento", "Dosis", "Frecuencia / horarios", "Vía", "Indicaciones"]}
          filas={(medicamentos ?? []).map((m) => [
            `${m.nombre}${m.tipo_administracion === "sos" ? " (SOS)" : ""}`,
            m.dosis,
            [m.frecuencia, m.horarios?.length ? m.horarios.join(", ") : m.horario].filter(Boolean).join(" · "),
            m.via_administracion,
            m.instrucciones,
          ])}
        />
      </Seccion>

      <Seccion titulo="5. Nutrición">
        <Campo
          etiqueta="Dieta vigente"
          valor={
            dieta
              ? `${dieta.tipo_dieta} · IDDSI ${dieta.nivel_iddsi} · Líquidos ${dieta.tipo_liquido} (desde ${fecha(
                  dieta.vigente_desde,
                )})${dieta.notas ? ` — ${dieta.notas}` : ""}`
              : null
          }
        />
        <Campo
          etiqueta="Restricciones"
          valor={(restricciones ?? []).map((r) => `${r.tipo}: ${r.detalle}`).join("; ")}
        />
      </Seccion>

      <Seccion titulo="6. Vacunación">
        <Tabla
          columnas={["Vacuna", "Fecha", "Dosis", "Próxima"]}
          filas={(vacunas ?? []).map((v) => [
            v.vacuna === "otra" ? (v.vacuna_otra ?? "Otra") : (ETIQUETA_VACUNA[v.vacuna] ?? v.vacuna),
            fecha(v.fecha_aplicacion),
            v.dosis_numero,
            fecha(v.proxima_dosis),
          ])}
        />
      </Seccion>

      <Seccion titulo="7. Interconsultas">
        <Tabla
          columnas={["Pedido", "Tipo", "Detalle / motivo", "Resultado", "Fecha resultado"]}
          filas={(interconsultas ?? []).map((i) => [
            fecha(i.fecha_pedido ?? i.created_at),
            ETIQUETA_TIPO_INTERCONSULTA[i.tipo] ?? i.tipo,
            [i.detalle, i.motivo].filter(Boolean).join(" — "),
            i.resultado ?? (i.resuelta ? "Resuelta" : "Pendiente"),
            fecha(i.fecha_resultado),
          ])}
        />
      </Seccion>

      <Seccion titulo="8. Kinesiología">
        {(evalKinesio ?? []).map((e) => (
          <div key={e.id} className="mb-2 break-inside-avoid">
            <p className="font-semibold">Evaluación del {fecha(e.fecha)}</p>
            <p>
              {[
                e.diagnostico && `Dx: ${e.diagnostico}`,
                e.movilidad && `Movilidad: ${e.movilidad}`,
                e.marcha && `Marcha: ${e.marcha}`,
                e.equilibrio && `Equilibrio: ${e.equilibrio}`,
                e.riesgo_caida && `Riesgo de caída: ${e.riesgo_caida}`,
                e.dolor_eva !== null && `Dolor EVA ${e.dolor_eva}/10`,
                e.ayudas_tecnicas?.length && `Ayudas: ${e.ayudas_tecnicas.join(", ")}`,
                e.objetivos && `Objetivos: ${e.objetivos}`,
                e.plan && `Plan: ${e.plan}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        ))}
        <Tabla
          columnas={["Sesión", "Min", "Trabajo realizado", "Tolerancia", "Evolución"]}
          filas={(sesionesKinesio ?? []).map((s) => [
            fecha(s.fecha),
            s.duracion_minutos,
            s.trabajo_realizado,
            s.tolerancia,
            s.evolucion,
          ])}
        />
      </Seccion>

      <Seccion titulo="9. Emergencias">
        <Tabla
          columnas={["Fecha", "Hora", "Prestador", "Motivo", "Traslado", "Satisfactoria"]}
          filas={(emergencias ?? []).map((e) => [
            fecha(e.fecha),
            e.hora?.slice(0, 5) ?? null,
            e.prestador,
            e.motivo,
            e.traslado ? "Sí" : "No",
            e.satisfactoria === null ? null : e.satisfactoria ? "Sí" : "No",
          ])}
        />
      </Seccion>

      <Seccion titulo="10. Historia clínica (evoluciones y notas)">
        <Tabla
          columnas={["N°", "Fecha", "Tipo", "Autor", "Contenido"]}
          filas={entradasClinicas.map((e) => [
            e.folio,
            new Date(e.fecha).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }),
            e.tipo,
            e.autor,
            e.contenido,
          ])}
        />
      </Seccion>

      <Seccion titulo="11. Documentación archivada">
        <Tabla
          columnas={["Tipo", "Archivo", "Cargado"]}
          filas={(documentos ?? []).map((d) => [d.tipo, d.nombre_archivo, fecha(d.created_at)])}
        />
      </Seccion>
    </article>
  );
}
