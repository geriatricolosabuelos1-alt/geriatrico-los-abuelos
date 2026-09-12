"use client";

import { useActionState, useState } from "react";
import {
  guardarFichaNutricional,
  registrarMedicion,
  registrarMna,
  resolverAlertaNutricion,
} from "@/app/sucursales/[id]/nutricion/actions";
import type {
  AlertaNutricion,
  EvaluacionMna,
  FichaNutricional,
  MedicionAntropometrica,
} from "@/lib/types";

type Estado = { error: string | null };
const INICIAL: Estado = { error: null };

type Props = {
  sucursalId: string;
  residenteId: string;
  residenteNombre: string;
  ficha: FichaNutricional | null;
  mediciones: MedicionAntropometrica[];
  evaluaciones: EvaluacionMna[];
  alertas: AlertaNutricion[];
};

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";

const ETIQUETA_ALERTA: Record<AlertaNutricion["tipo"], string> = {
  perdida_aguda: "Pérdida de peso aguda",
  perdida_progresiva: "Pérdida de peso progresiva",
  baja_ingesta: "Baja ingesta sostenida",
  riesgo_escaras: "Riesgo por escaras",
  mna_bajo: "MNA bajo",
};

function calcularImc(pesoKg: number | null, tallaCm: number | null): number | null {
  if (!pesoKg || !tallaCm) return null;
  const tallaM = tallaCm / 100;
  return Math.round((pesoKg / (tallaM * tallaM)) * 10) / 10;
}

function clasificarMna(puntaje: number): { texto: string; color: string } {
  if (puntaje >= 12) return { texto: "Normal", color: "text-emerald-700" };
  if (puntaje >= 8) return { texto: "Riesgo de malnutrición", color: "text-amber-700" };
  return { texto: "Malnutrición declarada", color: "text-red-700" };
}

function FormularioFicha({
  sucursalId,
  residenteId,
  ficha,
  onCerrar,
}: {
  sucursalId: string;
  residenteId: string;
  ficha: FichaNutricional | null;
  onCerrar: () => void;
}) {
  const accion = guardarFichaNutricional.bind(null, sucursalId, residenteId);
  const [estado, formAction, enviando] = useActionState(accion, INICIAL);

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        onCerrar();
      }}
      className="mt-2 grid grid-cols-2 gap-3 rounded-lg border border-edge bg-panel-deep p-3 sm:grid-cols-4"
    >
      <div>
        <label className={ETIQUETA_MIN}>Peso habitual (kg)</label>
        <input
          type="number"
          step="0.1"
          name="peso_habitual"
          defaultValue={ficha?.peso_habitual ?? ""}
          className="w-full rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Peso actual (kg)</label>
        <input
          type="number"
          step="0.1"
          name="peso_actual"
          defaultValue={ficha?.peso_actual ?? ""}
          className="w-full rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Método de pesaje</label>
        <select
          name="metodo_pesaje"
          defaultValue={ficha?.metodo_pesaje ?? ""}
          className="w-full rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        >
          <option value="">—</option>
          <option value="pie">Balanza de pie</option>
          <option value="silla">Silla pesa-personas</option>
          <option value="grua">Grúa con báscula</option>
          <option value="estimacion">Estimación (postrado)</option>
        </select>
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Talla (cm)</label>
        <input
          type="number"
          step="0.1"
          name="talla_cm"
          defaultValue={ficha?.talla_cm ?? ""}
          className="w-full rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-2 pt-5">
        <input
          type="checkbox"
          id={`talla_estimada-${residenteId}`}
          name="talla_estimada"
          defaultChecked={ficha?.talla_estimada ?? false}
        />
        <label htmlFor={`talla_estimada-${residenteId}`} className="text-xs text-ink-soft">
          Talla estimada (Chumlea)
        </label>
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Circunf. pantorrilla (cm)</label>
        <input
          type="number"
          step="0.1"
          name="circunferencia_pantorrilla"
          defaultValue={ficha?.circunferencia_pantorrilla ?? ""}
          className="w-full rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Circunf. braquial (cm)</label>
        <input
          type="number"
          step="0.1"
          name="circunferencia_braquial"
          defaultValue={ficha?.circunferencia_braquial ?? ""}
          className="w-full rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Dinamometría (kg)</label>
        <input
          type="number"
          step="0.1"
          name="dinamometria_kg"
          defaultValue={ficha?.dinamometria_kg ?? ""}
          className="w-full rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div className="col-span-2 flex items-end gap-2 sm:col-span-4">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Guardar ficha"}
        </button>
        <button type="button" onClick={onCerrar} className="text-xs text-ink-soft hover:text-ink">
          Cancelar
        </button>
        {estado.error && <span className="text-xs text-red-700">{estado.error}</span>}
      </div>
    </form>
  );
}

