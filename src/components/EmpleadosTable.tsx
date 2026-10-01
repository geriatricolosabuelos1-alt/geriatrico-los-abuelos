"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { actualizarEmpleado, eliminarEmpleado } from "@/app/empleados/actions";
import { MarcacionEmpleado } from "@/components/MarcacionEmpleado";
import { BotonBajaEmpleado, BotonReincorporarEmpleado } from "@/components/EgresoEmpleado";
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
  fecha_baja: string | null;
  motivo_baja: string | null;
  detalle_baja: string | null;
};

type Props = {
  empleados: FilaEmpleado[];
  sucursales: Sucursal[];
  puedeBorrar: boolean;
  vistaBajas: boolean;
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

function FilaEdicion({
  empleado,
  sucursales,
  onCancelar,
  onGuardado,
}: {
  empleado: FilaEmpleado;
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
    const resultado = await actualizarEmpleado(empleado.id, { error: null }, formData);

    setEnviando(false);
    if (resultado.error) {
      setError(resultado.error);
    } else {
      onGuardado();
    }
  }

  const form = `editar-${empleado.id}`;
  const celda = "px-2 py-2 align-top";

  return (
    <tr className="border-b border-edge bg-panel-deep last:border-0">
      <td className={celda}>
        <form id={form} onSubmit={manejarSubmit} />
        <input
          form={form}
          name="nombre_completo"
          defaultValue={empleado.nombre_completo}
          required
          className={`${CAMPO} min-w-[140px]`}
          placeholder="Nombre"
        />
        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      </td>
      <td className={celda}>
        <select form={form} name="sucursal_id" defaultValue={empleado.sucursal_id} required className={CAMPO}>
          {sucursales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </td>
      <td className={celda}>
        <input form={form} name="dni" defaultValue={empleado.dni ?? ""} className={`${CAMPO} min-w-[90px]`} placeholder="DNI" />
      </td>
      <td className={celda}>
        <input form={form} type="date" name="fecha_nacimiento" defaultValue={empleado.fecha_nacimiento ?? ""} className={CAMPO} />
      </td>
      <td className={celda}>
        <input
          form={form}
          name="direccion"
          defaultValue={empleado.direccion ?? ""}
          className={`${CAMPO} min-w-[140px]`}
          placeholder="Domicilio"
        />
      </td>
      <td className={celda}>
        <select form={form} name="tipo_contratacion" defaultValue={empleado.tipo_contratacion ?? ""} className={CAMPO}>
          <option value="">Sin definir</option>
          <option value="monotributo">Monotributo</option>
          <option value="relacion_dependencia">Relación de dependencia</option>
        </select>
      </td>
      <td className={celda}>
        <select form={form} name="forma_pago" defaultValue={empleado.forma_pago ?? ""} className={CAMPO}>
          <option value="">Sin definir</option>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
        </select>
      </td>
      <td className={celda}>
        <input form={form} name="turno" defaultValue={empleado.turno ?? ""} className={`${CAMPO} min-w-[70px]`} placeholder="Turno" />
      </td>
      <td className={celda}>
        <input
          form={form}
          type="number"
          step="0.01"
          name="sueldo"
          defaultValue={empleado.sueldo ?? ""}
          className={`${CAMPO} min-w-[90px]`}
          placeholder="Sueldo"
        />
      </td>
      <td className={celda} />
      <td className={`${celda} text-right whitespace-nowrap`}>
        <button
          type="submit"
          form={form}
          disabled={enviando}
          className="mr-2 rounded-md bg-brass px-3 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
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
      </td>
    </tr>
  );
}

export function EmpleadosTable({ empleados, sucursales, puedeBorrar, vistaBajas }: Props) {
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
              <th className="px-4 py-3">{vistaBajas ? "Baja" : "Marcación"}</th>
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
                  onGuardado={() => setEditandoId(null)}
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
                  <td className="px-4 py-3 whitespace-nowrap">
                    {vistaBajas ? (
                      <div className="text-xs">
                        <p className="font-semibold text-ink">
                          {e.fecha_baja ? new Date(e.fecha_baja + "T00:00:00").toLocaleDateString("es-AR") : "—"}
                        </p>
                        {e.motivo_baja && <p className="text-ink">{e.motivo_baja}</p>}
                        {e.detalle_baja && <p className="whitespace-normal text-ink-soft">{e.detalle_baja}</p>}
                      </div>
                    ) : (
                      <MarcacionEmpleado empleadoId={e.id} empleadoNombre={e.nombre_completo} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/empleados/${e.id}/recibo`}
                      className="mr-3 text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                    >
                      Recibo
                    </Link>
                    {vistaBajas ? (
                      <BotonReincorporarEmpleado empleadoId={e.id} nombre={e.nombre_completo} />
                    ) : (
                      <>
                        <button
                          onClick={() => setEditandoId(e.id)}
                          className="mr-3 text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                        >
                          Editar
                        </button>
                        <BotonBajaEmpleado empleadoId={e.id} nombre={e.nombre_completo} />
                      </>
                    )}
                    {puedeBorrar && (
                      <button
                        onClick={() => manejarBorrar(e.id, e.nombre_completo)}
                        className="text-xs text-red-700 underline decoration-red-600/40 underline-offset-2 hover:text-red-500"
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
                <td colSpan={11} className="px-4 py-6 text-center text-ink-soft">
                  {vistaBajas ? "No hay empleados dados de baja." : "Ningún empleado coincide con el filtro."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
