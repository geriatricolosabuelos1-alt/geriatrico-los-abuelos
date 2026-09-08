"use client";

import Link from "next/link";
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
    contacto_familiar: string | null;
    telefono_familiar: string | null;
  };
  obraSocial: string | null;
  resumen: ResumenCuentaCorriente;
};

type ResumenMes = {
  mesLabel: string;
  cobrado: number;
  cuotasPagadas: number;
  cuotasTotales: number;
  montoPendiente: number;
  cantidadPendientes: number;
  cantidadVencidas: number;
  cuotaPromedio: number;
  variacionPromedio: number | null;
};

type Props = {
  items: ItemArancel[];
  sucursalNombre: string;
  sucursalId: string;
  resumenMes: ResumenMes;
};

type Filtro = "todos" | "al_dia" | "deben";

function formatearMonto(monto: number): string {
  return `$${Math.round(monto).toLocaleString("es-AR")}`;
}

function TarjetaResumen({
  etiqueta,
  valor,
  detalle,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        destacado ? "border-transparent bg-warn" : "border-edge bg-card"
      }`}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {etiqueta}
      </p>
      <p className="font-display text-2xl font-bold text-ink">{valor}</p>
      <p className="mt-1 text-xs text-ink-soft">{detalle}</p>
    </div>
  );
}

export function ListaAranceles({ items, sucursalNombre, sucursalId, resumenMes }: Props) {
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
        <div className="flex flex-wrap items-center gap-2">
          {cantidadDeben > 0 && (
            <Link
              href={`/sucursales/${sucursalId}/cuotas/informe-deudores`}
              target="_blank"
              className="rounded-full border border-brass/40 px-4 py-1.5 text-xs font-semibold text-brass hover:bg-brass-soft"
            >
              PDF deudores
            </Link>
          )}
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

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <TarjetaResumen
          etiqueta={`Cobrado en ${resumenMes.mesLabel}`}
          valor={formatearMonto(resumenMes.cobrado)}
          detalle={`${resumenMes.cuotasPagadas} de ${resumenMes.cuotasTotales} cuotas`}
        />
        <TarjetaResumen
          destacado
          etiqueta="Pendiente"
          valor={formatearMonto(resumenMes.montoPendiente)}
          detalle={
            resumenMes.cantidadVencidas > 0
              ? `${resumenMes.cantidadPendientes} cuota${resumenMes.cantidadPendientes === 1 ? "" : "s"}, ${resumenMes.cantidadVencidas} vencida${resumenMes.cantidadVencidas === 1 ? "" : "s"}`
              : `${resumenMes.cantidadPendientes} cuota${resumenMes.cantidadPendientes === 1 ? "" : "s"}`
          }
        />
        <TarjetaResumen
          etiqueta="Cuota promedio"
          valor={formatearMonto(resumenMes.cuotaPromedio)}
          detalle={
            resumenMes.variacionPromedio == null
              ? "Sin datos del mes anterior"
              : `${resumenMes.variacionPromedio >= 0 ? "+" : ""}${resumenMes.variacionPromedio.toFixed(0)}% vs. mes anterior`
          }
        />
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
