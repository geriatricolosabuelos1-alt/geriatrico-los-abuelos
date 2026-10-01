"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { marcarRecetasPedidas } from "@/app/sucursales/[id]/medicacion/recetario/actions";

type Props = {
  sucursalId: string;
  idsPendientes: string[];
};

export function BotonImprimirPedidoRecetas({ sucursalId, idsPendientes }: Props) {
  const router = useRouter();
  const [marcando, setMarcando] = useState(false);

  async function imprimir() {
    window.print();
    if (idsPendientes.length === 0) return;
    setMarcando(true);
    await marcarRecetasPedidas(sucursalId, idsPendientes);
    setMarcando(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={imprimir}
      disabled={marcando}
      className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
    >
      {marcando
        ? "Marcando como pedidas..."
        : idsPendientes.length > 0
          ? "Imprimir / PDF y marcar como pedidas"
          : "Imprimir / PDF"}
    </button>
  );
}
