"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cargarStockInicial,
  type CargaInicialEstado,
} from "@/app/sucursales/[id]/inventario/actions";
import type { CategoriaInsumo, Insumo } from "@/lib/types";

type Props = {
  sucursalId: string;
  insumos: Insumo[];
};

const ETIQUETA_CATEGORIA: Record<CategoriaInsumo, string> = {
  medicos: "Insumos médicos",
  varios: "Insumos varios",
};

const ORDEN_CATEGORIAS: CategoriaInsumo[] = ["medicos", "varios"];

export function CargaInicialForm({ sucursalId, insumos }: Props) {
  const router = useRouter();
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [busqueda, setBusqueda] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<CargaInicialEstado>({ error: null, guardado: false });

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return insumos;
    return insumos.filter((i) => i.nombre.toLowerCase().includes(texto));
  }, [insumos, busqueda]);

  const cantidadCargadas = Object.values(cantidades).filter((v) => Number(v) > 0).length;

  async function manejarSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setEstado({ error: null, guardado: false });

    const items = Object.entries(cantidades)
      .filter(([, cantidad]) => Number(cantidad) > 0)
      .map(([insumo_id, cantidad]) => ({ insumo_id, cantidad: Number(cantidad) }));

    const formData = new FormData();
    formData.set("items", JSON.stringify(items));

    const resultado = await cargarStockInicial(sucursalId, { error: null, guardado: false }, formData);
    setEnviando(false);
    setEstado(resultado);

    if (resultado.guardado) {
      router.push(`/sucursales/${sucursalId}/inventario`);
    }
  }

  return (
    <form onSubmit={manejarSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-edge bg-card p-4">
        <input
          type="text"
          placeholder="Buscar insumo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-64 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
        />
        <p className="text-xs text-ink-soft">
          {cantidadCargadas} insumo{cantidadCargadas === 1 ? "" : "s"} con cantidad cargada
        </p>
      </div>

      {estado.error && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-400">
          {estado.error}
        </p>
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
              style={{ background: "rgb(255 255 255 / 0.05)" }}
            >
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-4 py-3">Insumo</th>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3">Cantidad inicial</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-b border-edge last:border-0">
                      <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                        {i.nombre}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{i.unidad}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cantidades[i.id] ?? ""}
                          onChange={(e) =>
                            setCantidades((prev) => ({ ...prev, [i.id]: e.target.value }))
                          }
                          className="w-28 rounded-md border border-edge bg-panel-deep px-2 py-1 text-sm text-ink focus:border-brass focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {filtrados.length === 0 && (
        <p className="text-sm text-ink-soft">Ningún insumo coincide con la búsqueda.</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={enviando || cantidadCargadas === 0}
          className="rounded-lg bg-brass px-6 py-2.5 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : `Guardar carga inicial (${cantidadCargadas})`}
        </button>
      </div>
    </form>
  );
}
