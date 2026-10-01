"use client";

import { useActionState, useState } from "react";
import { eliminarFichaNutricion, guardarFichaNutricion } from "@/app/sucursales/[id]/nutricion/actions";
import { OPCIONES_NUTRICION, type FichaNutricion } from "@/lib/nutricion";

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";
const TITULO = "mt-2 border-b border-edge pb-1 text-xs font-bold uppercase tracking-wide text-brass sm:col-span-2";

function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split("-");
  return `${d}/${m}/${a}`;
}

function hoy(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Mendoza" }).format(new Date());
}

// Grupo de casillas como en el papel: varias (checkbox) o una sola (radio).
function Casillas({
  nombre,
  etiqueta,
  opciones,
  marcadas,
  unica = false,
}: {
  nombre: string;
  etiqueta: string;
  opciones: readonly string[];
  marcadas: string[];
  unica?: boolean;
}) {
  return (
    <fieldset className="sm:col-span-2">
      <legend className={ETIQUETA}>{etiqueta}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {opciones.map((o) => (
          <label key={o} className="flex items-center gap-1.5 text-sm text-ink">
            <input
              type={unica ? "radio" : "checkbox"}
              name={nombre}
              value={o}
              defaultChecked={marcadas.includes(o)}
              className="h-4 w-4 accent-[var(--color-brass)]"
            />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SiNo({ nombre, etiqueta, valor }: { nombre: string; etiqueta: string; valor: boolean | null }) {
  return (
    <fieldset>
      <legend className={ETIQUETA}>{etiqueta}</legend>
      <div className="flex gap-4">
        {(
          [
            ["si", "Sí", valor === true],
            ["no", "No", valor === false],
          ] as const
        ).map(([v, t, marcado]) => (
          <label key={v} className="flex items-center gap-1.5 text-sm text-ink">
            <input type="radio" name={nombre} value={v} defaultChecked={marcado} className="h-4 w-4 accent-[var(--color-brass)]" />
            {t}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FormularioFicha({
  sucursalId,
  residenteId,
  base,
  corrigiendo,
  onCerrar,
}: {
  sucursalId: string;
  residenteId: string;
  base: FichaNutricion | null;
  corrigiendo: boolean;
  onCerrar: () => void;
}) {
  const [estado, formAction, enviando] = useActionState(guardarFichaNutricion.bind(null, sucursalId), {
    error: null,
  });
  const [peso, setPeso] = useState(base?.peso_actual?.toString() ?? "");
  const [talla, setTalla] = useState(base?.talla?.toString() ?? "");
  const [perdida, setPerdida] = useState(base?.perdida_peso ?? null);

  const p = Number(peso.replace(",", "."));
  let t = Number(talla.replace(",", "."));
  if (t > 3) t = t / 100;
  const imc = p > 0 && t > 0 ? Math.round((p / (t * t)) * 10) / 10 : null;

  if (estado.guardado) {
    return <p className="rounded-lg border border-edge bg-panel-deep p-3 text-sm text-brass">Ficha guardada.</p>;
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 rounded-xl border border-edge bg-panel-deep/40 p-4 sm:grid-cols-2">
      <input type="hidden" name="residente_id" value={residenteId} />
      {corrigiendo && base && <input type="hidden" name="ficha_id" value={base.id} />}

      <div>
        <label className={ETIQUETA}>Fecha</label>
        <input type="date" name="fecha" required defaultValue={corrigiendo && base ? base.fecha : hoy()} className={CAMPO} />
      </div>
      <div className="hidden sm:block" />
      <div className="sm:col-span-2">
        <label className={ETIQUETA}>Diagnóstico principal</label>
        <textarea name="diagnostico_principal" rows={2} defaultValue={base?.diagnostico_principal ?? ""} className={CAMPO} />
      </div>
      <div className="sm:col-span-2">
        <label className={ETIQUETA}>Patologías asociadas</label>
        <textarea name="patologias_asociadas" rows={2} defaultValue={base?.patologias_asociadas ?? ""} className={CAMPO} />
      </div>

      <p className={TITULO}>Alimentación</p>
      <Casillas nombre="consistencia" etiqueta="Consistencia" opciones={OPCIONES_NUTRICION.consistencia} marcadas={base?.consistencia ?? []} />
      <Casillas
        nombre="segun_patologia"
        etiqueta="Según patología"
        opciones={OPCIONES_NUTRICION.segun_patologia}
        marcadas={base?.segun_patologia ?? []}
      />
      <div className="sm:col-span-2">
        <label className={ETIQUETA}>Otra (cuál)</label>
        <input name="patologia_otra" defaultValue={base?.patologia_otra ?? ""} className={CAMPO} />
      </div>
      <Casillas
        nombre="via_administracion"
        etiqueta="Vía de administración"
        opciones={OPCIONES_NUTRICION.via_administracion}
        marcadas={base?.via_administracion ?? []}
      />
      <Casillas
        nombre="asistencia"
        etiqueta="Asistencia para alimentarse"
        opciones={OPCIONES_NUTRICION.asistencia}
        marcadas={base?.asistencia ? [base.asistencia] : []}
        unica
      />
      <Casillas
        nombre="ingesta"
        etiqueta="Ingesta alimentaria"
        opciones={OPCIONES_NUTRICION.ingesta}
        marcadas={base?.ingesta ? [base.ingesta] : []}
        unica
      />
      <SiNo nombre="protesis_dental" etiqueta="Prótesis dental" valor={base?.protesis_dental ?? null} />
      <Casillas
        nombre="disfagia"
        etiqueta="Disfagia"
        opciones={OPCIONES_NUTRICION.disfagia}
        marcadas={base?.disfagia ? [base.disfagia] : []}
        unica
      />
      <Casillas
        nombre="suplementacion"
        etiqueta="Suplementación"
        opciones={OPCIONES_NUTRICION.suplementacion}
        marcadas={base?.suplementacion ?? []}
      />
      <div className="sm:col-span-2">
        <label className={ETIQUETA}>Cantidad / frecuencia</label>
        <input name="suplementacion_cantidad" defaultValue={base?.suplementacion_cantidad ?? ""} className={CAMPO} />
      </div>

      <p className={TITULO}>Datos antropométricos</p>
      <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:grid-cols-4">
        <div>
          <label className={ETIQUETA}>Peso actual (kg)</label>
          <input name="peso_actual" inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} className={CAMPO} />
        </div>
        <div>
          <label className={ETIQUETA}>Peso ideal (kg)</label>
          <input name="peso_ideal" inputMode="decimal" defaultValue={base?.peso_ideal ?? ""} className={CAMPO} />
        </div>
        <div>
          <label className={ETIQUETA}>Talla (m)</label>
          <input name="talla" inputMode="decimal" placeholder="1,60" value={talla} onChange={(e) => setTalla(e.target.value)} className={CAMPO} />
        </div>
        <div>
          <label className={ETIQUETA}>IMC (se calcula solo)</label>
          <input name="imc" readOnly value={imc ?? ""} className={`${CAMPO} opacity-80`} />
        </div>
      </div>
      <fieldset>
        <legend className={ETIQUETA}>Pérdida de peso</legend>
        <div className="flex items-center gap-4">
          {(
            [
              ["no", "No", false],
              ["si", "Sí", true],
            ] as const
          ).map(([v, t2, b]) => (
            <label key={v} className="flex items-center gap-1.5 text-sm text-ink">
              <input
                type="radio"
                name="perdida_peso"
                value={v}
                checked={perdida === b}
                onChange={() => setPerdida(b)}
                className="h-4 w-4 accent-[var(--color-brass)]"
              />
              {t2}
            </label>
          ))}
          {perdida && (
            <input
              name="perdida_peso_pct"
              inputMode="decimal"
              placeholder="% pérdida"
              defaultValue={base?.perdida_peso_pct ?? ""}
              className={`${CAMPO} w-28`}
            />
          )}
        </div>
      </fieldset>

      <p className={TITULO}>Evaluación nutricional</p>
      <Casillas
        nombre="evaluacion_nutricional"
        etiqueta="Estado"
        opciones={OPCIONES_NUTRICION.evaluacion_nutricional}
        marcadas={base?.evaluacion_nutricional ? [base.evaluacion_nutricional] : []}
        unica
      />

      <p className={TITULO}>Evaluación funcional</p>
      <Casillas
        nombre="evaluacion_funcional"
        etiqueta="Marcar lo que corresponda"
        opciones={OPCIONES_NUTRICION.evaluacion_funcional}
        marcadas={base?.evaluacion_funcional ?? []}
      />

      <p className={TITULO}>Observaciones y plan nutricional</p>
      <div className="sm:col-span-2">
        <textarea name="observaciones" rows={4} defaultValue={base?.observaciones ?? ""} className={CAMPO} />
      </div>

      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : corrigiendo ? "Guardar corrección" : "Guardar ficha"}
        </button>
        <button type="button" onClick={onCerrar} className="text-sm text-ink-soft hover:text-ink">
          Cancelar
        </button>
        {estado.error && <p className="text-sm text-red-700">{estado.error}</p>}
      </div>
    </form>
  );
}

// Tarjeta de un residente en Nutrición: resumen de la última ficha, historial y formulario.
export function FichaNutricionResidente({
  sucursalId,
  residenteId,
  residenteNombre,
  fichas,
  puedeEditar,
}: {
  sucursalId: string;
  residenteId: string;
  residenteNombre: string;
  fichas: FichaNutricion[];
  puedeEditar: boolean;
}) {
  const [modo, setModo] = useState<"cerrado" | "nueva" | "corregir">("cerrado");
  const [abiertoEn, setAbiertoEn] = useState(0);
  const ultima = fichas[0] ?? null;
  const imprimir = `/sucursales/${sucursalId}/nutricion/imprimir?residente=${residenteId}`;

  function abrir(m: "nueva" | "corregir") {
    setAbiertoEn((n) => n + 1);
    setModo(m);
  }

  return (
    <section className="space-y-3 rounded-2xl border border-edge bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">{residenteNombre}</h2>
          {ultima ? (
            <p className="text-xs text-ink-soft">
              Última ficha: {fechaCorta(ultima.fecha)}
              {ultima.evaluacion_nutricional && ` · ${ultima.evaluacion_nutricional}`}
              {ultima.consistencia.length > 0 && ` · ${ultima.consistencia.join(", ")}`}
              {ultima.imc !== null && ` · IMC ${ultima.imc}`}
            </p>
          ) : (
            <p className="text-xs text-amber-700">Sin ficha nutricional cargada.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={imprimir}
            className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
          >
            Imprimir ficha
          </a>
          {puedeEditar && ultima && (
            <button
              type="button"
              onClick={() => abrir("corregir")}
              className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
            >
              Corregir última
            </button>
          )}
          {puedeEditar && (
            <button
              type="button"
              onClick={() => abrir("nueva")}
              className="rounded-lg bg-brass px-3 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90"
            >
              {ultima ? "+ Nueva ficha (actualizar)" : "+ Cargar ficha"}
            </button>
          )}
        </div>
      </div>

      {modo !== "cerrado" && (
        <FormularioFicha
          key={abiertoEn}
          sucursalId={sucursalId}
          residenteId={residenteId}
          base={ultima}
          corrigiendo={modo === "corregir"}
          onCerrar={() => setModo("cerrado")}
        />
      )}

      {fichas.length > 1 && (
        <details className="text-xs text-ink-soft">
          <summary className="cursor-pointer hover:text-ink">Fichas anteriores ({fichas.length - 1})</summary>
          <ul className="mt-2 space-y-1">
            {fichas.slice(1).map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3">
                <span>
                  {fechaCorta(f.fecha)}
                  {f.evaluacion_nutricional && ` · ${f.evaluacion_nutricional}`}
                  {f.peso_actual !== null && ` · ${f.peso_actual} kg`}
                </span>
                <a href={`${imprimir}&ficha=${f.id}`} className="text-brass hover:text-ink">
                  Imprimir
                </a>
                {puedeEditar && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm("¿Eliminar esta ficha anterior?")) return;
                      await eliminarFichaNutricion(sucursalId, f.id);
                    }}
                    className="text-red-700 hover:text-red-500"
                  >
                    Eliminar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
