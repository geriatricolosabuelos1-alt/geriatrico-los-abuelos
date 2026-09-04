"use client";

import { useActionState } from "react";
import {
  actualizarLegajo,
  type ActualizarLegajoEstado,
} from "@/app/residentes/[id]/legajo/actions";
import type { FichaAdministrativa, FichaMedica, Residente } from "@/lib/types";

type Props = {
  residente: Residente;
  fichaAdministrativa: FichaAdministrativa | null;
  fichaMedica: FichaMedica | null;
};

const ESTADO_INICIAL: ActualizarLegajoEstado = { error: null };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft";
const SECCION = "mb-2 font-display text-sm font-semibold text-ink";

function Campo({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={ETIQUETA}>{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={CAMPO}
      />
    </div>
  );
}

export function LegajoForm({ residente, fichaAdministrativa, fichaMedica }: Props) {
  const accionConIds = actualizarLegajo.bind(null, residente.id, residente.sucursal_id);
  const [estado, formAction, enviando] = useActionState(accionConIds, ESTADO_INICIAL);

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-2xl border border-edge bg-card p-5">
        <h2 className={SECCION}>Datos personales</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nombre" name="nombre" defaultValue={residente.nombre} />
          <Campo label="Apellido" name="apellido" defaultValue={residente.apellido} />
          <Campo
            label="Fecha de nacimiento"
            name="fecha_nacimiento"
            type="date"
            defaultValue={residente.fecha_nacimiento}
          />
          <Campo label="DNI" name="dni" defaultValue={residente.dni} />
          <Campo label="Nacionalidad" name="nacionalidad" defaultValue={residente.nacionalidad} />
        </div>
      </section>

      <section className="rounded-2xl border border-edge bg-card p-5">
        <h2 className={SECCION}>Cobertura</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo
            label="Obra social / prepaga"
            name="obra_social"
            defaultValue={fichaAdministrativa?.obra_social}
            placeholder="PAMI, OSEP, particular..."
          />
          <Campo
            label="Tipo de cobertura"
            name="tipo_cobertura"
            defaultValue={fichaAdministrativa?.tipo_cobertura}
            placeholder="Subsidio, particular..."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-edge bg-card p-5">
        <h2 className={SECCION}>Estadía</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo
            label="Fecha de ingreso"
            name="fecha_ingreso"
            type="date"
            defaultValue={residente.fecha_ingreso}
          />
          <Campo label="Habitación" name="habitacion" defaultValue={residente.habitacion} />
        </div>
      </section>

      <section className="rounded-2xl border border-edge bg-card p-5">
        <h2 className={SECCION}>Ficha médica</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo
            label="Médico de cabecera"
            name="medico_cabecera"
            defaultValue={fichaMedica?.medico_cabecera}
          />
          <Campo
            label="Grupo sanguíneo"
            name="grupo_sanguineo"
            defaultValue={fichaMedica?.grupo_sanguineo}
            placeholder="O+, A-, etc."
          />
          <div className="sm:col-span-2">
            <label className={ETIQUETA}>Diagnósticos principales</label>
            <textarea
              name="diagnosticos"
              defaultValue={fichaMedica?.diagnosticos ?? ""}
              rows={2}
              className={CAMPO}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={ETIQUETA}>Alergias</label>
            <textarea
              name="alergias"
              defaultValue={fichaMedica?.alergias ?? ""}
              rows={2}
              className={CAMPO}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-edge bg-card p-5">
        <h2 className={SECCION}>Contacto de emergencia</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo
            label="Familiar o referente afectivo"
            name="contacto_familiar"
            defaultValue={residente.contacto_familiar}
          />
          <Campo
            label="Teléfono"
            name="telefono_familiar"
            type="tel"
            defaultValue={residente.telefono_familiar}
          />
        </div>
      </section>

      {estado.error && <p className="text-sm text-red-400">{estado.error}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        {enviando ? "Guardando..." : "Guardar legajo"}
      </button>
    </form>
  );
}