function FormularioMedicion({
  sucursalId,
  residenteId,
  onCerrar,
}: {
  sucursalId: string;
  residenteId: string;
  onCerrar: () => void;
}) {
  const accion = registrarMedicion.bind(null, sucursalId, residenteId);
  const [estado, formAction, enviando] = useActionState(accion, INICIAL);

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        onCerrar();
      }}
      className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-edge bg-panel-deep p-3"
    >
      <div>
        <label className={ETIQUETA_MIN}>Peso (kg)</label>
        <input
          type="number"
          step="0.1"
          name="peso"
          className="w-24 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>CP (cm)</label>
        <input
          type="number"
          step="0.1"
          name="circunferencia_pantorrilla"
          className="w-20 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>CB (cm)</label>
        <input
          type="number"
          step="0.1"
          name="circunferencia_braquial"
          className="w-20 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brass px-3 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        {enviando ? "Guardando..." : "Registrar medición"}
      </button>
      <button type="button" onClick={onCerrar} className="text-xs text-ink-soft hover:text-ink">
        Cancelar
      </button>
      {estado.error && <p className="w-full text-xs text-red-700">{estado.error}</p>}
    </form>
  );
}

const CAMPOS_MNA: { name: string; label: string; opciones: [string, string][] }[] = [
  {
    name: "movilidad",
    label: "Movilidad",
    opciones: [
      ["0", "Confinado a cama o silla"],
      ["1", "Capaz de levantarse, no sale"],
      ["2", "Sale del domicilio"],
    ],
  },
  {
    name: "estres_agudo",
    label: "Estrés psicológico o enfermedad aguda (últimos 3 meses)",
    opciones: [
      ["0", "Sí"],
      ["2", "No"],
    ],
  },
  {
    name: "problemas_neuropsicologicos",
    label: "Problemas neuropsicológicos",
    opciones: [
      ["0", "Demencia o depresión grave"],
      ["1", "Demencia leve"],
      ["2", "Sin problemas"],
    ],
  },
  {
    name: "imc_o_cp",
    label: "IMC (o CP si no se puede calcular)",
    opciones: [
      ["0", "IMC < 19 (o CP < 31cm)"],
      ["1", "IMC 19-21"],
      ["2", "IMC 21-23"],
      ["3", "IMC ≥ 23 (o CP ≥ 31cm)"],
    ],
  },
  {
    name: "ingesta_reciente",
    label: "Ingesta de alimentos (últimos 3 meses)",
    opciones: [
      ["0", "Disminución grave"],
      ["1", "Disminución moderada"],
      ["2", "Sin disminución"],
    ],
  },
  {
    name: "perdida_peso",
    label: "Pérdida de peso reciente (<3 meses)",
    opciones: [
      ["0", "Pérdida > 3 kg"],
      ["1", "No sabe"],
      ["2", "Pérdida 1-3 kg"],
      ["3", "Sin pérdida"],
    ],
  },
];

