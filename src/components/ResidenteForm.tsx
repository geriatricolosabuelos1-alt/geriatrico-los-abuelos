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
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft";

export function ResidenteForm({ sucursalId }: Props) {
  const accionConSucursal = crearResidente.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConSucursal, ESTADO_INICIAL);
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-edge bg-card p-5 sm:grid-cols-2"
    >
      <h2 className="col-span-full font-display text-sm font-semibold text-ink">
        Nuevo residente
      </h2>

      <div>
        <label className={ETIQUETA}>Nombre</label>
        <input type="text" name="nombre" required className={CAMPO} />
      </div>

      <div>
        <label className={ETIQUETA}>Apellido</label>
        <input type="text" name="apellido" required className={CAMPO} />
      </div>

      <div>
        <label className={ETIQUETA}>Fecha de nacimiento</label>
        <input type="date" name="fecha_nacimiento" className={CAMPO} />
      </div>

      <div>
        <label className={ETIQUETA}>Fecha de ingreso</label>
        <input type="date" name="fecha_ingreso" defaultValue={hoy} className={CAMPO} />
      </div>

      <div>
        <label className={ETIQUETA}>Fecha de egreso</label>
        <input type="date" name="fecha_egreso" className={CAMPO} />
      </div>

      <div>
        <label className={ETIQUETA}>Contacto familiar</label>
        <input
          type="text"
          name="contacto_familiar"
          placeholder="Nombre del familiar"
          className={CAMPO}
        />
      </div>

      <div>
        <label className={ETIQUETA}>Teléfono familiar</label>
        <input type="tel" name="telefono_familiar" className={CAMPO} />
      </div>

      <div>
        <label className={ETIQUETA}>Obra social</label>
        <input
          type="text"
          name="obra_social"
          placeholder="PAMI, OSEP, particular..."
          className={CAMPO}
        />
      </div>

      <div>
        <label className={ETIQUETA}>Tipo de cobertura</label>
        <input
          type="text"
          name="tipo_cobertura"
          placeholder="Subsidio, particular..."
          className={CAMPO}
        />
      </div>

      <div>
        <label className={ETIQUETA}>Cuota mensual</label>
        <input type="number" step="0.01" name="cuota_mensual" className={CAMPO} />
      </div>

      {estado.error && (
        <p className="col-span-full text-sm text-red-400">{estado.error}</p>
      )}

      <div className="col-span-full">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Guardar residente"}
        </button>
      </div>
    </form>
  );
}
