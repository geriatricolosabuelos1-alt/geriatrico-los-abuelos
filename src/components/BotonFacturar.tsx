"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  emitirFactura,
  type CondicionIva,
  type TipoDocReceptor,
} from "@/app/sucursales/[id]/cuotas/arca-actions";

type Props = {
  residenteId: string;
  pagoId: string;
  montoSugerido: number;
  dniResidente: string | null;
  yaFacturado: boolean;
};

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-2 py-1 text-xs text-ink focus:border-brass focus:outline-none";

export function BotonFacturar({
  residenteId,
  pagoId,
  montoSugerido,
  dniResidente,
  yaFacturado,
}: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [importe, setImporte] = useState(String(montoSugerido));
  const [tipoDoc, setTipoDoc] = useState<TipoDocReceptor>(
    dniResidente ? "dni" : "consumidor_final",
  );
  const [docNro, setDocNro] = useState(dniResidente ?? "");
  const [condicionIva, setCondicionIva] = useState<CondicionIva>("consumidor_final");

  if (yaFacturado) {
    return (
      <Link
        href={`/residentes/${residenteId}/factura/${pagoId}`}
        target="_blank"
        className="mr-3 text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
      >
        Factura
      </Link>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mr-3 text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
      >
        Facturar
      </button>
    );
  }

  async function confirmar() {
    setEnviando(true);
    setError(null);
    const resultado = await emitirFactura(pagoId, {
      importe: Number(importe),
      tipoDoc,
      docNro,
      condicionIva,
    });
    setEnviando(false);
    if (resultado.error) {
      setError(resultado.error);
      return;
    }
    setAbierto(false);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm space-y-3 rounded-2xl border border-edge bg-card p-5 shadow-2xl">
        <h3 className="font-display text-sm font-semibold text-ink">
          Emitir Factura C ante ARCA
        </h3>

        <div>
          <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
            Importe a facturar
          </label>
          <input
            type="number"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            className={CAMPO}
          />
        </div>

        <div>
          <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
            Facturar a
          </label>
          <select
            value={tipoDoc}
            onChange={(e) => {
              const valor = e.target.value as TipoDocReceptor;
              setTipoDoc(valor);
              setCondicionIva(valor === "cuit" ? "responsable_inscripto" : "consumidor_final");
            }}
            className={CAMPO}
          >
            <option value="dni">DNI del residente / familiar</option>
            <option value="cuit">CUIT (empresa, obra social, otro)</option>
            <option value="consumidor_final">Consumidor Final (sin identificar)</option>
          </select>
        </div>

        {tipoDoc !== "consumidor_final" && (
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              {tipoDoc === "dni" ? "DNI" : "CUIT"}
            </label>
            <input
              value={docNro}
              onChange={(e) => setDocNro(e.target.value)}
              placeholder={tipoDoc === "dni" ? "12345678" : "20123456789"}
              className={CAMPO}
            />
          </div>
        )}

        {tipoDoc === "cuit" && (
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              Condición frente al IVA
            </label>
            <select
              value={condicionIva}
              onChange={(e) => setCondicionIva(e.target.value as CondicionIva)}
              className={CAMPO}
            >
              <option value="responsable_inscripto">Responsable Inscripto</option>
              <option value="monotributo">Monotributo</option>
              <option value="exento">Exento</option>
            </select>
          </div>
        )}

        {error && <p className="text-xs text-red-700">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="text-xs text-ink-soft hover:text-ink"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={enviando}
            className="rounded-full bg-brass px-4 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
          >
            {enviando ? "Emitiendo..." : "Emitir factura"}
          </button>
        </div>
      </div>
    </div>
  );
}
