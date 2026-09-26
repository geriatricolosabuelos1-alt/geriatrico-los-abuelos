"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { crearCuenta, type CrearCuentaEstado } from "@/app/admin/claves/actions";
import { ETIQUETA_ROL, ROLES_DISPONIBLES } from "@/lib/roles";
import type { Sucursal } from "@/lib/types";

type Props = {
  sucursales: Sucursal[];
};

const ESTADO_INICIAL: CrearCuentaEstado = { error: null };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft";

export function NuevaCuentaForm({ sucursales }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [estado, formAction, enviando] = useActionState(crearCuenta, ESTADO_INICIAL);
  const enviandoAnterior = useRef(enviando);

  useEffect(() => {
    if (enviandoAnterior.current && !enviando && !estado.error) {
      setAbierto(false);
    }
    enviandoAnterior.current = enviando;
  }, [enviando, estado.error]);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg border border-edge px-3 py-2 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
      >
        + Nueva cuenta
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-edge bg-card p-5 sm:grid-cols-2"
    >
      <div className="col-span-full flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-ink">Nueva cuenta</h2>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-sm text-ink-soft hover:text-ink"
        >
          ✕
        </button>
      </div>

      <div>
        <label className={ETIQUETA}>Nombre completo</label>
        <input type="text" name="nombre_completo" required className={CAMPO} />
      </div>

      <div>
        <label className={ETIQUETA}>Usuario (para ingresar)</label>
        <input
          type="text"
          name="usuario"
          required
          placeholder="Ej: gcaballero"
          pattern="[a-zA-Z0-9._-]{3,30}"
          autoCapitalize="none"
          className={CAMPO}
        />
      </div>

      <div>
        <label className={ETIQUETA}>Contraseña</label>
        <input type="text" name="password" required minLength={6} className={CAMPO} />
      </div>

      <div>
        <label className={ETIQUETA}>Rol</label>
        <select name="rol" required defaultValue="" className={CAMPO}>
          <option value="" disabled>
            Seleccionar...
          </option>
          {ROLES_DISPONIBLES.map((rol) => (
            <option key={rol} value={rol}>
              {ETIQUETA_ROL[rol]}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className={ETIQUETA}>Sede</label>
        <select name="sucursal_id" defaultValue="" className={CAMPO}>
          <option value="">No aplica (ve todas las sedes)</option>
          {sucursales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>

      {estado.error && <p className="col-span-full text-sm text-red-700">{estado.error}</p>}

      <div className="col-span-full">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Creando..." : "Crear cuenta"}
        </button>
      </div>
    </form>
  );
}
