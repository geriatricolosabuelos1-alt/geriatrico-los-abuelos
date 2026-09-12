"use client";

import { useActionState } from "react";
import {
  crearResidente,
  type CrearResidenteEstado,
} from "@/app/sucursales/[id]/residentes/actions";

type Props = {
  sucursalId: string;
};

const ESTADO_INICIAL: CrearResidenteEstado = { error: null };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-4 py-3 text-base text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1.5 block text-sm font-bold uppercase tracking-wide text-ink-soft";
const SECCION = "mb-4 font-display text-lg font-semibold text-ink";

function Campo({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className={ETIQUETA}>{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className={CAMPO}
      />
    </div>
  );
}

export function NuevoResidenteForm({ sucursalId }: Props) {
  const accionConSucursal = crearResidente.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConSucursal, ESTADO_INICIAL);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-2xl border border-edge bg-card p-6">
          <h2 className={SECCION}>Datos personales</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Nombre" name="nombre" required />
            <Campo label="Apellido" name="apellido" required />
            <Campo label="Fecha de nacimiento" name="fecha_nacimiento" type="date" />
            <Campo label="DNI" name="dni" />
            <Campo label="Nacionalidad" name="nacionalidad" />
          </div>
        </section>

        <section className="rounded-2xl border border-edge bg-card p-6">
          <h2 className={SECCION}>Cobertura</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo
              label="Obra social / prepaga"
              name="obra_social"
              placeholder="PAMI, OSEP, particular..."
            />
            <Campo
              label="Número de afiliado"
              name="numero_afiliado"
              placeholder="150164400808/00"
            />
            <Campo
              label="Tipo de cobertura"
              name="tipo_cobertura"
              placeholder="Subsidio, particular..."
            />
            <Campo
              label="Cuota mensual (canon)"
              name="cuota_mensual"
              type="number"
              placeholder="0"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-edge bg-card p-6">
          <h2 className={SECCION}>Contratante (firma el contrato)</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Nombre y apellido" name="contratante_nombre" />
            <Campo label="DNI" name="contratante_dni" />
            <Campo label="Domicilio" name="contratante_domicilio" />
          </div>
        </section>

        <section className="rounded-2xl border border-edge bg-card p-6">
          <h2 className={SECCION}>Estadía</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Fecha de ingreso" name="fecha_ingreso" type="date" />
            <Campo label="Habitación" name="habitacion" />
          </div>
        </section>

        <section className="rounded-2xl border border-edge bg-card p-6">
          <h2 className={SECCION}>Contacto de emergencia</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Familiar o referente afectivo" name="contacto_familiar" />
            <Campo label="Teléfono" name="telefono_familiar" type="tel" />
          </div>
        </section>

        <section className="rounded-2xl border border-edge bg-card p-6 lg:col-span-2">
          <h2 className={SECCION}>Ficha médica</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Médico de cabecera" name="medico_cabecera" />
            <Campo label="Grupo sanguíneo" name="grupo_sanguineo" placeholder="O+, A-, etc." />
            <div>
              <label className={ETIQUETA}>Diagnósticos principales</label>
              <textarea name="diagnosticos" rows={3} className={CAMPO} />
            </div>
            <div>
              <label className={ETIQUETA}>Alergias</label>
              <textarea name="alergias" rows={3} className={CAMPO} />
            </div>
          </div>
        </section>
      </div>

      {estado.error && <p className="text-base text-red-700">{estado.error}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brass px-6 py-3 text-base font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        {enviando ? "Guardando..." : "Guardar residente"}
      </button>
    </form>
  );
}
