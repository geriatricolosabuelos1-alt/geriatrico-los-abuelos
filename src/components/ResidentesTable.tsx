"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { eliminarResidente } from "@/app/sucursales/[id]/residentes/actions";
import type { InsumoMedicoConStock } from "@/app/sucursales/[id]/residentes/insumos-actions";
import { AgregarInsumoResidente } from "@/components/AgregarInsumoResidente";

type FilaResidente = {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  fecha_ingreso: string | null;
  fecha_egreso: string | null;
  contacto_familiar: string | null;
  telefono_familiar: string | null;
  foto_url: string | null;
  activo: boolean;
  ficha_administrativa: { obra_social: string | null; tipo_cobertura: string | null; cuota_mensual: number | null } | null;
};

type Props = {
  sucursalId: string;
  residentes: FilaResidente[];
  puedeBorrar: boolean;
  esAdministrativo: boolean;
  puedeCargarInsumos: boolean;
  insumosMedicos: InsumoMedicoConStock[];
};

type Columna = "nombre" | "ingreso" | "egreso";
type Direccion = "asc" | "desc";

function formatearFecha(fecha: string | null): string {
  return fecha ? new Date(fecha + "T00:00:00").toLocaleDateString("es-AR") : "—";
}

function calcularEdad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento + "T00:00:00");
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumplio =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumplio) edad--;
  return edad;
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

export function ResidentesTable({
  sucursalId,
  residentes,
  puedeBorrar,
  esAdministrativo,
  puedeCargarInsumos,
  insumosMedicos,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "activo" | "inactivo">("todos");
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
              <th className="px-4 py-3">Edad</th>
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
              {esAdministrativo && <th className="px-4 py-3">Obra social</th>}
              <th className="px-4 py-3">Contacto de emergencia</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((r) => (
                <tr key={r.id} className="border-b border-edge last:border-0">
                  <td className="px-4 py-3 align-middle font-medium whitespace-nowrap">
                    <Link
                      href={
                        esAdministrativo
                          ? `/residentes/${r.id}/legajo`
                          : `/residentes/${r.id}/evolucion`
                      }
                      className="flex items-center gap-3 text-ink underline decoration-transparent underline-offset-2 hover:decoration-brass"
                    >
                      <span className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-edge bg-panel-deep">
                        {r.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.foto_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs text-ink-soft">
                            {r.nombre.charAt(0)}
                          </span>
                        )}
                      </span>
                      {r.apellido}, {r.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-middle text-ink-soft whitespace-nowrap">
                    {calcularEdad(r.fecha_nacimiento) ?? "—"}
                  </td>
                  <td className="px-4 py-3 align-middle text-ink-soft whitespace-nowrap">
                    {formatearFecha(r.fecha_ingreso)}
                  </td>
                  <td className="px-4 py-3 align-middle text-ink-soft whitespace-nowrap">
                    {formatearFecha(r.fecha_egreso)}
                  </td>
                  {esAdministrativo && (
                    <td className="px-4 py-3 align-middle text-ink-soft">
                      {r.ficha_administrativa?.obra_social ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 align-middle text-ink-soft whitespace-nowrap">
                    {r.contacto_familiar || r.telefono_familiar ? (
                      <>
                        {r.contacto_familiar ?? "—"}
                        {r.telefono_familiar && (
                          <span className="text-ink-soft/70"> · {r.telefono_familiar}</span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
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
                      href={`/residentes/${r.id}/evolucion`}
                      className="mr-3 text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                    >
                      Evolución
                    </Link>
                    {puedeCargarInsumos && (
                      <span className="mr-3">
                        <AgregarInsumoResidente
                          sucursalId={sucursalId}
                          residenteId={r.id}
                          residenteNombre={`${r.apellido}, ${r.nombre}`}
                          insumos={insumosMedicos}
                        />
                      </span>
                    )}
                    {puedeBorrar && (
                      <button
                        onClick={() => manejarBorrar(r.id, `${r.nombre} ${r.apellido}`)}
                        className="text-xs text-red-700 underline decoration-red-600/40 underline-offset-2 hover:text-red-500"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td
                  colSpan={esAdministrativo ? 8 : 7}
                  className="px-4 py-6 text-center text-ink-soft"
                >
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
