"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  emitirFactura,
  type CondicionIva,
  type CondicionVenta,
  type MedioPagoFactura,
  type TipoDocReceptor,
} from "@/app/sucursales/[id]/cuotas/arca-actions";
import { buscarContribuyente } from "@/app/sucursales/[id]/facturacion/actions";
import { cuitValido } from "@/lib/facturacion";

type Props = {
  residenteId: string;
  pagoId: string;
  montoSugerido: number;
  mes: number;
  anio: number;
  dniResidente: string | null;
  yaFacturado: boolean;
  // Sugerencias tomadas del cobro registrado
  cobradoCompleto: boolean;
  medioSugerido: MedioPagoFactura | null;
  residenteNombre: string;
  sucursalId: string;
  // Familiar que firma el contrato (ficha administrativa): se le puede facturar con un toque.
  contratante: { nombre: string | null; dni: string | null };
};

type LineaForm = { descripcion: string; importe: string };

const MESES = [
  "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-2 py-1 text-xs text-ink focus:border-brass focus:outline-none";

const CAMPO_LINEA = CAMPO.replace("w-full ", "");

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function primerDiaDelMes(mes: number, anio: number): string {
  return `${anio}-${pad(mes)}-01`;
}

function ultimoDiaDelMes(mes: number, anio: number): string {
  const dia = new Date(anio, mes, 0).getDate();
  return `${anio}-${pad(mes)}-${pad(dia)}`;
}

function formatearTotal(total: number): string {
  return `$${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export function BotonFacturar({
  residenteId,
  pagoId,
  montoSugerido,
  mes,
  anio,
  dniResidente,
  yaFacturado,
  cobradoCompleto,
  medioSugerido,
  residenteNombre,
  sucursalId,
  contratante,
}: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lineas, setLineas] = useState<LineaForm[]>([
    {
      descripcion: `Servicios de cuidado geriátrico — ${MESES[mes]} ${anio}`,
      importe: String(montoSugerido),
    },
  ]);
  const [periodoDesde, setPeriodoDesde] = useState(primerDiaDelMes(mes, anio));
  const [periodoHasta, setPeriodoHasta] = useState(ultimoDiaDelMes(mes, anio));
  const [tipoDoc, setTipoDoc] = useState<TipoDocReceptor>(
    dniResidente ? "dni" : "consumidor_final",
  );
  const [docNro, setDocNro] = useState(dniResidente ?? "");
  const [condicionIva, setCondicionIva] = useState<CondicionIva>("consumidor_final");
  const [condicionVenta, setCondicionVenta] = useState<CondicionVenta>(
    cobradoCompleto ? "contado" : "cuenta_corriente",
  );
  const [medioPago, setMedioPago] = useState<MedioPagoFactura | "">(medioSugerido ?? "");
  const [receptorNombre, setReceptorNombre] = useState(residenteNombre);
  const [buscando, setBuscando] = useState(false);
  const [avisoPadron, setAvisoPadron] = useState<string | null>(null);

  // Con un DNI, CUIT o CUIL completo, trae de ARCA el nombre (si es el DNI del residente, su nombre).
  async function buscarEnArca(valor: string, tipo: TipoDocReceptor) {
    const limpio = valor.replace(/\D/g, "");
    if (tipo === "dni") {
      if (limpio.length < 7 || limpio.length > 8) return;
      if (dniResidente && limpio === dniResidente.replace(/\D/g, "")) {
        setReceptorNombre(residenteNombre);
        return;
      }
    } else if ((tipo !== "cuit" && tipo !== "cuil") || !cuitValido(limpio)) {
      return;
    }
    setBuscando(true);
    setAvisoPadron(null);
    const r = await buscarContribuyente(sucursalId, limpio);
    setBuscando(false);
    if (r.nombre) setReceptorNombre(r.nombre);
    else setAvisoPadron(r.error);
  }

  function usarContratante() {
    if (!contratante.nombre) return;
    setReceptorNombre(contratante.nombre);
    if (contratante.dni) {
      setTipoDoc("dni");
      setDocNro(contratante.dni);
      setCondicionIva("consumidor_final");
    }
  }

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

  const total = lineas.reduce((acc, l) => acc + (Number(l.importe) || 0), 0);

  function actualizarLinea(indice: number, cambios: Partial<LineaForm>) {
    setLineas((prev) => prev.map((l, i) => (i === indice ? { ...l, ...cambios } : l)));
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, { descripcion: "", importe: "" }]);
  }

  function quitarLinea(indice: number) {
    setLineas((prev) => prev.filter((_, i) => i !== indice));
  }

  async function confirmar() {
    setEnviando(true);
    setError(null);
    const resultado = await emitirFactura(pagoId, {
      detalle: lineas.map((l) => ({
        descripcion: l.descripcion,
        importe: Number(l.importe),
      })),
      periodoDesde,
      periodoHasta,
      tipoDoc,
      docNro,
      condicionIva,
      condicionVenta,
      medioPago: medioPago || null,
      receptorNombre: receptorNombre.trim() || residenteNombre,
    });
    setEnviando(false);
    if (resultado.error) {
      setError(resultado.error);
      return;
    }
    if (resultado.aviso) window.alert(resultado.aviso);
    setAbierto(false);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl border border-edge bg-card p-5 shadow-2xl">
        <h3 className="font-display text-sm font-semibold text-ink">
          Emitir Factura C ante ARCA
        </h3>

        <div>
          <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
            Período facturado
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[0.65rem] text-ink-soft">
              Desde
              <input
                type="date"
                value={periodoDesde}
                onChange={(e) => setPeriodoDesde(e.target.value)}
                className={CAMPO}
              />
            </label>
            <label className="text-[0.65rem] text-ink-soft">
              Hasta
              <input
                type="date"
                value={periodoHasta}
                onChange={(e) => setPeriodoHasta(e.target.value)}
                className={CAMPO}
              />
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
            Detalle
          </label>
          <div className="space-y-2">
            {lineas.map((linea, indice) => (
              <div key={indice} className="flex items-center gap-2">
                <input
                  value={linea.descripcion}
                  onChange={(e) => actualizarLinea(indice, { descripcion: e.target.value })}
                  placeholder="Descripción"
                  aria-label={`Descripción de la línea ${indice + 1}`}
                  className={`${CAMPO_LINEA} min-w-0 flex-1`}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={linea.importe}
                  onChange={(e) => actualizarLinea(indice, { importe: e.target.value })}
                  placeholder="Importe"
                  aria-label={`Importe de la línea ${indice + 1}`}
                  className={`${CAMPO_LINEA} w-28 shrink-0`}
                />
                <button
                  type="button"
                  onClick={() => quitarLinea(indice)}
                  disabled={lineas.length === 1}
                  aria-label={`Quitar la línea ${indice + 1}`}
                  className="px-1 text-sm text-ink-soft hover:text-red-700 disabled:opacity-30"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={agregarLinea}
            className="mt-2 text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
          >
            + Agregar línea
          </button>
          <div className="mt-2 flex items-center justify-between rounded-lg bg-brass-soft px-3 py-2">
            <span className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              Total a facturar
            </span>
            <span className="font-display text-base font-semibold text-brass">
              {formatearTotal(total)}
            </span>
          </div>
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
              if (valor === "dni" && dniResidente) {
                setDocNro(dniResidente);
                setReceptorNombre(residenteNombre);
              }
            }}
            className={CAMPO}
          >
            <option value="dni">DNI del residente / familiar</option>
            <option value="cuit">CUIT (empresa, obra social, familiar)</option>
            <option value="cuil">CUIL (familiar)</option>
            <option value="consumidor_final">Consumidor Final (sin identificar)</option>
          </select>
        </div>

        {tipoDoc !== "consumidor_final" && (
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              {tipoDoc === "dni" ? "DNI" : tipoDoc.toUpperCase()}
            </label>
            <input
              value={docNro}
              onChange={(e) => {
                setDocNro(e.target.value);
                if (e.target.value.replace(/\D/g, "").length === 11) buscarEnArca(e.target.value, tipoDoc);
              }}
              onBlur={(e) => buscarEnArca(e.target.value, tipoDoc)}
              placeholder={tipoDoc === "dni" ? "12345678" : "20123456789"}
              className={CAMPO}
            />
          </div>
        )}

        {tipoDoc !== "consumidor_final" && (
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              A nombre de
            </label>
            <input
              value={receptorNombre}
              onChange={(e) => setReceptorNombre(e.target.value)}
              placeholder="Apellido y nombre / Razón social"
              className={CAMPO}
            />
            {buscando && <p className="mt-1 text-[0.65rem] text-ink-soft">Buscando en ARCA...</p>}
            {!buscando && avisoPadron && <p className="mt-1 text-[0.65rem] text-amber-700">{avisoPadron}</p>}
            {contratante.nombre && receptorNombre !== contratante.nombre && (
              <button
                type="button"
                onClick={usarContratante}
                className="mt-1 text-[0.7rem] text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
              >
                Facturar al contratante: {contratante.nombre}
                {contratante.dni ? ` (DNI ${contratante.dni})` : ""}
              </button>
            )}
            {receptorNombre !== residenteNombre && (
              <p className="mt-1 text-[0.65rem] text-ink-soft">En la factura figura el residente: {residenteNombre}.</p>
            )}
          </div>
        )}

        {(tipoDoc === "dni" || tipoDoc === "consumidor_final") && (
          <p className="text-[0.7rem] text-ink-soft">Condición frente al IVA: Consumidor Final.</p>
        )}

        {(tipoDoc === "cuit" || tipoDoc === "cuil") && (
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

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              Condición de venta
            </label>
            <select
              value={condicionVenta}
              onChange={(e) => setCondicionVenta(e.target.value as CondicionVenta)}
              className={CAMPO}
            >
              <option value="contado">Contado</option>
              <option value="cuenta_corriente">Cuenta corriente</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              Medio de pago
            </label>
            <select
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value as MedioPagoFactura | "")}
              className={CAMPO}
            >
              <option value="">—</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="mercado_pago">Mercado Pago</option>
            </select>
          </div>
        </div>

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
