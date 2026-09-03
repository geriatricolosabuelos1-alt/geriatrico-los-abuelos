"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import {
  actualizarEmpleado,
  eliminarEmpleado,
  type ActualizarEmpleadoEstado,
} from "@/app/empleados/actions";
import type { Sucursal } from "@/lib/types";

type FilaEmpleado = {
  id: string;
  nombre_completo: string;
  dni: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  tipo_contratacion: string | null;
  forma_pago: string | null;
  turno: string | null;
  sueldo: number | null;
  activo: boolean;
  sucursal_id: string;
  sucursales: { nombre: string } | null;
};

type Props = {
  empleados: FilaEmpleado[];
  sucursales: Sucursal[];
  puedeBorrar: boolean;
};

const ETIQUETA_CONTRATACION: Record<string, string> = {
  monotributo: "Monotributo",
  relacion_dependencia: "Relación de dependencia",
};

const ETIQUETA_PAGO: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
};

const CAMPO =
  "w-full rounded-md border border-edge bg-card px-2 py-1 text-xs text-ink focus:border-brass focus:outline-none";

const ESTADO_INICIAL: ActualizarEmpleadoEstado = { error: null };

function FilaEdicion({
  empleado,
  sucursales,
  onCancelar,
}: {
  empleado: FilaEmpleado;
  sucursales: Sucursal[];
  onCancelar: () => void;
}) {
  const accion = actualizarEmpleado.bind(null, empleado.id);
  const [estado, formAction, enviando] = useActionState(accion, ESTADO_INICIAL);

  return (
    <tr className="border-b border-edge bg-panel-deep last:border-0">
      <td colSpan={10} className="p-3">
        <form action={formAction} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <select name="sucursal_id" defaultValue={empleado.sucursal_id} required className={CAMPO}>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
          <input
            name="nombre_completo"
            defaultValue={empleado.nombre_completo}
            required
            className={CAMPO}
            placeholder="Nombre"
          />
          <input name="dni" defaultValue={empleado.dni ?? ""} className={CAMPO} placeholder="DNI" />
          <input
            type="date"
            name="fecha_nacimiento"
            defaultValue={empleado.fecha_nacimiento ?? ""}
            className={CAMPO}
          />
          <input
            name="direccion"
            defaultValue={empleado.direccion ?? ""}
            className={CAMPO}
            placeholder="Domicilio"
          />
          <select name="tipo_contratacion" defaultValue={empleado.tipo_contratacion ?? ""} className={CAMPO}>
            <option value="">Sin definir</option>
            <option value="monotributo">Monotributo</option>
            <option value="relacion_dependencia">Relación de dependencia</option>
          </select>
          <select name="forma_pago" defaultValue={empleado.forma_pago ?? ""} className={CAMPO}>
            <option value="">Sin definir</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
          </select>
          <input name="turno" defaultValue={empleado.turno ?? ""} className={CAMPO} placeholder="Turno" />
          <input
            type="number"
            step="0.01"
            name="sueldo"
            defaultValue={empleado.sueldo ?? ""}
            className={CAMPO}
            placeholder="Sueldo"
          />
          <label className="flex items-center gap-1.5 text-xs text-ink-soft">
            <input type="checkbox" name="activo" defaultChecked={empleado.activo} className="h-3.5 w-3.5" />
            Activo
          </label>

          {estado.error && <p className="col-span-full text-xs text-red-400">{estado.error}</p>}

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

export function EmpleadosTable({ empleados, sucursales, puedeBorrar }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [sucursalFiltro, setSucursalFiltro] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return empleados.filter((e) => {
      const coincideTexto =
        !texto ||
        e.nombre_completo.toLowerCase().includes(texto) ||
        (e.dni ?? "").toLowerCase().includes(texto);
      const coincideSucursal = !sucursalFiltro || e.sucursal_id === sucursalFiltro;
      return coincideTexto && coincideSucursal;
    });
  }, [empleados, busqueda, sucursalFiltro]);

  async function manejarBorrar(id: string, nombre: string) {
    if (!window.confirm(`¿Eliminar a ${nombre}?`)) return;
    await eliminarEmpleado(id);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o DNI..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-64 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
        />
        <select
          value={sucursalFiltro}
          onChange={(e) => setSucursalFiltro(e.target.value)}
          className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
        >
          <option value="">Todas las sucursales</option>
          {sucursales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Sucursal</th>
              <th className="px-4 py-3">DNI</th>
              <th className="px-4 py-3">Nacimiento</th>
              <th className="px-4 py-3">Domicilio</th>
              <th className="px-4 py-3">Contratación</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3">Turno</th>
              <th className="px-4 py-3">Sueldo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((e) =>
              editandoId === e.id ? (
                <FilaEdicion
                  key={e.id}
                  empleado={e}
                  sucursales={sucursales}
                  onCancelar={() => setEditandoId(null)}
                />
              ) : (
                <tr key={e.id} className="border-b border-edge last:border-0">
                  <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                    {e.nombre_completo}
                  </td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                    {e.sucursales?.nombre ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{e.dni ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                    {e.fecha_nacimiento
                      ? new Date(e.fecha_nacimiento + "T00:00:00").toLocaleDateString("es-AR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{e.direccion ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                    {e.tipo_contratacion
                      ? (ETIQUETA_CONTRATACION[e.tipo_contratacion] ?? e.tipo_contratacion)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                    {e.forma_pago ? (ETIQUETA_PAGO[e.forma_pago] ?? e.forma_pago) : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{e.turno ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                    {e.sueldo != null ? `$${e.sueldo}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setEditandoId(e.id)}
                      className="mr-3 text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                    >
                      Editar
                    </button>
                    {puedeBorrar && (
                      <button
                        onClick={() => manejarBorrar(e.id, e.nombre_completo)}
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
                <td colSpan={10} className="px-4 py-6 text-center text-ink-soft">
                  Ningún empleado coincide con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
