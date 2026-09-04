"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { actualizarResidente, eliminarResidente } from "@/app/sucursales/[id]/residentes/actions";

type FilaResidente = {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  fecha_ingreso: string | null;
  fecha_egreso: string | null;
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

type Columna = "nombre" | "ingreso" | "egreso";
type Direccion = "asc" | "desc";

const CAMPO =
  "w-full rounded-md border border-edge bg-card px-2 py-1 text-xs text-ink focus:border-brass focus:outline-none";

function formatearFecha(fecha: string | null): string {
  return fecha ? new Date(fecha + "T00:00:00").toLocaleDateString("es-AR") : "—";
}

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
          <div>
            <label className="mb-0.5 block text-[0.6rem] text-ink-soft">Nacimiento</label>
            <input
              type="date"
              name="fecha_nacimiento"
              defaultValue={residente.fecha_nacimiento ?? ""}
              className={CAMPO}
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[0.6rem] text-ink-soft">Ingreso</label>
            <input
              type="date"
              name="fecha_ingreso"
              defaultValue={residente.fecha_ingreso ?? ""}
              className={CAMPO}
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[0.6rem] text-ink-soft">Egreso</label>
            <input
              type="date"
              name="fecha_egreso"
              defaultValue={residente.fecha_egreso ?? ""}
              className={CAMPO}
            />
          </div>
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

function EncabezadoOrdenable({
  label,
  columna,
  ordenActual,
  onOrdenar,
}: {
  label: string;
  columna: Columna;
  ordenActual: { columna: Columna; direccion: Direccion };
  onOrdenar: (columna: Columna) => void;
}) {
  const activo = ordenActual.columna === columna;
  return (
    <th className="px-4 py-3">
      <button
        onClick={() => onOrdenar(columna)}
        className={`flex items-center gap-1 uppercase tracking-wide ${activo ? "text-brass" : "text-ink-soft hover:text-ink"}`}
      >
        {label}
        {activo && <span>{ordenActual.direccion === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}

export function ResidentesTable({ sucursalId, residentes, puedeEditar, puedeBorrar }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "activo" | "inactivo">("todos");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [orden, setOrden] = useState<{ columna: Columna; direccion: Direccion }>({
    columna: "nombre",
    direccion: "asc",
  });

  function manejarOrdenar(columna: Columna) {
    setOrden((prev) =>
      prev.columna === columna
        ? { columna, direccion: prev.direccion === "asc" ? "desc" : "asc" }
        : { columna, direccion: "asc" },
    );
  }

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    let lista = residentes.filter((r) => {
      const coincideTexto =
        !texto ||
        r.nombre.toLowerCase().includes(texto) ||
        r.apellido.toLowerCase().includes(texto);
      const coincideEstado =
        estadoFiltro === "todos" ||
        (estadoFiltro === "activo" && r.activo) ||
        (estadoFiltro === "inactivo" && !r.activo);
      return coincideTexto && coincideEstado;
    });

    lista = [...lista].sort((a, b) => {
      let comparacion = 0;
      if (orden.columna === "nombre") {
        comparacion = `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es");
      } else if (orden.columna === "ingreso") {
        comparacion = (a.fecha_ingreso ?? "").localeCompare(b.fecha_ingreso ?? "");
      } else if (orden.columna === "egreso") {
        comparacion = (a.fecha_egreso ?? "").localeCompare(b.fecha_egreso ?? "");
      }
      return orden.direccion === "asc" ? comparacion : -comparacion;
    });

    return lista;
  }, [residentes, busqueda, estadoFiltro, orden]);

  async function manejarBorrar(id: string, nombre: string) {
    if (!window.confirm(`¿Eliminar a ${nombre}?`)) return;
    await eliminarResidente(sucursalId, id);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o apellido..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-64 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
        />
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value as typeof estadoFiltro)}
          className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
            <tr>
              <EncabezadoOrdenable
                label="Nombre"
                columna="nombre"
                ordenActual={orden}
                onOrdenar={manejarOrdenar}
              />
              <EncabezadoOrdenable
                label="Ingreso"
                columna="ingreso"
                ordenActual={orden}
                onOrdenar={manejarOrdenar}
              />
              <EncabezadoOrdenable
                label="Egreso"
                columna="egreso"
                ordenActual={orden}
                onOrdenar={manejarOrdenar}
              />
              <th className="px-4 py-3">Obra social</th>
              <th className="px-4 py-3">Estado</th>
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
                  <td className="px-4 py-3 align-middle font-medium text-ink whitespace-nowrap">
                    {r.apellido}, {r.nombre}
                  </td>
                  <td className="px-4 py-3 align-middle text-ink-soft whitespace-nowrap">
                    {formatearFecha(r.fecha_ingreso)}
                  </td>
                  <td className="px-4 py-3 align-middle text-ink-soft whitespace-nowrap">
                    {formatearFecha(r.fecha_egreso)}
                  </td>
                  <td className="px-4 py-3 align-middle text-ink-soft">
                    {r.ficha_administrativa?.obra_social ?? "—"}
                  </td>
                  <td className="px-4 py-3 align-middle">
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
                  <td className="px-4 py-3 text-right align-middle whitespace-nowrap">
                    <Link
                      href={`/residentes/${r.id}/legajo`}
                      className="mr-3 text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                    >
                      Legajo
                    </Link>
                    <Link
                      href={`/residentes/${r.id}/evolucion`}
                      className="mr-3 text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                    >
                      Evolución
                    </Link>
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
