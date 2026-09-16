"use client";

import { useActionState, useState } from "react";
import { eliminarMenuSemanal, guardarMenuSemanal } from "@/app/sucursales/[id]/nutricion/actions";
import { ExportarPdfMenuSemanal } from "@/components/ExportarPdfMenuSemanal";
import type { MenuSemanal } from "@/lib/types";

type Estado = { error: string | null };
const INICIAL: Estado = { error: null };

type Props = {
  sucursalId: string;
  sucursalNombre: string;
  menus: MenuSemanal[];
};

const DIAS: { valor: string; label: string }[] = [
  { valor: "lunes", label: "Lunes" },
  { valor: "martes", label: "Martes" },
  { valor: "miercoles", label: "Miércoles" },
  { valor: "jueves", label: "Jueves" },
  { valor: "viernes", label: "Viernes" },
  { valor: "sabado", label: "Sábado" },
  { valor: "domingo", label: "Domingo" },
];

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";

function FilaGrid({ prefijo, label }: { prefijo: string; label: string }) {
  return (
    <tr className="border-t border-edge">
      <td className="whitespace-nowrap px-2 py-1.5 text-xs font-medium text-ink-soft">{label}</td>
      {DIAS.map((d) => (
        <td key={d.valor} className="px-1 py-1">
          <input
            name={`${prefijo}_${d.valor}`}
            className="w-32 rounded-md border border-edge bg-panel px-1.5 py-1 text-xs text-ink focus:border-brass focus:outline-none"
          />
        </td>
      ))}
    </tr>
  );
}

