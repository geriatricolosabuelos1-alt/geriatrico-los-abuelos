import { calcularEdad } from "@/lib/residentes";
import { ENCABEZADO_NUTRICIONISTA, OPCIONES_NUTRICION, nombrePeriodo, type FichaNutricion } from "@/lib/nutricion";

export type DatosPacienteNutricion = {
  nombre: string;
  apellido: string;
  dni: string | null;
  fecha_nacimiento: string | null;
  obra_social: string | null;
};

function fecha(valor: string | null | undefined): string {
  if (!valor) return "";
  const [a, m, d] = valor.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

function Linea({ etiqueta, valor, ancho = "flex-1" }: { etiqueta: string; valor: string | number | null | undefined; ancho?: string }) {
  return (
    <p className={`flex items-end gap-1.5 ${ancho}`}>
      <span className="whitespace-nowrap font-semibold">{etiqueta}:</span>
      <span className="min-h-[1.1em] flex-1 border-b border-neutral-500 px-1">{valor ?? ""}</span>
    </p>
  );
}

function Opciones({ etiqueta, opciones, marcadas }: { etiqueta: string; opciones: readonly string[]; marcadas: string[] }) {
  return (
    <p className="leading-relaxed">
      <span className="font-semibold">{etiqueta}: </span>
      {opciones.map((o) => (
        <span key={o} className="mr-3 whitespace-nowrap">
          {marcadas.includes(o) ? "☒" : "☐"} {o}
        </span>
      ))}
    </p>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1.5 mt-4 border-b border-black pb-0.5 text-[0.8rem] font-bold uppercase">{children}</h3>;
}

// Formulario de Nutrición tal cual el papel, con las casillas marcadas.
export function HojaFichaNutricion({
  paciente,
  periodo,
  ficha,
}: {
  paciente: DatosPacienteNutricion;
  periodo: string;
  ficha: FichaNutricion | null;
}) {
  const f = ficha;
  const edad = calcularEdad(paciente.fecha_nacimiento);
  const uno = (v: string | null | undefined) => (v ? [v] : []);

  return (
    <article className="hoja-nutricion break-after-page text-[0.78rem] leading-snug text-black">
      <header className="mb-3 flex items-start justify-between border-b-2 border-black pb-2">
        <div>
          <p className="font-bold">{ENCABEZADO_NUTRICIONISTA.nombre}</p>
          <p>{ENCABEZADO_NUTRICIONISTA.cargo}</p>
          <p>{ENCABEZADO_NUTRICIONISTA.matricula}</p>
        </div>
        <div className="text-right">
          <p>Residencia para Adultos Mayores</p>
          <p className="font-bold">“Edith”</p>
          <p>Luján de Cuyo - Mendoza</p>
        </div>
      </header>

      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold uppercase">Nutrición</h2>
        <p>
          Mes: <span className="font-semibold">{nombrePeriodo(periodo)}</span> · Fecha:{" "}
          {f ? fecha(f.fecha) : "____/____/________"}
        </p>
      </div>

      <div className="mt-2 space-y-2">
        <div className="flex gap-6">
          <Linea etiqueta="Paciente" valor={`${paciente.apellido}, ${paciente.nombre}`} />
          <Linea etiqueta="Edad" valor={edad} ancho="w-28" />
        </div>
        <div className="flex gap-6">
          <Linea etiqueta="Fecha de Nacimiento" valor={fecha(paciente.fecha_nacimiento)} />
          <Linea etiqueta="DNI" valor={paciente.dni} ancho="w-56" />
        </div>
        <Linea etiqueta="Obra Social" valor={paciente.obra_social} />
        <Linea etiqueta="Diagnóstico Principal" valor={f?.diagnostico_principal} />
        <Linea etiqueta="Patologías Asociadas" valor={f?.patologias_asociadas} />
      </div>

      <Titulo>Alimentación</Titulo>
      <div className="space-y-1">
        <Opciones etiqueta="Consistencia" opciones={OPCIONES_NUTRICION.consistencia} marcadas={f?.consistencia ?? []} />
        <Opciones etiqueta="Según Patología" opciones={OPCIONES_NUTRICION.segun_patologia} marcadas={f?.segun_patologia ?? []} />
        {f?.patologia_otra && <p className="pl-4">Otra: {f.patologia_otra}</p>}
        <Opciones
          etiqueta="Vía de Administración"
          opciones={OPCIONES_NUTRICION.via_administracion}
          marcadas={f?.via_administracion ?? []}
        />
        <Opciones etiqueta="Asistencia para alimentarse" opciones={OPCIONES_NUTRICION.asistencia} marcadas={uno(f?.asistencia)} />
        <Opciones etiqueta="Ingesta alimentaria" opciones={OPCIONES_NUTRICION.ingesta} marcadas={uno(f?.ingesta)} />
        <Opciones
          etiqueta="Prótesis dental"
          opciones={["Sí", "No"]}
          marcadas={f?.protesis_dental === true ? ["Sí"] : f?.protesis_dental === false ? ["No"] : []}
        />
        <Opciones etiqueta="Disfagia" opciones={OPCIONES_NUTRICION.disfagia} marcadas={uno(f?.disfagia)} />
        <Opciones etiqueta="Suplementación" opciones={OPCIONES_NUTRICION.suplementacion} marcadas={f?.suplementacion ?? []} />
        <Linea etiqueta="Cantidad/Frecuencia" valor={f?.suplementacion_cantidad} />
      </div>

      <Titulo>Datos antropométricos</Titulo>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-6">
          <Linea etiqueta="Peso Actual" valor={f?.peso_actual != null ? `${f.peso_actual} kg` : null} ancho="w-40" />
          <Linea etiqueta="Peso ideal" valor={f?.peso_ideal != null ? `${f.peso_ideal} kg` : null} ancho="w-40" />
          <p className="flex items-end gap-1.5">
            <span className="font-semibold">Pérdida de peso:</span>
            <span>
              {f?.perdida_peso === false ? "☒" : "☐"} no {f?.perdida_peso === true ? "☒" : "☐"} si
            </span>
          </p>
          <Linea etiqueta="% pérdida" valor={f?.perdida_peso_pct != null ? `${f.perdida_peso_pct}%` : null} ancho="w-32" />
        </div>
        <div className="flex gap-6">
          <Linea etiqueta="Talla" valor={f?.talla != null ? `${f.talla} m` : null} ancho="w-40" />
          <Linea etiqueta="IMC" valor={f?.imc} ancho="w-40" />
        </div>
      </div>

      <Titulo>Evaluación nutricional</Titulo>
      <Opciones etiqueta="Estado" opciones={OPCIONES_NUTRICION.evaluacion_nutricional} marcadas={uno(f?.evaluacion_nutricional)} />

      <Titulo>Evaluación funcional</Titulo>
      <Opciones etiqueta="Marcar" opciones={OPCIONES_NUTRICION.evaluacion_funcional} marcadas={f?.evaluacion_funcional ?? []} />

      <Titulo>Observaciones y plan nutricional</Titulo>
      <p className="min-h-[6rem] whitespace-pre-wrap border-b border-neutral-500">{f?.observaciones ?? ""}</p>

      <div className="mt-14 flex justify-end">
        <div className="w-60 text-center">
          <div className="mb-1 border-t border-black" />
          <p className="text-[0.65rem]">
            {ENCABEZADO_NUTRICIONISTA.nombre} · {ENCABEZADO_NUTRICIONISTA.matricula}
          </p>
        </div>
      </div>
    </article>
  );
}