function FormularioMna({
  sucursalId,
  residenteId,
  onCerrar,
}: {
  sucursalId: string;
  residenteId: string;
  onCerrar: () => void;
}) {
  const accion = registrarMna.bind(null, sucursalId, residenteId);
  const [estado, formAction, enviando] = useActionState(accion, INICIAL);

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        onCerrar();
      }}
      className="mt-2 space-y-2 rounded-lg border border-edge bg-panel-deep p-3"
    >
      {CAMPOS_MNA.map((campo) => (
        <div key={campo.name} className="grid grid-cols-2 items-center gap-2">
          <label className="text-xs text-ink-soft">{campo.label}</label>
          <select
            name={campo.name}
            required
            defaultValue=""
            className="rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
          >
            <option value="" disabled>
              Elegí...
            </option>
            {campo.opciones.map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Guardar MNA-SF"}
        </button>
        <button type="button" onClick={onCerrar} className="text-xs text-ink-soft hover:text-ink">
          Cancelar
        </button>
        {estado.error && <span className="text-xs text-red-700">{estado.error}</span>}
      </div>
    </form>
  );
}

export function FichaNutricionalResidente({
  sucursalId,
  residenteId,
  residenteNombre,
  ficha,
  mediciones,
  evaluaciones,
  alertas,
}: Props) {
  const [panel, setPanel] = useState<"ninguno" | "ficha" | "medicion" | "mna">("ninguno");
  const imc = calcularImc(ficha?.peso_actual ?? null, ficha?.talla_cm ?? null);
  const ultimaMna = evaluaciones[0];

  function alternar(v: "ficha" | "medicion" | "mna") {
    setPanel(panel === v ? "ninguno" : v);
  }

  async function resolver(alertaId: string) {
    await resolverAlertaNutricion(sucursalId, alertaId);
  }

  return (
    <section className="rounded-2xl border border-edge bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-base font-semibold text-ink">{residenteNombre}</p>
        <div className="flex flex-wrap gap-2">
          {alertas.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => resolver(a.id)}
              title={`${a.detalle ?? ""} — click para resolver`}
              className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${
                a.nivel === "alta"
                  ? "border-red-300 bg-red-100 text-red-800"
                  : "border-amber-300 bg-amber-100 text-amber-800"
              }`}
            >
              {ETIQUETA_ALERTA[a.tipo]}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div>
          <p className={ETIQUETA_MIN}>Peso actual</p>
          <p className="text-sm text-ink">{ficha?.peso_actual ?? "—"} kg</p>
        </div>
        <div>
          <p className={ETIQUETA_MIN}>Talla</p>
          <p className="text-sm text-ink">{ficha?.talla_cm ?? "—"} cm</p>
        </div>
        <div>
          <p className={ETIQUETA_MIN}>IMC</p>
          <p className="text-sm text-ink">
            {imc ?? "—"}
            {imc !== null && (imc < 23 || imc > 28) && (
              <span className="ml-1 text-[0.65rem] text-amber-700">(fuera de 23-28)</span>
            )}
          </p>
        </div>
        <div>
          <p className={ETIQUETA_MIN}>CP</p>
          <p className="text-sm text-ink">
            {ficha?.circunferencia_pantorrilla ?? "—"} cm
            {ficha?.circunferencia_pantorrilla != null && ficha.circunferencia_pantorrilla < 31 && (
              <span className="ml-1 text-[0.65rem] text-red-700">bajo</span>
            )}
          </p>
        </div>
        <div>
          <p className={ETIQUETA_MIN}>Último MNA-SF</p>
          {ultimaMna ? (
            <p className={`text-sm font-semibold ${clasificarMna(ultimaMna.puntaje).color}`}>
              {ultimaMna.puntaje}/14 · {clasificarMna(ultimaMna.puntaje).texto}
            </p>
          ) : (
            <p className="text-sm text-ink-soft">Sin evaluar</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <button type="button" onClick={() => alternar("ficha")} className="text-brass hover:text-ink">
          {ficha ? "Editar ficha" : "Cargar ficha"}
        </button>
        <button type="button" onClick={() => alternar("medicion")} className="text-brass hover:text-ink">
          + Medición
        </button>
        <button type="button" onClick={() => alternar("mna")} className="text-brass hover:text-ink">
          + Evaluación MNA-SF
        </button>
      </div>

      {panel === "ficha" && (
        <FormularioFicha
          sucursalId={sucursalId}
          residenteId={residenteId}
          ficha={ficha}
          onCerrar={() => setPanel("ninguno")}
        />
      )}
      {panel === "medicion" && (
        <FormularioMedicion
          sucursalId={sucursalId}
          residenteId={residenteId}
          onCerrar={() => setPanel("ninguno")}
        />
      )}
      {panel === "mna" && (
        <FormularioMna sucursalId={sucursalId} residenteId={residenteId} onCerrar={() => setPanel("ninguno")} />
      )}

      {mediciones.length > 0 && (
        <div className="mt-3 border-t border-edge pt-2">
          <p className={ETIQUETA_MIN}>Historial de mediciones</p>
          <ul className="text-xs text-ink-soft">
            {mediciones.slice(0, 5).map((m) => (
              <li key={m.id}>
                {new Date(m.fecha + "T00:00:00").toLocaleDateString("es-AR")} —{" "}
                {m.peso != null && `${m.peso}kg `}
                {m.circunferencia_pantorrilla != null && `CP ${m.circunferencia_pantorrilla}cm `}
                {m.circunferencia_braquial != null && `CB ${m.circunferencia_braquial}cm`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
