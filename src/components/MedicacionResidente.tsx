"use client";

import { useActionState, useEffect, useState } from "react";
import {
  actualizarDosisAdministrada,
  actualizarIngreso,
  actualizarPrescripcion,
  agregarMedicamento,
  ajustarStock,
  eliminarDosisAdministrada,
  eliminarIngreso,
  eliminarMedicamento,
  listarDosisAdministradas,
  listarIngresos,
  reactivarMedicamento,
  registrarIngreso,
  type ActualizarDosisEstado,
  type AjustarStockEstado,
  type MedicamentoEstado,
  type RegistrarIngresoEstado,
} from "@/app/residentes/[id]/legajo/medicacion-actions";
import { BotonDarDosis } from "@/components/BotonDarDosis";
import type {
  AlertaMedicacion,
  CatalogoMedicamento,
  DosisAdministrada,
  IngresoMedicamento,
  MedicamentoResidente,
  NivelAlertaMedicacion,
} from "@/lib/types";

type Props = {
  residenteId: string;
  medicamentos: MedicamentoResidente[];
  alertas: AlertaMedicacion[];
  catalogo: CatalogoMedicamento[];
  sucursalId?: string;
};

const ESTADO_INICIAL: MedicamentoEstado = { error: null };
const ESTADO_INGRESO_INICIAL: RegistrarIngresoEstado = { error: null };
const ESTADO_STOCK_INICIAL: AjustarStockEstado = { error: null };
const ESTADO_DOSIS_INICIAL: ActualizarDosisEstado = { error: null };

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft";

const ETIQUETA_ALERTA: Record<NivelAlertaMedicacion, string> = {
  aviso_7: "≤ 7 días de stock",
  aviso_5: "≤ 5 días de stock",
  sin_stock: "Sin stock",
};

const ESTILO_ALERTA: Record<NivelAlertaMedicacion, string> = {
  aviso_7: "bg-amber-100 text-amber-800 border-amber-300",
  aviso_5: "bg-orange-100 text-orange-800 border-orange-300",
  sin_stock: "bg-red-100 text-red-800 border-red-300",
};

