"use client";

import { useState } from "react";
import Link from "next/link";
import { EmpleadoForm } from "@/components/EmpleadoForm";
import type { Sucursal } from "@/lib/types";

type Props = {
  sucursales: Sucursal[];
};

function Tarjeta({
  href,
  onClick,
  icono,
  titulo,
  subtitulo,
}: {
  href?: string;
  onClick?: () => void;
  icono: string;
  titulo: string;
  subtitulo: string;
}) {
  const contenido = (
    <>
      <span className="text-2xl">{icono}</span>
      <p className="mt-3 font-display text-base font-semibold text-ink">{titulo}</p>
      <p className="mt-1 text-xs text-ink-soft">{subtitulo}</p>
    </>
  );

  const clases =
    "flex w-64 flex-col items-start rounded-2xl border border-edge bg-card p-5 text-left transition hover:border-brass hover:-translate-y-0.5";

  if (href) {
    return (
      <Link href={href} className={clases}>
        {contenido}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={clases}>
      {contenido}
    </button>
  );
}

export function PanelAccionesEmpleados({ sucursales }: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <Tarjeta
          onClick={() => setAbierto(true)}
          icono="➕"
          titulo="Nuevo empleado"
          subtitulo="Cargar un empleado nuevo en el sistema"
        />
        <Tarjeta
          href="/empleados/turnos"
          icono="🗓️"
          titulo="Turnos semanales"
          subtitulo="Planificar el turno recurrente hasta fin de año"
        />
      </div>

      {abierto && (
        <EmpleadoForm
          sucursales={sucursales}
          onCancelar={() => setAbierto(false)}
          onGuardado={() => setAbierto(false)}
        />
      )}
    </div>
  );
}
