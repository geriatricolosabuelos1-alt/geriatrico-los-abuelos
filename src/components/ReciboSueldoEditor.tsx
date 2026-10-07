"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { guardarReciboSueldo, type ItemRecibo } from "@/app/empleados/[id]/recibo/actions";
import { BotonEliminarReciboSueldo } from "@/components/BotonEliminarReciboSueldo";
import { montoEnLetras } from "@/lib/numeroALetras";

type Props = {
  empleadoId: string;
  periodo: string;
  fechaPagoInicial: string;
  itemsIniciales: ItemRecibo[];
  guardadoPreviamente: boolean;
  empleador: { nombre: string; direccion: string | null };
  empleado: {
    nombre: string;
    dni: string | null;
    contratacion: string;
    formaPago: string;
    turno: string | null;
  };
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const CAMPO =
  "w-full rounded-md border border-edge bg-panel-deep px-2 py-1 text-sm text-ink focus:border-brass focus:outline-none";

function formatearMonto(n: number): string {
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function etiquetaPeriodo(periodo: string): string {
  const [anio, mes] = periodo.split("-").map(Number);
  return MESES[mes - 1] ? `${MESES[mes - 1]} ${anio}` : periodo;
}

function Copia({
  titulo,
  props,
  periodo,
  items,
  fechaPago,
}: {
  titulo: string;
  props: Props;
  periodo: string;
  items: ItemRecibo[];
  fechaPago: string;
}) {
  const [anio, mes] = periodo.split("-").map(Number);
  const haberes = items.filter((i) => i.tipo === "haber");
  const descuentos = items.filter((i) => i.tipo === "descuento");
  const totalHaberes = haberes.reduce((a, i) => a + i.monto, 0);
  const totalDescuentos = descuentos.reduce((a, i) => a + i.monto, 0);
  const neto = totalHaberes - totalDescuentos;
  const celda = "border border-neutral-400 px-2 py-1";

  return (
    <div className="break-inside-avoid border border-neutral-500 p-4 text-[0.72rem] text-black">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="text-sm font-bold">{props.empleador.nombre}</p>
          {props.empleador.direccion && <p>{props.empleador.direccion}</p>}
        </div>
        <div className="text-right">
          <p className="text-sm font-bold uppercase">Recibo de haberes</p>
          <p className="text-[0.65rem] uppercase text-neutral-600">{titulo}</p>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-x-4 gap-y-0.5 border-y border-neutral-400 py-1.5">
        <p>
          <span className="font-semibold">Empleado:</span> {props.empleado.nombre}
        </p>
        <p>
          <span className="font-semibold">DNI:</span> {props.empleado.dni ?? "—"}
        </p>
        <p>
          <span className="font-semibold">Período:</span> {MESES[mes - 1]} {anio}
        </p>
        <p>
          <span className="font-semibold">Contratación:</span> {props.empleado.contratacion}
        </p>
        <p>
          <span className="font-semibold">Forma de pago:</span> {props.empleado.formaPago}
        </p>
        <p>
          <span className="font-semibold">Fecha de pago:</span>{" "}
          {fechaPago ? new Date(fechaPago + "T00:00:00").toLocaleDateString("es-AR") : "—"}
        </p>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-neutral-100 text-[0.62rem] uppercase">
            <th className={`${celda} text-left`}>Concepto</th>
            <th className={`${celda} w-28 text-right`}>Haberes</th>
            <th className={`${celda} w-28 text-right`}>Descuentos</th>
          </tr>
        </thead>
        <tbody>
          {[...haberes, ...descuentos].map((i, idx) => (
            <tr key={idx}>
              <td className={celda}>{i.concepto}</td>
              <td className={`${celda} text-right`}>{i.tipo === "haber" ? formatearMonto(i.monto) : ""}</td>
              <td className={`${celda} text-right`}>{i.tipo === "descuento" ? formatearMonto(i.monto) : ""}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className={`${celda} text-right`}>Totales</td>
            <td className={`${celda} text-right`}>{formatearMonto(totalHaberes)}</td>
            <td className={`${celda} text-right`}>{formatearMonto(totalDescuentos)}</td>
          </tr>
          <tr className="text-sm font-bold">
            <td className={`${celda} text-right`}>NETO A COBRAR</td>
            <td colSpan={2} className={`${celda} text-right`}>
              $ {formatearMonto(neto)}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1.5">
        <span className="font-semibold">Son:</span> {montoEnLetras(neto)}
      </p>

      <div className="mt-10 grid grid-cols-2 gap-10">
        <div className="text-center">
          <div className="mb-1 border-t border-black" />
          <p className="text-[0.62rem] text-neutral-600">Firma del empleado</p>
        </div>
        <div className="text-center">
          <div className="mb-1 border-t border-black" />
          <p className="text-[0.62rem] text-neutral-600">Firma del empleador</p>
        </div>
      </div>
    </div>
  );
}

export function ReciboSueldoEditor(props: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ItemRecibo[]>(props.itemsIniciales);
  const [fechaPago, setFechaPago] = useState(props.fechaPagoInicial);
  const [preguntando, setPreguntando] = useState(false);
  const [conflicto, setConflicto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(props.guardadoPreviamente);
  // Período con el que está guardado hoy el recibo (null si todavía no se emitió).
  const [periodoGuardado, setPeriodoGuardado] = useState<string | null>(
    props.guardadoPreviamente ? props.periodo : null,
  );
  const [periodo, setPeriodo] = useState(props.periodo);

  function actualizar(idx: number, cambios: Partial<ItemRecibo>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...cambios } : it)));
  }

  async function guardarEImprimir(reemplazar: boolean) {
    setPreguntando(false);
    setConflicto(false);
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      setError("Elegí el período del recibo.");
      return;
    }
    setGuardando(true);
    setError(null);
    const r = await guardarReciboSueldo(props.empleadoId, periodo, fechaPago, items, {
      periodoAnterior: periodoGuardado,
      reemplazar,
    });
    setGuardando(false);
    if (r.conflicto) {
      setConflicto(true);
      return;
    }
    if (r.error) {
      setError(r.error);
      return;
    }
    const cambioDePeriodo = periodo !== props.periodo;
    setGuardado(true);
    setPeriodoGuardado(periodo);
    window.print();
    // El recibo quedó fijo en el período nuevo: se abre la pantalla de ese período.
    if (cambioDePeriodo) router.replace(`/empleados/${props.empleadoId}/recibo?periodo=${periodo}`);
  }

  const totalHaberes = items.filter((i) => i.tipo === "haber").reduce((a, i) => a + (i.monto || 0), 0);
  const totalDescuentos = items.filter((i) => i.tipo === "descuento").reduce((a, i) => a + (i.monto || 0), 0);

  return (
    <>
      <section className="space-y-3 rounded-2xl border border-edge bg-card p-5 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Conceptos del recibo</h2>
            <p className="text-xs text-ink-soft">
              {guardado
                ? "Este recibo ya fue emitido: podés corregir el período o los conceptos y volver a imprimir. Al imprimir, queda guardado así."
                : "Se armó automáticamente con el sueldo cargado. Revisalo, agregá lo que haga falta y se guarda al imprimir."}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {guardado && (
              <div>
                <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                  Período del recibo
                </label>
                <input
                  type="month"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  className={CAMPO}
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                Fecha de pago
              </label>
              <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className={CAMPO} />
            </div>
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              <th className="py-1 pr-2">Concepto</th>
              <th className="w-36 py-1 pr-2">Tipo</th>
              <th className="w-40 py-1 pr-2 text-right">Monto</th>
              <th className="w-16 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} className="border-t border-edge">
                <td className="py-1.5 pr-2">
                  <input
                    value={it.concepto}
                    onChange={(e) => actualizar(idx, { concepto: e.target.value })}
                    className={CAMPO}
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <select
                    value={it.tipo}
                    onChange={(e) => actualizar(idx, { tipo: e.target.value as ItemRecibo["tipo"] })}
                    className={CAMPO}
                  >
                    <option value="haber">Haber (suma)</option>
                    <option value="descuento">Descuento (resta)</option>
                  </select>
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    type="number"
                    step="0.01"
                    value={Number.isFinite(it.monto) ? it.monto : ""}
                    onChange={(e) => actualizar(idx, { monto: e.target.value === "" ? 0 : Number(e.target.value) })}
                    className={`${CAMPO} text-right`}
                  />
                </td>
                <td className="py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-xs text-red-700 hover:text-red-500"
                  >
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, { concepto: "", tipo: "haber", monto: 0 }])}
              className="rounded-lg border border-edge px-3 py-1.5 text-xs font-semibold text-ink hover:border-brass"
            >
              + Agregar haber
            </button>
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, { concepto: "", tipo: "descuento", monto: 0 }])}
              className="rounded-lg border border-edge px-3 py-1.5 text-xs font-semibold text-ink hover:border-brass"
            >
              + Agregar descuento
            </button>
          </div>
          <p className="text-sm text-ink">
            Haberes $ {formatearMonto(totalHaberes)} − Descuentos $ {formatearMonto(totalDescuentos)} ={" "}
            <span className="font-semibold">Neto $ {formatearMonto(totalHaberes - totalDescuentos)}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPreguntando(true)}
            disabled={guardando}
            className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : guardado ? "Guardar e imprimir" : "Imprimir recibo"}
          </button>
          {guardado && periodoGuardado && (
            <BotonEliminarReciboSueldo
              empleadoId={props.empleadoId}
              periodo={periodoGuardado}
              etiqueta={`${props.empleado.nombre} · ${etiquetaPeriodo(periodoGuardado)}`}
              redirigirA="/empleados/recibos"
            />
          )}
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
      </section>

      {preguntando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 print:hidden">
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-edge bg-card p-6 shadow-2xl">
            <p className="font-display text-lg font-semibold text-ink">¿Hay que hacer alguna modificación?</p>
            <p className="text-sm text-ink-soft">
              Neto a cobrar: <span className="font-semibold text-ink">$ {formatearMonto(totalHaberes - totalDescuentos)}</span>.
              Si falta agregar horas extra, adelantos, premios u otro concepto, modificalo antes de imprimir.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreguntando(false)}
                className="rounded-lg border border-edge px-4 py-2 text-sm font-semibold text-ink hover:border-brass"
              >
                Sí, modificar
              </button>
              <button
                type="button"
                onClick={() => guardarEImprimir(false)}
                className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90"
              >
                No, imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {conflicto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 print:hidden">
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-edge bg-card p-6 shadow-2xl">
            <p className="font-display text-lg font-semibold text-ink">
              Ya hay un recibo de {etiquetaPeriodo(periodo)}
            </p>
            <p className="text-sm text-ink-soft">
              {props.empleado.nombre} ya tiene un recibo guardado en ese período. Si continuás, se reemplaza por este
              y el de {periodoGuardado ? etiquetaPeriodo(periodoGuardado) : "el período anterior"} se elimina.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConflicto(false)}
                className="rounded-lg border border-edge px-4 py-2 text-sm font-semibold text-ink hover:border-brass"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => guardarEImprimir(true)}
                className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90"
              >
                Reemplazar e imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-6 print:mt-0">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-soft print:hidden">Vista previa</p>
        <div className="space-y-6 bg-white p-4 print:p-0">
          <Copia titulo="Original" props={props} periodo={periodo} items={items} fechaPago={fechaPago} />
          <Copia titulo="Duplicado" props={props} periodo={periodo} items={items} fechaPago={fechaPago} />
        </div>
      </div>
    </>
  );
}
