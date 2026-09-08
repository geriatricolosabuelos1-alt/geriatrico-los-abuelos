"use client";

import { useMemo, useState } from "react";
import {
  actualizarInsumo,
  crearInsumo,
  eliminarInsumo,
  type CrearInsumoEstado,
} from "@/app/sucursales/[id]/inventario/actions";
import type { CategoriaInsumo } from "@/lib/types";

type FilaInsumo = {
  id: string;
  nombre: string;
  categoria: CategoriaInsumo;
  unidad: string;
  stockMinimo: number;
  stockInicial: number;
  ingreso: number;
  egreso: number;
  stockFinal: number;
};

type Props = {
  insumos: FilaInsumo[];
  esAdmin: boolean;
};

const ETIQUETA_CATEGORIA: Record<CategoriaInsumo, string> = {
  medicos: "Insumos médicos",
  varios: "Insumos varios",
};

const ORDEN_CATEGORIAS: CategoriaInsumo[] = ["medicos", "varios"];

function tieneAlerta(insumo: FilaInsumo): boolean {
  return insumo.stockFinal <= 0 || insumo.stockFinal <= insumo.stockMinimo;
}

function FilaEditable({ insumo }: { insumo: FilaInsumo }) {
  const [nombre, setNombre] = useState(insumo.nombre);
  const [unidad, setUnidad] = useState(insumo.unidad);
  const [stockMinimo, setStockMinimo] = useState(String(insumo.stockMinimo));
  const [enviando, setEnviando] = useState(false);

  async function manejarSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    const formData = new FormData(e.currentTarget);
    await actualizarInsumo(formData);
    setEnviando(false);
  }

  async function manejarEliminar() {
    if (!window.confirm(`¿Eliminar "${insumo.nombre}" del catálogo de insumos?`)) return;
    await eliminarInsumo(insumo.id);
  }

  return (
    <>
      <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
        <input
          form={`form-${insumo.id}`}
          type="text"
          name="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-40 rounded-md border border-edge bg-panel-deep px-2 py-1 text-sm font-medium text-ink focus:border-brass focus:outline-none"
        />
      </td>
      <td className="px-4 py-3 text-ink-soft">
        <input
          form={`form-${insumo.id}`}
          type="text"
          name="unidad"
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
          className="w-24 rounded-md border border-edge bg-panel-deep px-2 py-1 text-xs text-ink focus:border-brass focus:outline-none"
        />
      </td>
      <td className="px-4 py-3 text-ink-soft">{insumo.stockInicial}</td>
      <td className="px-4 py-3 text-brass">+{insumo.ingreso}</td>
      <td className="px-4 py-3 text-red-700">-{insumo.egreso}</td>
      <td className="px-4 py-3">
        <span
          className={
            insumo.stockFinal <= 0 ? "font-semibold text-red-700" : "font-semibold text-brass"
          }
        >
          {insumo.stockFinal}
        </span>
      </td>
      <td className="px-4 py-3">
        <input
          form={`form-${insumo.id}`}
          type="number"
          min="0"
          step="0.01"
          name="stock_minimo"
          value={stockMinimo}
          onChange={(e) => setStockMinimo(e.target.value)}
          className="w-20 rounded-md border border-edge bg-panel-deep px-2 py-1 text-xs text-ink focus:border-brass focus:outline-none"
        />
      </td>
      <td className="px-4 py-3">
        {tieneAlerta(insumo) && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-red-700">
            Comprar
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <form id={`form-${insumo.id}`} onSubmit={manejarSubmit} className="inline">
          <input type="hidden" name="insumo_id" value={insumo.id} />
          <button
            type="submit"
            disabled={enviando}
            className="text-xs font-medium text-brass hover:text-ink disabled:opacity-50"
          >
            {enviando ? "..." : "Guardar"}
          </button>
        </form>
        <span className="mx-2 text-edge">·</span>
        <button
          type="button"
          onClick={manejarEliminar}
          className="text-xs text-red-700 underline decoration-red-600/40 underline-offset-2 hover:text-red-500"
        >
          Eliminar
        </button>
      </td>
    </>
  );
}

