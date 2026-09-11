"use client";

import { useActionState, useMemo, useState } from "react";
import {
  registrarMovimiento,
  type RegistrarMovimientoEstado,
} from "@/app/sucursales/[id]/inventario/actions";
import type { CategoriaInsumo, Insumo } from "@/lib/types";

type ResidenteBasico = { id: string; nombre: string; apellido: string };

type Props = {
  sucursalId: string;
  insumos: Insumo[];
  residentes: ResidenteBasico[];
};

const ESTADO_INICIAL: RegistrarMovimientoEstado = { error: null };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-soft";

const ETIQUETA_CATEGORIA: Record<CategoriaInsumo, string> = {
  medicos: "Insumos médicos",
  varios: "Insumos varios",
};

const FORMATO_MONEDA = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export function InventarioForm({ sucursalId, insumos, residentes }: Props) {
  const accionConSucursal = registrarMovimiento.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConSucursal, ESTADO_INICIAL);

  const [precio, setPrecio] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "salida">("entrada");
  const [imputar, setImputar] = useState(false);

  const categorias: CategoriaInsumo[] = ["medicos", "varios"];

  const importeTotal = useMemo(() => {
    const p = Number(precio);
    const c = Number(cantidad);
    if (!p || !c) return 0;
    return p * c;
  }, [precio, cantidad]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-edge bg-card p-5"
    >
      <h2 className="font-display text-sm font-semibold text-ink">Registrar movimiento</h2>

      <div className="flex flex-wrap items-end gap-3 overflow-x-auto">
        <div className="min-w-[220px] flex-1">
          <label className={ETIQUETA}>Insumo</label>
          <select name="insumo_id" required className={CAMPO}>
            <option value="">Seleccionar...</option>
            {categorias.map((cat) => {
              const items = insumos.filter((i) => i.categoria === cat);
              if (items.length === 0) return null;
              return (
                <optgroup key={cat} label={ETIQUETA_CATEGORIA[cat]}>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nombre}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>

        <div className="w-32">
          <label className={ETIQUETA}>Tipo</label>
          <select
            name="tipo"
            required
            value={tipo}
            onChange={(e) => {
              const v = e.target.value as "entrada" | "salida";
              setTipo(v);
              if (v === "entrada") setImputar(false);
            }}
            className={CAMPO}
          >
            <option value="entrada">Ingreso</option>
            <option value="salida">Salida</option>
          </select>
        </div>

        <div className="w-32">
          <label className={ETIQUETA}>Precio</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="precio"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            className={CAMPO}
          />
        </div>

        <div className="w-28">
          <label className={ETIQUETA}>Cantidad</label>
          <input
            type="number"
            step="0.01"
            name="cantidad"
            required
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className={CAMPO}
          />
        </div>

        <div className="w-36">
          <label className={ETIQUETA}>Importe total</label>
          <input
            type="text"
            readOnly
            tabIndex={-1}
            value={FORMATO_MONEDA.format(importeTotal)}
            className={`${CAMPO} cursor-default text-ink-soft`}
          />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Registrar"}
        </button>
      </div>

      {tipo === "salida" && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-edge bg-panel-deep p-3">
          <label className="flex items-center gap-2 text-xs font-medium text-ink">
            <input
              type="checkbox"
              name="imputar_residente"
              checked={imputar}
              onChange={(e) => setImputar(e.target.checked)}
            />
            Imputar como gasto extra a un residente
          </label>
          {imputar && (
            <div className="min-w-[220px] flex-1">
              <label className={ETIQUETA}>Residente</label>
              <select name="residente_id" required className={CAMPO}>
                <option value="">Seleccionar...</option>
                {residentes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.apellido}, {r.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          {imputar && !precio && (
            <p className="text-xs text-red-700">Completá el precio para poder imputar el gasto.</p>
          )}
        </div>
      )}

      {estado.error && <p className="text-sm text-red-700">{estado.error}</p>}
    </form>
  );
}