function FormularioMenu({ sucursalId, onCerrar }: { sucursalId: string; onCerrar: () => void }) {
  const accion = guardarMenuSemanal.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accion, INICIAL);

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        onCerrar();
      }}
      className="space-y-4 rounded-2xl border border-edge bg-card p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={ETIQUETA_MIN}>Semana desde</label>
          <input
            type="date"
            name="semana_desde"
            required
            className="rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Semana hasta</label>
          <input
            type="date"
            name="semana_hasta"
            required
            className="rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Matrícula (nutricionista)</label>
          <input
            name="matricula"
            className="rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-ink">Desayunos y meriendas</p>
        <div className="overflow-x-auto">
          <table className="text-left">
            <thead>
              <tr>
                <th></th>
                {DIAS.map((d) => (
                  <th key={d.valor} className="px-1 py-1 text-[0.6rem] font-medium uppercase text-ink-soft">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <FilaGrid prefijo="desayuno" label="Desayuno" />
              <FilaGrid prefijo="merienda" label="Merienda" />
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-ink">Almuerzos, colaciones y cenas</p>
        <div className="overflow-x-auto">
          <table className="text-left">
            <thead>
              <tr>
                <th></th>
                {DIAS.map((d) => (
                  <th key={d.valor} className="px-1 py-1 text-[0.6rem] font-medium uppercase text-ink-soft">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <FilaGrid prefijo="almuerzo" label="Almuerzo" />
              <FilaGrid prefijo="colacion" label="Colación" />
              <FilaGrid prefijo="cena" label="Cena" />
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-ink">Postres</p>
        <div className="overflow-x-auto">
          <table className="text-left">
            <thead>
              <tr>
                <th></th>
                {DIAS.map((d) => (
                  <th key={d.valor} className="px-1 py-1 text-[0.6rem] font-medium uppercase text-ink-soft">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <FilaGrid prefijo="postre_almuerzo" label="Post. almuerzo" />
              <FilaGrid prefijo="postre_cena" label="Post. cena" />
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className={ETIQUETA_MIN}>Pacientes con SNG</label>
          <input
            type="number"
            name="pacientes_sng"
            min={0}
            defaultValue={0}
            className="w-full rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Vegetarianos</label>
          <input
            type="number"
            name="pacientes_vegetarianos"
            min={0}
            defaultValue={0}
            className="w-full rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Celíacos</label>
          <input
            type="number"
            name="pacientes_celiacos"
            min={0}
            defaultValue={0}
            className="w-full rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>
        <div>
          <label className={ETIQUETA_MIN}>Diabéticos</label>
          <input
            type="number"
            name="pacientes_diabeticos"
            min={0}
            defaultValue={0}
            className="w-full rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className={ETIQUETA_MIN}>Observaciones</label>
        <input
          name="observaciones"
          className="w-full rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Guardar y firmar planilla"}
        </button>
        <button type="button" onClick={onCerrar} className="text-xs text-ink-soft hover:text-ink">
          Cancelar
        </button>
        {estado.error && <span className="text-xs text-red-700">{estado.error}</span>}
      </div>
    </form>
  );
}

function VistaMenu({ menu }: { menu: MenuSemanal }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink">
        Semana desde {new Date(menu.semana_desde + "T00:00:00").toLocaleDateString("es-AR")} al{" "}
        {new Date(menu.semana_hasta + "T00:00:00").toLocaleDateString("es-AR")}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[0.6rem] uppercase text-ink-soft">
              <th></th>
              {DIAS.map((d) => (
                <th key={d.valor} className="px-2 py-1">
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["Desayuno", menu.contenido.desayunos],
                ["Merienda", menu.contenido.meriendas],
                ["Almuerzo", menu.contenido.almuerzos],
                ["Colación", menu.contenido.colaciones],
                ["Cena", menu.contenido.cenas],
                ["Post. almuerzo", menu.contenido.postres_almuerzo],
                ["Post. cena", menu.contenido.postres_cena],
              ] as [string, Record<string, string>][]
            ).map(([label, bloque]) => (
              <tr key={label} className="border-t border-edge">
                <td className="px-2 py-1 font-medium text-ink-soft">{label}</td>
                {DIAS.map((d) => (
                  <td key={d.valor} className="px-2 py-1 text-ink">
                    {bloque?.[d.valor] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-soft">
        SNG: {menu.pacientes_sng} · Vegetarianos: {menu.pacientes_vegetarianos} · Celíacos: {menu.pacientes_celiacos} ·
        Diabéticos: {menu.pacientes_diabeticos}
      </p>
      {menu.observaciones && <p className="text-xs text-ink-soft">Obs.: {menu.observaciones}</p>}
      {menu.matricula && <p className="text-xs text-ink-soft">Matrícula: {menu.matricula}</p>}
    </div>
  );
}

export function MenuSemanalClient({ sucursalId, sucursalNombre, menus }: Props) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(menus[0]?.id ?? null);

  async function borrar(id: string) {
    if (!window.confirm("¿Eliminar esta planilla?")) return;
    await eliminarMenuSemanal(sucursalId, id);
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setMostrarForm((v) => !v)}
        className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90"
      >
        {mostrarForm ? "Cerrar formulario" : "+ Nueva planilla semanal"}
      </button>

      {mostrarForm && <FormularioMenu sucursalId={sucursalId} onCerrar={() => setMostrarForm(false)} />}

      <div className="space-y-3">
        {menus.map((m) => (
          <div key={m.id} className="rounded-2xl border border-edge bg-card p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setExpandido(expandido === m.id ? null : m.id)}
                className="text-sm font-semibold text-ink hover:text-brass"
              >
                Semana {new Date(m.semana_desde + "T00:00:00").toLocaleDateString("es-AR")} —{" "}
                {new Date(m.semana_hasta + "T00:00:00").toLocaleDateString("es-AR")}
              </button>
              <div className="flex items-center gap-3">
                {expandido === m.id && <ExportarPdfMenuSemanal menu={m} sucursalNombre={sucursalNombre} />}
                <button
                  type="button"
                  onClick={() => borrar(m.id)}
                  className="text-xs text-red-700 hover:text-red-500"
                >
                  Eliminar
                </button>
              </div>
            </div>
            {expandido === m.id && <VistaMenu menu={m} />}
          </div>
        ))}
        {menus.length === 0 && !mostrarForm && (
          <p className="text-sm text-ink-soft">Todavía no cargaste ninguna planilla semanal.</p>
        )}
      </div>
    </div>
  );
}
