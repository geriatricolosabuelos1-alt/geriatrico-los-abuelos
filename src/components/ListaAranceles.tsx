"use client";

import { useMemo, useState } from "react";
import { TarjetaArancel } from "@/components/TarjetaArancel";
import { GenerarPeriodoForm } from "@/components/GenerarPeriodoForm";
import type { ResumenCuentaCorriente } from "@/lib/aranceles";

type ItemArancel = {
  residente: {
    id: string;
    nombre: string;
    apellido: string;
    fecha_ingreso: string | null;
  };
  obraSocial: string | null;
  resumen: ResumenCuentaCorriente;
};

type Props = {
  items: ItemArancel[];
  sucursalNombre: string;
  sucursalId: string;
};

type Filtro = "todos" | "al_dia" | "deben";

export function ListaAranceles({ items, sucursalNombre, sucursalId }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const filtrados = useMemo(() => {
    if (filtro === "al_dia") {
      return items.filter((i) => i.resumen.cantidadPendientes === 0);
    }
    if (filtro === "deben") {
      return items.filter((i) => i.resumen.cantidadPendientes > 0);
    }
    return items;
  }, [items, filtro]);

  const cantidadAlDia = items.filter((i) => i.resumen.cantidadPendientes === 0).length;
  const cantidadDeben = items.filter((i) => i.resumen.cantidadPendientes > 0).length;

  const OPCIONES: { valor: Filtro; etiqueta: string }[] = [
    { valor: "todos", etiqueta: `Todos (${items.length})` },
    { valor: "al_dia", etiqueta: `Al día (${cantidadAlDia})` },
    { valor: "deben", etiqueta: `Deben (${cantidadDeben})` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">
            {sucursalNombre}
          </p>
          <h1 className="font-display text-2xl font-bold text-ink">Aranceles</h1>
        </div>
        <GenerarPeriodoForm sucursalId={sucursalId} />
        <div className="flex gap-2">
          {OPCIONES.map((op) => (
          <button
            key={op.valor}
            type="button"
            onClick={() => setFiltro(op.valor)}
            className={
              filtro === op.valor
                ? "rounded-full bg-brass px-4 py-1.5 text-xs font-semibold text-btn-ink"
                : "rounded-full border border-edge px-4 py-1.5 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
            }
          >
              {op.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtrados.map((item) => (
          <TarjetaArancel
            key={item.residente.id}
            residente={item.residente}
            obraSocial={item.obraSocial}
            resumen={item.resumen}
          />
        ))}
        {filtrados.length === 0 && (
          <p className="rounded-2xl border border-edge bg-card p-6 text-center text-ink-soft">
            No hay residentes que coincidan con este filtro.
          </p>
        )}
      </div>
    </div>
  );
}
