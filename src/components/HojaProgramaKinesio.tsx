import type { ReactNode } from "react";
import type { ProgramaKinesiologia } from "@/lib/types";

type Props = {
  programa: ProgramaKinesiologia;
  paciente: string;
  edad: number | null;
  dni: string | null;
  obraSocial: string | null;
  sede: string;
  profesional: string | null;
  acciones?: ReactNode;
};

const SEMANAS = ["semana_1", "semana_2", "semana_3", "semana_4"] as const;
const RENGLONES_MINIMOS = 3;

function Renglones({ texto, minimo = RENGLONES_MINIMOS }: { texto: string | null; minimo?: number }) {
  const lineas = (texto ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const total = Math.max(lineas.length, minimo);
  return (
    <ul>
      {Array.from({ length: total }, (_, i) => (
        <li
          key={i}
          className="min-h-[1.6rem] border-b border-dotted border-ink-soft/60 pt-1 text-sm text-ink print:border-neutral-500 print:text-black"
        >
          {lineas[i] ?? ""}
        </li>
      ))}
    </ul>
  );
}

function Linea({ etiqueta, valor, ancho = "flex-1" }: { etiqueta: string; valor: string | number | null; ancho?: string }) {
  return (
    <p className={`flex items-baseline gap-2 ${ancho}`}>
      <span className="text-xs font-bold uppercase text-ink print:text-black">{etiqueta}</span>
      <span className="flex-1 border-b border-dotted border-ink-soft/60 px-1 text-sm text-ink print:border-neutral-500 print:text-black">
        {valor ?? ""}
      </span>
    </p>
  );
}

export function HojaProgramaKinesio({
  programa,
  paciente,
  edad,
  dni,
  obraSocial,
  sede,
  profesional,
  acciones,
}: Props) {
  return (
    <article className="break-inside-avoid space-y-4 rounded-2xl border border-edge bg-card p-6 print:break-after-page print:rounded-none print:border-0 print:p-0">
      <header className="text-center">
        <p className="text-sm font-semibold uppercase text-ink print:text-black">Residencia de adultos mayores</p>
        <p className="font-display text-lg font-bold text-ink print:text-black">{sede}</p>
        <h3 className="mt-2 text-sm font-bold uppercase underline text-ink print:text-black">Evoluciones Kinesiología</h3>
      </header>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Linea etiqueta="Paciente:" valor={paciente} ancho="min-w-[16rem] flex-[3]" />
          <Linea etiqueta="Edad:" valor={edad} ancho="w-28" />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Linea etiqueta="OS:" valor={obraSocial} ancho="min-w-[14rem] flex-[3]" />
          <Linea etiqueta="DNI:" valor={dni} ancho="min-w-[10rem] flex-[2]" />
        </div>
        <Linea etiqueta="Programa de actividades: mes" valor={programa.periodo} />
      </div>

      <Renglones texto={programa.objetivos} minimo={4} />

      {SEMANAS.map((campo, i) => (
        <section key={campo} className="break-inside-avoid">
          <h4 className="text-xs font-bold uppercase text-ink print:text-black">Semana {i + 1}</h4>
          <Renglones texto={programa[campo]} />
        </section>
      ))}

      <section className="break-inside-avoid">
        <h4 className="text-xs font-bold uppercase text-ink print:text-black">Observaciones:</h4>
        <Renglones texto={programa.observaciones} minimo={2} />
      </section>

      <footer className="flex flex-wrap items-end justify-between gap-3 pt-2">
        <div className="print:hidden">{acciones}</div>
        <div className="ml-auto min-w-[14rem] border-t border-ink-soft/60 pt-1 text-center text-xs text-ink print:border-neutral-500 print:text-black">
          <p className="font-semibold">{profesional ?? "Licenciado/a en Kinesiología"}</p>
          <p>Licenciado/a en Kinesiología{programa.matricula ? ` · Matrícula N° ${programa.matricula}` : ""}</p>
        </div>
      </footer>
    </article>
  );
}