const CAMPO =
  "rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";

function FormularioNuevoInsumo({ onCreado }: { onCreado: () => void }) {
  const [estado, setEstado] = useState<CrearInsumoEstado>({ error: null });
  const [enviando, setEnviando] = useState(false);

  async function manejarSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    const formData = new FormData(e.currentTarget);
    const resultado = await crearInsumo({ error: null }, formData);
    setEnviando(false);
    if (resultado.error) {
      setEstado(resultado);
    } else {
      setEstado({ error: null });
      (e.target as HTMLFormElement).reset();
      onCreado();
    }
  }

  return (
    <form
      onSubmit={manejarSubmit}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-edge bg-card p-4"
    >
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft">
          Nombre
        </label>
        <input name="nombre" required className={CAMPO} placeholder="Ej: Aceite" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft">
          Categoría
        </label>
        <select name="categoria" required defaultValue="varios" className={CAMPO}>
          {ORDEN_CATEGORIAS.map((cat) => (
            <option key={cat} value={cat}>
              {ETIQUETA_CATEGORIA[cat]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft">
          Unidad
        </label>
        <input name="unidad" className={CAMPO} placeholder="unidades" />
      </div>
      {estado.error && <p className="text-xs text-red-700">{estado.error}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        {enviando ? "Guardando..." : "Agregar insumo"}
      </button>
    </form>
  );
}

export function InventarioTable({ insumos, esAdmin }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [mostrarNuevo, setMostrarNuevo] = useState(false);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return insumos.filter((i) => !texto || i.nombre.toLowerCase().includes(texto));
  }, [insumos, busqueda]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Buscar insumo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-64 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
        />
        {esAdmin && (
          <button
            type="button"
            onClick={() => setMostrarNuevo((v) => !v)}
            className="rounded-lg border border-edge px-3 py-2 text-xs font-medium text-ink-soft hover:text-ink"
          >
            {mostrarNuevo ? "Cancelar" : "+ Nuevo insumo"}
          </button>
        )}
      </div>

      {esAdmin && mostrarNuevo && (
        <FormularioNuevoInsumo onCreado={() => setMostrarNuevo(false)} />
      )}

      {ORDEN_CATEGORIAS.map((cat) => {
        const items = filtrados.filter((i) => i.categoria === cat);
        if (items.length === 0) return null;

        return (
          <div key={cat}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-soft">
              {ETIQUETA_CATEGORIA[cat]}
            </p>
            <div
              className="max-h-[420px] overflow-y-auto border border-edge"
              style={{ background: "var(--color-card)" }}
            >
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-3">Insumo</th>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3">Stock inicial</th>
                    <th className="px-4 py-3">+Ingreso</th>
                    <th className="px-4 py-3">-Egreso</th>
                    <th className="px-4 py-3">Stock final</th>
                    <th className="px-4 py-3">Stock mínimo</th>
                    <th className="px-4 py-3">Alerta</th>
                    {esAdmin && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) =>
                    esAdmin ? (
                      <tr key={i.id} className="border-b border-edge last:border-0">
                        <FilaEditable insumo={i} />
                      </tr>
                    ) : (
                      <tr key={i.id} className="border-b border-edge last:border-0">
                        <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                          {i.nombre}
                        </td>
                        <td className="px-4 py-3 text-ink-soft">{i.unidad}</td>
                        <td className="px-4 py-3 text-ink-soft">{i.stockInicial}</td>
                        <td className="px-4 py-3 text-brass">+{i.ingreso}</td>
                        <td className="px-4 py-3 text-red-700">-{i.egreso}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              i.stockFinal <= 0
                                ? "font-semibold text-red-700"
                                : "font-semibold text-brass"
                            }
                          >
                            {i.stockFinal}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink-soft">{i.stockMinimo}</td>
                        <td className="px-4 py-3">
                          {tieneAlerta(i) && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-red-700">
                              Comprar
                            </span>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {filtrados.length === 0 && (
        <p className="text-sm text-ink-soft">Ningún insumo coincide con el filtro.</p>
      )}
    </div>
  );
}
