"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { actualizarResidente, eliminarResidente } from "@/app/sucursales/[id]/residentes/actions";

type FilaResidente = {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  contacto_familiar: string | null;
  telefono_familiar: string | null;
  activo: boolean;
  ficha_administrativa: { obra_social: string | null; tipo_cobertura: string | null; cuota_mensual: number | null } | null;
};

type Props = {
  sucursalId: string;
  residentes: FilaResidente[];
  puedeEditar: boolean;
  puedeBorrar: boolean;
};

const CAMPO =
  "w-full rounded-md border border-edge bg-card px-2 py-1 text-xs text-ink focus:border-brass focus:outline-none";

function FilaEdicion({
  sucursalId,
  residente,
  onCancelar,
  onGuardado,
}: {
  sucursalId: string;
  residente: FilaResidente;
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
    const resultado = await actualizarResidente(sucursalId, residente.id, { error: null }, formData);

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
        <form onSubmit={manejarSubmit} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input name="nombre" defaultValue={residente.nombre} required className={CAMPO} placeholder="Nombre" />
          <input
            name="apellido"
            defaultValue={residente.apellido}
            required
            className={CAMPO}
            placeholder="Apellido"
          />
          <input
            type="date"
            name="fecha_nacimiento"
            defaultValue={residente.fecha_nacimiento ?? ""}
            className={CAMPO}
          />
          <input
            name="contacto_familiar"
            defaultValue={residente.contacto_familiar ?? ""}
            className={CAMPO}
            placeholder="Contacto familiar"
          />
          <input
            name="telefono_familiar"
            defaultValue={residente.telefono_familiar ?? ""}
            className={CAMPO}
            placeholder="Teléfono familiar"
          />
          <input
            name="obra_social"
            defaultValue={residente.ficha_administrativa?.obra_social ?? ""}
            className={CAMPO}
            placeholder="Obra social"
          />
          <input
            name="tipo_cobertura"
            defaultValue={residente.ficha_administrativa?.tipo_cobertura ?? ""}
            className={CAMPO}
            placeholder="Tipo de cobertura"
          />
          <input
            type="number"
            step="0.01"
            name="cuota_mensual"
            defaultValue={residente.ficha_administrativa?.cuota_mensual ?? ""}
            className={CAMPO}
            placeholder="Cuota mensual"
          />
          <label className="flex items-center gap-1.5 text-xs text-ink-soft">
            <input type="checkbox" name="activo" defaultChecked={residente.activo} className="h-3.5 w-3.5" />
            Activo
          </label>

          {error && <p className="col-span-full text-xs text-red-400">{error}</p>}

          <div className="col-span-full flex gap-2">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-brass px-3 py-1.5 text-xs font-semibold text-panel-deep hover:bg-brass/90 disabled:opacity-50"
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

export function ResidentesTable({ sucursalId, residentes, puedeEditar, puedeBorrar }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return residentes;
    return residentes.filter(
      (r) =>
        r.nombre.toLowerCase().includes(texto) || r.apellido.toLowerCase().includes(texto),
    );
  }, [residentes, busqueda]);

  async function manejarBorrar(id: string, nombre: string) {
    if (!window.confirm(`¿Eliminar a ${nombre}?`)) return;
    await eliminarResidente(sucursalId, id);
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Buscar por nombre o apellido..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="mb-3 w-64 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
      />

      <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Obra social</th>
              <th className="px-4 py-3">Cuota</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((r) =>
              editandoId === r.id ? (
                <FilaEdicion
                  key={r.id}
                  sucursalId={sucursalId}
                  residente={r}
                  onCancelar={() => setEditandoId(null)}
                  onGuardado={() => setEditandoId(null)}
                />
              ) : (
                <tr key={r.id} className="border-b border-edge last:border-0">
                  <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                    {r.apellido}, {r.nombre}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {r.ficha_administrativa?.obra_social ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                    {r.ficha_administrativa?.cuota_mensual != null
                      ? `$${r.ficha_administrativa.cuota_mensual}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.activo
                          ? "rounded-full bg-brass-soft px-2 py-0.5 text-xs font-medium text-brass"
                          : "rounded-full bg-edge px-2 py-0.5 text-xs font-medium text-ink-soft"
                      }
                    >
                      {r.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/residentes/${r.id}/evolucion`}
                      className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                    >
                      Evolución
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {puedeEditar && (
                      <button
                        onClick={() => setEditandoId(r.id)}
                        className="mr-3 text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                      >
                        Editar
                      </button>
                    )}
                    {puedeBorrar && (
                      <button
                        onClick={() => manejarBorrar(r.id, `${r.nombre} ${r.apellido}`)}
                        className="text-xs text-red-400 underline decoration-red-400/40 underline-offset-2 hover:text-red-300"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ),
            )}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-soft">
                  Ningún residente coincide con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
