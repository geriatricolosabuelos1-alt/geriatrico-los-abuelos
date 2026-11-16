"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buscarContribuyente, emitirFacturaExterna } from "@/app/sucursales/[id]/facturacion/actions";
import type {
  CondicionIva,
  CondicionVenta,
  MedioPagoFactura,
} from "@/app/sucursales/[id]/cuotas/arca-actions";
import { cuitValido, type TipoDocExterno } from "@/lib/facturacion";

type LineaForm = { descripcion: string; importe: string };

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none";
// Sin ancho fijo: en cada línea del detalle el texto ocupa todo y el monto queda angosto.
const CAMPO_LINEA = CAMPO.replace("w-full ", "");
const ETIQUETA = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";

function formatearTotal(total: number): string {
  return `$${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

function primerDiaDelMes(fecha: string): string {
  return `${fecha.slice(0, 7)}-01`;
}

function ultimoDiaDelMes(fecha: string): string {
  const [a, m] = fecha.split("-").map(Number);
  return `${fecha.slice(0, 7)}-${String(new Date(a, m, 0).getDate()).padStart(2, "0")}`;
}

// Emitir Factura C ante ARCA por un servicio externo, con el CUIT de la sede.
export function FormularioFacturaExterna({
  sucursalId,
  sedeNombre,
  cuitSede,
  hoy,
}: {
  sucursalId: string;
  sedeNombre: string;
  cuitSede: string | null;
  hoy: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fecha, setFecha] = useState(hoy);
  const [periodoDesde, setPeriodoDesde] = useState(primerDiaDelMes(hoy));
  const [periodoHasta, setPeriodoHasta] = useState(ultimoDiaDelMes(hoy));
  const [receptorNombre, setReceptorNombre] = useState("");
  const [tipoDoc, setTipoDoc] = useState<TipoDocExterno>("cuit");
  const [docNro, setDocNro] = useState("");
  const [condicionIva, setCondicionIva] = useState<CondicionIva>("responsable_inscripto");
  const [condicionVenta, setCondicionVenta] = useState<CondicionVenta>("contado");
  const [medioPago, setMedioPago] = useState<MedioPagoFactura | "">("");
  const [lineas, setLineas] = useState<LineaForm[]>([{ descripcion: "", importe: "" }]);
  const [buscando, setBuscando] = useState(false);
  const [avisoPadron, setAvisoPadron] = useState<string | null>(null);
  const [ultimoBuscado, setUltimoBuscado] = useState("");
  const [nombreDeArca, setNombreDeArca] = useState("");

  // Con el CUIT/CUIL completo, trae de ARCA el nombre o la razón social.
  async function buscarEnArca(valor: string, tipo: TipoDocExterno) {
    const limpio = valor.replace(/\D/g, "");
    if (tipo === "dni" || !cuitValido(limpio) || limpio === ultimoBuscado) return;
    setUltimoBuscado(limpio);
    setBuscando(true);
    setAvisoPadron(null);
    const r = await buscarContribuyente(sucursalId, limpio);
    setBuscando(false);
    if (r.nombre) {
      // No pisa un nombre escrito a mano; sí reemplaza uno traído antes de ARCA.
      if (!receptorNombre.trim() || receptorNombre === nombreDeArca) setReceptorNombre(r.nombre);
      setNombreDeArca(r.nombre);
    } else {
      setAvisoPadron(r.error);
    }
  }

  const total = lineas.reduce((acc, l) => acc + (Number(l.importe) || 0), 0);

  function actualizarLinea(indice: number, cambios: Partial<LineaForm>) {
    setLineas((prev) => prev.map((l, i) => (i === indice ? { ...l, ...cambios } : l)));
  }

  async function emitir() {
    if (
      !window.confirm(
        `Se va a emitir ante ARCA una Factura C de ${formatearTotal(total)} a nombre de ${receptorNombre || "—"}, con el CUIT de ${sedeNombre}. Una factura emitida no se puede borrar (solo anular con nota de crédito). ¿Confirmás?`,
      )
    ) {
      return;
    }
    setEnviando(true);
    setError(null);
    const r = await emitirFacturaExterna(sucursalId, {
      fecha,
      periodoDesde,
      periodoHasta,
      receptorNombre,
      tipoDoc,
      docNro,
      condicionIva,
      condicionVenta,
      medioPago: medioPago || null,
      detalle: lineas.map((l) => ({ descripcion: l.descripcion, importe: Number(l.importe) })),
    });
    setEnviando(false);
    if (r.error || !r.facturaId) {
      setError(r.error ?? "No se pudo emitir la factura.");
      return;
    }
    if (r.aviso) window.alert(r.aviso);
    router.push(`/sucursales/${sucursalId}/facturacion/${r.facturaId}`);
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        disabled={!cuitSede}
        className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        + Nueva factura
      </button>
    );
  }

  return (
    <section className="w-full basis-full space-y-5 rounded-2xl border border-edge bg-card p-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">Nueva factura de servicio externo</h2>
        <p className="text-xs text-ink-soft">
          Factura C electrónica emitida con el CUIT de {sedeNombre}
          {cuitSede && ` (${cuitSede.slice(0, 2)}-${cuitSede.slice(2, 10)}-${cuitSede.slice(10)})`}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={ETIQUETA}>Fecha de la factura</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={CAMPO} />
        </div>
        <div>
          <label className={ETIQUETA}>Período desde</label>
          <input type="date" value={periodoDesde} onChange={(e) => setPeriodoDesde(e.target.value)} className={CAMPO} />
        </div>
        <div>
          <label className={ETIQUETA}>Período hasta</label>
          <input type="date" value={periodoHasta} onChange={(e) => setPeriodoHasta(e.target.value)} className={CAMPO} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={ETIQUETA}>Tipo de documento</label>
          <select
            value={tipoDoc}
            onChange={(e) => {
              const valor = e.target.value as TipoDocExterno;
              setTipoDoc(valor);
              setCondicionIva(valor === "cuit" ? "responsable_inscripto" : "consumidor_final");
            }}
            className={CAMPO}
          >
            <option value="cuit">CUIT</option>
            <option value="cuil">CUIL</option>
            <option value="dni">DNI</option>
          </select>
        </div>
        <div>
          <label className={ETIQUETA}>{tipoDoc.toUpperCase()}</label>
          <input
            value={docNro}
            onChange={(e) => {
              setDocNro(e.target.value);
              if (e.target.value.replace(/\D/g, "").length === 11) buscarEnArca(e.target.value, tipoDoc);
            }}
            onBlur={(e) => buscarEnArca(e.target.value, tipoDoc)}
            placeholder={tipoDoc === "dni" ? "12345678" : "20-12345678-9"}
            inputMode="numeric"
            className={CAMPO}
          />
        </div>
        <div>
          <label className={ETIQUETA}>Condición frente al IVA</label>
          <select
            value={condicionIva}
            onChange={(e) => setCondicionIva(e.target.value as CondicionIva)}
            className={CAMPO}
          >
            <option value="responsable_inscripto">Responsable Inscripto</option>
            <option value="monotributo">Monotributo</option>
            <option value="exento">Exento</option>
            <option value="consumidor_final">Consumidor Final</option>
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className={ETIQUETA}>A nombre de (persona o empresa)</label>
          <input
            value={receptorNombre}
            onChange={(e) => setReceptorNombre(e.target.value)}
            placeholder={
              tipoDoc === "dni" ? "Apellido y nombre" : "Se completa solo al poner el CUIT/CUIL, o escribilo"
            }
            className={CAMPO}
          />
          {buscando && <p className="mt-1 text-xs text-ink-soft">Buscando en ARCA...</p>}
          {!buscando && avisoPadron && <p className="mt-1 text-xs text-amber-700">{avisoPadron}</p>}
        </div>
      </div>

      <div>
        <label className={ETIQUETA}>Detalle</label>
        <div className="space-y-2">
          {lineas.map((linea, indice) => (
            <div key={indice} className="flex items-start gap-2">
              <textarea
                rows={3}
                value={linea.descripcion}
                onChange={(e) => actualizarLinea(indice, { descripcion: e.target.value })}
                placeholder="Descripción del servicio (podés escribir varios renglones)"
                aria-label={`Descripción de la línea ${indice + 1}`}
                className={`${CAMPO_LINEA} min-w-0 flex-1 resize-y`}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={linea.importe}
                onChange={(e) => actualizarLinea(indice, { importe: e.target.value })}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="Monto"
                aria-label={`Monto de la línea ${indice + 1}`}
                className={`${CAMPO_LINEA} w-36 shrink-0`}
              />
              <button
                type="button"
                onClick={() => setLineas((prev) => prev.filter((_, i) => i !== indice))}
                disabled={lineas.length === 1}
                aria-label={`Quitar la línea ${indice + 1}`}
                className="px-1 text-lg text-ink-soft hover:text-red-700 disabled:opacity-30"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setLineas((prev) => [...prev, { descripcion: "", importe: "" }])}
          className="mt-2 text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
        >
          + Agregar línea
        </button>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-brass-soft px-4 py-2">
          <span className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">Monto total</span>
          <span className="font-display text-lg font-semibold text-brass">{formatearTotal(total)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={ETIQUETA}>Condición de venta</label>
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
          <label className={ETIQUETA}>Medio de pago</label>
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

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => setAbierto(false)} className="text-sm text-ink-soft hover:text-ink">
          Cancelar
        </button>
        <button
          type="button"
          onClick={emitir}
          disabled={enviando}
          className="rounded-lg bg-brass px-5 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Emitiendo ante ARCA..." : "Emitir factura"}
        </button>
      </div>
    </section>
  );
}
