"use client";

import { useState } from "react";
import {
  actualizarCuenta,
  eliminarCuenta,
  type CuentaUsuario,
} from "@/app/admin/claves/actions";
import { ETIQUETA_ROL, ROLES_DISPONIBLES } from "@/lib/roles";
import type { Sucursal } from "@/lib/types";

type Props = {
  cuentas: CuentaUsuario[];
  sucursales: Sucursal[];
  propioId: string;
};

const CAMPO =
  "w-full rounded-md border border-edge bg-card px-2 py-1 text-xs text-ink focus:border-brass focus:outline-none";

function FilaEdicion({
  cuenta,
  sucursales,
  onCancelar,
  onGuardado,
}: {
  cuenta: CuentaUsuario;
  sucursales: Sucursal[];
  onCancelar: () => void;
  onGuardado: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const resultado = await actualizarCuenta(cuenta.id, formData);

    setEnviando(false);
    if (resultado.error) {
      setError(resultado.error);
    } else {
      onGuardado();
    }
  }

  return (
    <tr className="border-b border-edge bg-panel-deep last:border-0">
      <td colSpan={6} className="p-3">
        <form onSubmit={manejarSubmit} className="grid grid-cols-2 gap-2 sm:grid-cols-7">
          <input
            name="usuario"
            defaultValue={cuenta.usuario ?? ""}
            required
            pattern="[a-zA-Z0-9._-]{3,30}"
            autoCapitalize="none"
            className={CAMPO}
            placeholder="Usuario"
          />
          <input
            name="nombre_completo"
            defaultValue={cuenta.nombre_completo}
            required
            className={CAMPO}
            placeholder="Nombre"
          />
          <select name="rol" defaultValue={cuenta.rol} required className={CAMPO}>
            {ROLES_DISPONIBLES.map((rol) => (
              <option key={rol} value={rol}>
                {ETIQUETA_ROL[rol]}
              </option>
            ))}
          </select>
          <select name="sucursal_id" defaultValue={cuenta.sucursal_id ?? ""} className={CAMPO}>
            <option value="">Todas las sedes</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
          <input
            name="password"
            type="text"
            minLength={6}
            className={CAMPO}
            placeholder="Nueva contraseña (opcional)"
          />
          <label className="flex items-center gap-1.5 text-xs text-ink-soft">
            <input type="checkbox" name="activo" defaultChecked={cuenta.activo} className="h-3.5 w-3.5" />
            Activo
          </label>

          {error && <p className="col-span-full text-xs text-red-700">{error}</p>}

          <div className="col-span-full flex gap-2">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-brass px-3 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
            >
              {enviando ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={onCancelar}
              className="rounded-md border border-edge px-3 py-1.5 text-xs text-ink-soft hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}

export function TablaCuentas({ cuentas, sucursales, propioId }: Props) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const sucursalesPorId = new Map(sucursales.map((s) => [s.id, s.nombre]));

  async function manejarBorrar(id: string, nombre: string) {
    if (!window.confirm(`¿Eliminar la cuenta de ${nombre}? Esto borra el acceso por completo.`)) return;
    const resultado = await eliminarCuenta(id);
    if (resultado.error) {
      window.alert(resultado.error);
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
          <tr>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Usuario</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Sede</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {cuentas.map((c) =>
            editandoId === c.id ? (
              <FilaEdicion
                key={c.id}
                cuenta={c}
                sucursales={sucursales}
                onCancelar={() => setEditandoId(null)}
                onGuardado={() => setEditandoId(null)}
              />
            ) : (
              <tr key={c.id} className="border-b border-edge last:border-0">
                <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                  {c.nombre_completo}
                  {c.id === propioId && (
                    <span className="ml-2 rounded-full bg-brass-soft px-2 py-0.5 text-[0.6rem] font-bold text-brass">
                      Vos
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{c.usuario ?? "— (sin usuario, no puede ingresar)"}</td>
                <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                  {ETIQUETA_ROL[c.rol] ?? c.rol}
                </td>
                <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                  {c.sucursal_id ? (sucursalesPorId.get(c.sucursal_id) ?? "—") : "Todas"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      c.activo ? "bg-green-700/10 text-green-700" : "bg-red-700/10 text-red-700"
                    }`}
                  >
                    {c.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => setEditandoId(c.id)}
                    className="mr-3 text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                  >
                    Editar
                  </button>
                  {c.id !== propioId && (
                    <button
                      onClick={() => manejarBorrar(c.id, c.nombre_completo)}
                      className="text-xs text-red-700 underline decoration-red-600/40 underline-offset-2 hover:text-red-500"
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ),
          )}
          {cuentas.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-ink-soft">
                No hay cuentas cargadas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