function BadgeAlerta({ alerta }: { alerta: AlertaMedicacion }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${ESTILO_ALERTA[alerta.nivel]}`}
      title={
        alerta.dias_restantes !== null
          ? `Quedan ~${alerta.dias_restantes} días de stock`
          : undefined
      }
    >
      {ETIQUETA_ALERTA[alerta.nivel]}
    </span>
  );
}

function EditorStock({
  residenteId,
  medicamento,
}: {
  residenteId: string;
  medicamento: MedicamentoResidente;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(medicamento.cantidad_stock);
  const accionConId = ajustarStock.bind(null, residenteId);
  const [estado, formAction, enviando] = useActionState(accionConId, ESTADO_STOCK_INICIAL);

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => {
          setValor(medicamento.cantidad_stock);
          setEditando(true);
        }}
        className="text-sm font-semibold text-ink underline decoration-dotted decoration-ink-soft/50 hover:decoration-brass"
        title="Ajustar stock manualmente"
      >
        {medicamento.cantidad_stock}
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        setEditando(false);
      }}
      className="flex items-center gap-1"
    >
      <input type="hidden" name="medicamento_id" value={medicamento.id} />
      <input
        type="number"
        name="cantidad_stock"
        min={0}
        value={valor}
        onChange={(e) => setValor(Number(e.target.value))}
        className="w-16 rounded-lg border border-edge bg-panel-deep px-2 py-1 text-xs text-ink focus:border-brass focus:outline-none"
        autoFocus
      />
      <button
        type="submit"
        disabled={enviando}
        className="text-xs font-semibold text-brass hover:text-ink disabled:opacity-50"
      >
        OK
      </button>
      <button
        type="button"
        onClick={() => setEditando(false)}
        className="text-xs text-ink-soft hover:text-ink"
      >
        ✕
      </button>
      {estado.error && <span className="text-xs text-red-700">{estado.error}</span>}
    </form>
  );
}

function FormularioIngreso({
  residenteId,
  medicamentoId,
  ingreso,
  onCerrar,
}: {
  residenteId: string;
  medicamentoId: string;
  ingreso?: IngresoMedicamento;
  onCerrar: () => void;
}) {
  const accion = ingreso ? actualizarIngreso : registrarIngreso;
  const accionConId = accion.bind(null, residenteId);
  const [estado, formAction, enviando] = useActionState(accionConId, ESTADO_INGRESO_INICIAL);

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        onCerrar();
      }}
      className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-edge bg-panel-deep p-3"
    >
      <input type="hidden" name="medicamento_id" value={medicamentoId} />
      {ingreso && <input type="hidden" name="ingreso_id" value={ingreso.id} />}
      <div>
        <label className={ETIQUETA_MIN}>Cantidad recibida</label>
        <input
          type="number"
          name="cantidad"
          min={1}
          required
          defaultValue={ingreso?.cantidad ?? undefined}
          className="w-24 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Lote</label>
        <input
          name="lote"
          defaultValue={ingreso?.lote ?? ""}
          className="w-28 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Vencimiento</label>
        <input
          type="date"
          name="vencimiento"
          defaultValue={ingreso?.vencimiento ?? ""}
          className="rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Entregado por</label>
        <input
          name="entregado_por"
          defaultValue={ingreso?.entregado_por ?? ""}
          placeholder="Familia / obra social"
          className="w-40 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brass px-3 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        {enviando ? "Guardando..." : ingreso ? "Guardar cambios" : "Registrar ingreso"}
      </button>
      <button type="button" onClick={onCerrar} className="text-xs text-ink-soft hover:text-ink">
        Cancelar
      </button>
      {estado.error && <p className="w-full text-xs text-red-700">{estado.error}</p>}
    </form>
  );
}

function FormularioDosis({
  residenteId,
  medicamentoId,
  dosis,
  onCerrar,
}: {
  residenteId: string;
  medicamentoId: string;
  dosis: DosisAdministrada;
  onCerrar: () => void;
}) {
  const accionConId = actualizarDosisAdministrada.bind(null, residenteId);
  const [estado, formAction, enviando] = useActionState(accionConId, ESTADO_DOSIS_INICIAL);

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        onCerrar();
      }}
      className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-edge bg-panel-deep p-3"
    >
      <input type="hidden" name="dosis_id" value={dosis.id} />
      <input type="hidden" name="medicamento_id" value={medicamentoId} />
      <div>
        <label className={ETIQUETA_MIN}>Cantidad</label>
        <input
          type="number"
          name="cantidad"
          min={1}
          required
          defaultValue={dosis.cantidad}
          className="w-20 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Estado</label>
        <select
          name="estado"
          defaultValue={dosis.estado}
          className="rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        >
          <option value="administrado">Administrado</option>
          <option value="omitido">Omitido</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brass px-3 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        {enviando ? "Guardando..." : "Guardar cambios"}
      </button>
      <button type="button" onClick={onCerrar} className="text-xs text-ink-soft hover:text-ink">
        Cancelar
      </button>
      {estado.error && <p className="w-full text-xs text-red-700">{estado.error}</p>}
    </form>
  );
}

function FilaIngreso({
  residenteId,
  medicamentoId,
  ingreso,
  onCambio,
}: {
  residenteId: string;
  medicamentoId: string;
  ingreso: IngresoMedicamento;
  onCambio: () => void;
}) {
  const [editando, setEditando] = useState(false);

  async function borrar() {
    if (!window.confirm("¿Eliminar este ingreso? El stock se ajustará en consecuencia.")) return;
    await eliminarIngreso(residenteId, ingreso.id, medicamentoId);
    onCambio();
  }

  if (editando) {
    return (
      <FormularioIngreso
        residenteId={residenteId}
        medicamentoId={medicamentoId}
        ingreso={ingreso}
        onCerrar={() => {
          setEditando(false);
          onCambio();
        }}
      />
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-t border-edge/60 py-1.5 text-xs">
      <span className="text-ink">
        +{ingreso.cantidad} · {new Date(ingreso.fecha).toLocaleDateString("es-AR")}
        {ingreso.lote && <span className="text-ink-soft"> · Lote {ingreso.lote}</span>}
        {ingreso.vencimiento && (
          <span className="text-ink-soft">
            {" "}
            · Vence {new Date(ingreso.vencimiento).toLocaleDateString("es-AR")}
          </span>
        )}
        {ingreso.entregado_por && <span className="text-ink-soft"> · {ingreso.entregado_por}</span>}
      </span>
      <span className="flex gap-2">
        <button type="button" onClick={() => setEditando(true)} className="text-brass hover:text-ink">
          Editar
        </button>
        <button type="button" onClick={borrar} className="text-red-700 hover:text-red-500">
          Eliminar
        </button>
      </span>
    </li>
  );
}

function FilaDosis({
  residenteId,
  medicamentoId,
  dosis,
  onCambio,
}: {
  residenteId: string;
  medicamentoId: string;
  dosis: DosisAdministrada;
  onCambio: () => void;
}) {
  const [editando, setEditando] = useState(false);

  async function borrar() {
    if (!window.confirm("¿Eliminar este registro? El stock se ajustará en consecuencia.")) return;
    await eliminarDosisAdministrada(residenteId, dosis.id, medicamentoId);
    onCambio();
  }

  if (editando) {
    return (
      <FormularioDosis
        residenteId={residenteId}
        medicamentoId={medicamentoId}
        dosis={dosis}
        onCerrar={() => {
          setEditando(false);
          onCambio();
        }}
      />
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-t border-edge/60 py-1.5 text-xs">
      <span className={dosis.estado === "omitido" ? "text-ink-soft line-through" : "text-ink"}>
        -{dosis.cantidad} · {new Date(dosis.fecha).toLocaleString("es-AR")}
        {dosis.estado === "omitido" && <span className="text-red-700"> · omitido</span>}
      </span>
      <span className="flex gap-2">
        <button type="button" onClick={() => setEditando(true)} className="text-brass hover:text-ink">
          Editar
        </button>
        <button type="button" onClick={borrar} className="text-red-700 hover:text-red-500">
          Eliminar
        </button>
      </span>
    </li>
  );
}

function HistorialMedicamento({
  residenteId,
  medicamentoId,
}: {
  residenteId: string;
  medicamentoId: string;
}) {
  const [ingresos, setIngresos] = useState<IngresoMedicamento[] | null>(null);
  const [dosis, setDosis] = useState<DosisAdministrada[] | null>(null);

  function cargar() {
    Promise.all([listarIngresos(medicamentoId), listarDosisAdministradas(medicamentoId)]).then(
      ([i, d]) => {
        setIngresos(i);
        setDosis(d);
      },
    );
  }

  useEffect(cargar, [medicamentoId]);

  return (
    <div className="mt-2 grid gap-3 rounded-lg border border-edge bg-panel-deep p-3 sm:grid-cols-2">
      <div>
        <p className={ETIQUETA_MIN}>Ingresos registrados</p>
        {ingresos === null ? (
          <p className="text-xs text-ink-soft">Cargando...</p>
        ) : ingresos.length === 0 ? (
          <p className="text-xs text-ink-soft">Sin ingresos registrados.</p>
        ) : (
          <ul>
            {ingresos.map((ing) => (
              <FilaIngreso
                key={ing.id}
                residenteId={residenteId}
                medicamentoId={medicamentoId}
                ingreso={ing}
                onCambio={cargar}
              />
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className={ETIQUETA_MIN}>Dosis administradas (Kardex)</p>
        {dosis === null ? (
          <p className="text-xs text-ink-soft">Cargando...</p>
        ) : dosis.length === 0 ? (
          <p className="text-xs text-ink-soft">Sin dosis registradas.</p>
        ) : (
          <ul>
            {dosis.map((d) => (
              <FilaDosis
                key={d.id}
                residenteId={residenteId}
                medicamentoId={medicamentoId}
                dosis={d}
                onCambio={cargar}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FormularioPrescripcion({
  residenteId,
  medicamento,
  catalogo,
  onCerrar,
}: {
  residenteId: string;
  medicamento: MedicamentoResidente;
  catalogo: CatalogoMedicamento[];
  onCerrar: () => void;
}) {
  const accionConId = actualizarPrescripcion.bind(null, residenteId);
  const [estado, formAction, enviando] = useActionState(accionConId, ESTADO_INICIAL);
  const [nombre, setNombre] = useState(medicamento.nombre);
  const nombresConocidos = [...new Set(catalogo.map((c) => c.nombre))];
  const dosisConocidas = [
    ...new Set(catalogo.filter((c) => c.nombre === nombre && c.dosis).map((c) => c.dosis as string)),
  ];
  const idNombre = `nombre-${medicamento.id}`;
  const idDosis = `dosis-${medicamento.id}`;

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        onCerrar();
      }}
      className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-edge bg-panel-deep p-3"
    >
      <input type="hidden" name="medicamento_id" value={medicamento.id} />
      <div>
        <label className={ETIQUETA_MIN}>Medicamento</label>
        <input
          name="nombre"
          list={idNombre}
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-32 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
        <datalist id={idNombre}>
          {nombresConocidos.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Dosis</label>
        <input
          name="dosis"
          list={idDosis}
          defaultValue={medicamento.dosis ?? ""}
          placeholder="Ej: 50mg"
          className="w-24 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
        <datalist id={idDosis}>
          {dosisConocidas.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Frecuencia</label>
        <input
          name="frecuencia"
          defaultValue={medicamento.frecuencia ?? ""}
          placeholder="Cada 8 horas"
          className="w-32 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className={ETIQUETA_MIN}>Horario</label>
        <input
          name="horario"
          defaultValue={medicamento.horario ?? ""}
          placeholder="08:00, 16:00, 00:00"
          className="w-40 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label
          className={ETIQUETA_MIN}
          title="Unidades consumidas por día, usado para calcular días de stock restante"
        >
          Dosis diaria (unid./día)
        </label>
        <input
          type="number"
          name="dosis_diaria"
          min={0}
          step="0.5"
          defaultValue={medicamento.dosis_diaria ?? ""}
          className="w-28 rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div className="w-full">
        <label className={ETIQUETA_MIN}>Instrucciones</label>
        <input
          name="instrucciones"
          defaultValue={medicamento.instrucciones ?? ""}
          placeholder="Ej: administrar con alimentos"
          className="w-full rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brass px-3 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        {enviando ? "Guardando..." : "Guardar prescripción"}
      </button>
      <button type="button" onClick={onCerrar} className="text-xs text-ink-soft hover:text-ink">
        Cancelar
      </button>
      {estado.error && <p className="w-full text-xs text-red-700">{estado.error}</p>}
    </form>
  );
}

function FilaMedicamento({
  residenteId,
  medicamento,
  alerta,
  catalogo,
  sucursalId,
}: {
  residenteId: string;
  medicamento: MedicamentoResidente;
  alerta: AlertaMedicacion | undefined;
  catalogo: CatalogoMedicamento[];
  sucursalId?: string;
}) {
  const [panel, setPanel] = useState<"ninguno" | "prescripcion" | "ingreso" | "historial">(
    "ninguno",
  );

  async function borrar() {
    if (!window.confirm(`¿Dar de baja "${medicamento.nombre}" del listado?`)) return;
    await eliminarMedicamento(residenteId, medicamento.id);
  }

  function alternar(valor: "prescripcion" | "ingreso" | "historial") {
    setPanel(panel === valor ? "ninguno" : valor);
  }

  return (
    <>
      <tr className="border-t border-edge">
        <td className="px-3 py-2 text-sm text-ink">{medicamento.nombre}</td>
        <td className="px-3 py-2 text-sm text-ink-soft">
          {medicamento.dosis ?? "—"}
          {medicamento.frecuencia && (
            <span className="block text-[0.65rem] text-ink-soft/70">{medicamento.frecuencia}</span>
          )}
        </td>
        <td className="px-3 py-2 text-sm text-ink-soft">{medicamento.horario ?? "—"}</td>
        <td className="px-3 py-2">
          <EditorStock residenteId={residenteId} medicamento={medicamento} />
          {alerta && (
            <div className="mt-1">
              <BadgeAlerta alerta={alerta} />
            </div>
          )}
        </td>
        <td className="px-3 py-2 text-right">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {sucursalId && (
              <BotonDarDosis
                sucursalId={sucursalId}
                residenteId={residenteId}
                medicamentoId={medicamento.id}
                stockActual={medicamento.cantidad_stock}
              />
            )}
            <button
              type="button"
              onClick={() => alternar("prescripcion")}
              className="text-xs text-brass hover:text-ink"
            >
              Prescripción
            </button>
            <button
              type="button"
              onClick={() => alternar("ingreso")}
              className="text-xs text-brass hover:text-ink"
            >
              + Ingreso
            </button>
            <button
              type="button"
              onClick={() => alternar("historial")}
              className="text-xs text-brass hover:text-ink"
            >
              Historial
            </button>
            <button type="button" onClick={borrar} className="text-xs text-red-700 hover:text-red-500">
              Dar de baja
            </button>
          </div>
        </td>
      </tr>
      {panel !== "ninguno" && (
        <tr className="border-t border-edge/60">
          <td colSpan={5} className="px-3 pb-3">
            {panel === "prescripcion" && (
              <FormularioPrescripcion
                residenteId={residenteId}
                medicamento={medicamento}
                catalogo={catalogo}
                onCerrar={() => setPanel("ninguno")}
              />
            )}
            {panel === "ingreso" && (
              <FormularioIngreso
                residenteId={residenteId}
                medicamentoId={medicamento.id}
                onCerrar={() => setPanel("ninguno")}
              />
            )}
            {panel === "historial" && (
              <HistorialMedicamento residenteId={residenteId} medicamentoId={medicamento.id} />
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function FilaMedicamentoInactivo({
  residenteId,
  medicamento,
}: {
  residenteId: string;
  medicamento: MedicamentoResidente;
}) {
  const [reactivando, setReactivando] = useState(false);

  async function reactivar() {
    setReactivando(true);
    await reactivarMedicamento(residenteId, medicamento.id);
    setReactivando(false);
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-t border-edge/60 py-1.5 text-xs">
      <span className="text-ink-soft">
        {medicamento.nombre} {medicamento.dosis && `· ${medicamento.dosis}`}
      </span>
      <button
        type="button"
        onClick={reactivar}
        disabled={reactivando}
        className="text-brass hover:text-ink disabled:opacity-50"
      >
        {reactivando ? "Reactivando..." : "Reactivar"}
      </button>
    </li>
  );
}

export function MedicacionResidente({
  residenteId,
  medicamentos,
  alertas,
  catalogo,
  sucursalId,
}: Props) {
  const accionConId = agregarMedicamento.bind(null, residenteId);
  const [estado, formAction, enviando] = useActionState(accionConId, ESTADO_INICIAL);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const nombresConocidos = [...new Set(catalogo.map((c) => c.nombre))];
  const dosisParaNombreNuevo = [
    ...new Set(
      catalogo.filter((c) => c.nombre === nombreNuevo && c.dosis).map((c) => c.dosis as string),
    ),
  ];

  const medicamentosActivos = medicamentos.filter((m) => m.activo);
  const medicamentosInactivos = medicamentos.filter((m) => !m.activo);
  const alertaPorMedicamento = new Map(alertas.map((a) => [a.medicamento_id, a]));

  return (
    <section className="rounded-2xl border border-edge bg-card p-5 lg:col-span-2 xl:col-span-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-ink">Medicación</h2>
        {alertas.length > 0 && (
          <span className="text-xs font-semibold text-red-700">
            {alertas.length} alerta{alertas.length > 1 ? "s" : ""} de stock activa
            {alertas.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {medicamentosActivos.length === 0 ? (
        <p className="mb-3 text-xs text-ink-soft">Sin medicación cargada.</p>
      ) : (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[0.65rem] font-medium uppercase tracking-wide text-ink-soft">
                <th className="px-3 py-2">Medicamento</th>
                <th className="px-3 py-2">Dosis</th>
                <th className="px-3 py-2">Horario</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {medicamentosActivos.map((m) => (
                <FilaMedicamento
                  key={m.id}
                  residenteId={residenteId}
                  medicamento={m}
                  alerta={alertaPorMedicamento.get(m.id)}
                  catalogo={catalogo}
                  sucursalId={sucursalId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {medicamentosInactivos.length > 0 && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setMostrarInactivos((v) => !v)}
            className="text-xs text-ink-soft hover:text-ink"
          >
            {mostrarInactivos ? "Ocultar" : "Ver"} dados de baja ({medicamentosInactivos.length})
          </button>
          {mostrarInactivos && (
            <ul className="mt-2 rounded-lg border border-edge bg-panel-deep p-3">
              {medicamentosInactivos.map((m) => (
                <FilaMedicamentoInactivo key={m.id} residenteId={residenteId} medicamento={m} />
              ))}
            </ul>
          )}
        </div>
      )}

      <form
        action={async (formData) => {
          await formAction(formData);
          setNombreNuevo("");
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div>
          <label className={ETIQUETA_MIN}>Medicamento</label>
          <input
            name="nombre"
            required
            list="catalogo-nombres"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
            placeholder="Ej: Losartán"
          />
          <datalist id="catalogo-nombres">
            {nombresConocidos.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Dosis</label>
          <input
            name="dosis"
            list="catalogo-dosis-nuevo"
            className="w-24 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
            placeholder="Ej: 50mg"
          />
          <datalist id="catalogo-dosis-nuevo">
            {dosisParaNombreNuevo.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Frecuencia</label>
          <input
            name="frecuencia"
            className="w-32 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
            placeholder="Cada 8 horas"
          />
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Horario</label>
          <input
            name="horario"
            className="w-40 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
            placeholder="08:00, 16:00, 00:00"
          />
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Dosis diaria (unid./día)</label>
          <input
            type="number"
            name="dosis_diaria"
            min={0}
            step="0.5"
            className="w-28 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Stock inicial</label>
          <input
            type="number"
            name="cantidad_stock"
            defaultValue={0}
            className="w-24 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Agregando..." : "+ Agregar"}
        </button>
      </form>
      {estado.error && <p className="mt-2 text-sm text-red-700">{estado.error}</p>}
    </section>
  );
}
