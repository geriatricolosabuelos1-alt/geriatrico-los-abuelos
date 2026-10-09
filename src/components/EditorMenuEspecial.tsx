"use client";

import { useState } from "react";
import { guardarMenuEspecial } from "@/app/sucursales/[id]/nutricion/menu-especial/actions";
import {
  DIAS_MENU,
  MENU_ESPECIAL_BASE,
  type ContenidoMenuEspecial,
  type MenuEspecial,
  type PacienteMenuEspecial,
} from "@/lib/menuEspecial";

const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none";
const ETIQUETA = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";

function hoy(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Mendoza" }).format(new Date());
}

// Tarjeta de una ficha: muestra la hoja (children) y permite editarla, imprimirla y asignar pacientes.
export function TarjetaMenuEspecial({
  sucursalId,
  menu,
  residentes,
  puedeEditar,
  children,
}: {
  sucursalId: string;
  menu: MenuEspecial;
  residentes: { id: string; nombre: string }[];
  puedeEditar: boolean;
  children: React.ReactNode;
}) {
  const [editando, setEditando] = useState(false);
  const [abiertoEn, setAbiertoEn] = useState(0);

  return (
    <section className="space-y-3 rounded-2xl border border-edge bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">{menu.contenido.titulo}</h2>
          <p className="text-xs text-ink-soft">
            {menu.pacientes.length} paciente{menu.pacientes.length === 1 ? "" : "s"} con esta indicación
            {menu.updated_at &&
              ` · actualizada el ${new Date(menu.updated_at).toLocaleDateString("es-AR", {
                timeZone: "America/Argentina/Mendoza",
              })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/sucursales/${sucursalId}/nutricion/menu-especial/imprimir?tipo=${menu.tipo}`}
            className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
          >
            Imprimir
          </a>
          {puedeEditar && (
            <button
              type="button"
              onClick={() => {
                setAbiertoEn((n) => n + 1);
                setEditando((v) => !v);
              }}
              className="rounded-lg bg-brass px-3 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90"
            >
              {editando ? "Cancelar" : "Editar"}
            </button>
          )}
        </div>
      </div>
      {editando ? (
        <EditorMenuEspecial
          key={abiertoEn}
          sucursalId={sucursalId}
          menu={menu}
          residentes={residentes}
          onCerrar={() => setEditando(false)}
        />
      ) : (
        <div className="rounded-xl border border-edge bg-white p-5">{children}</div>
      )}
    </section>
  );
}

function EditorMenuEspecial({
  sucursalId,
  menu,
  residentes,
  onCerrar,
}: {
  sucursalId: string;
  menu: MenuEspecial;
  residentes: { id: string; nombre: string }[];
  onCerrar: () => void;
}) {
  const [c, setC] = useState<ContenidoMenuEspecial>(menu.contenido);
  const [pacientes, setPacientes] = useState<PacienteMenuEspecial[]>(menu.pacientes);
  const [nuevoResidente, setNuevoResidente] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState(hoy());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actualizar = <K extends keyof ContenidoMenuEspecial>(k: K, v: ContenidoMenuEspecial[K]) =>
    setC((prev) => ({ ...prev, [k]: v }));
  const disponibles = residentes.filter((r) => !pacientes.some((p) => p.residente_id === r.id));

  async function guardar() {
    setGuardando(true);
    setError(null);
    const limpio: ContenidoMenuEspecial = {
      ...c,
      colaciones: c.colaciones.map((x) => x.trim()).filter(Boolean),
      reglas: c.reglas
        .map((r) => ({ contiene: r.contiene.trim(), indicaciones: r.indicaciones.map((x) => x.trim()).filter(Boolean) }))
        .filter((r) => r.contiene || r.indicaciones.length > 0),
    };
    const r = await guardarMenuEspecial(sucursalId, menu.tipo, limpio, pacientes);
    setGuardando(false);
    if (r.error) setError(r.error);
    else onCerrar();
  }

  return (
    <div className="space-y-5 rounded-xl border border-edge bg-panel-deep/40 p-4">
      <div>
        <label className={ETIQUETA}>Título</label>
        <input value={c.titulo} onChange={(e) => actualizar("titulo", e.target.value)} className={CAMPO} />
      </div>
      <div>
        <label className={ETIQUETA}>Descripción</label>
        <textarea
          rows={4}
          value={c.descripcion}
          onChange={(e) => actualizar("descripcion", e.target.value)}
          className={CAMPO}
        />
      </div>
      <div>
        <label className={ETIQUETA}>Nota destacada (opcional)</label>
        <input value={c.nota} onChange={(e) => actualizar("nota", e.target.value)} className={CAMPO} />
      </div>

      <div>
        <p className={ETIQUETA}>Pacientes con esta indicación</p>
        <ul className="mb-2 space-y-1">
          {pacientes.map((p) => (
            <li key={p.residente_id} className="flex flex-wrap items-center gap-2 text-sm text-ink">
              <span className="min-w-48 font-medium">{p.nombre}</span>
              <input
                type="date"
                value={p.fecha}
                onChange={(e) =>
                  setPacientes((lista) =>
                    lista.map((x) => (x.residente_id === p.residente_id ? { ...x, fecha: e.target.value } : x)),
                  )
                }
                className="rounded-lg border border-edge bg-panel-deep px-2 py-1 text-xs text-ink"
              />
              <button
                type="button"
                onClick={() => setPacientes((lista) => lista.filter((x) => x.residente_id !== p.residente_id))}
                className="text-xs text-red-700 hover:text-red-500"
              >
                Quitar
              </button>
            </li>
          ))}
          {pacientes.length === 0 && <li className="text-xs text-ink-soft">Ninguno todavía.</li>}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={nuevoResidente}
            onChange={(e) => setNuevoResidente(e.target.value)}
            className="rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink"
          >
            <option value="">Elegí un residente...</option>
            {disponibles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={nuevaFecha}
            onChange={(e) => setNuevaFecha(e.target.value)}
            className="rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink"
          />
          <button
            type="button"
            disabled={!nuevoResidente}
            onClick={() => {
              const r = residentes.find((x) => x.id === nuevoResidente);
              if (!r) return;
              setPacientes((lista) => [...lista, { residente_id: r.id, nombre: r.nombre, fecha: nuevaFecha }]);
              setNuevoResidente("");
            }}
            className="rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-ink hover:border-brass disabled:opacity-40"
          >
            + Agregar
          </button>
        </div>
      </div>

      <div>
        <p className={ETIQUETA}>Desayunos y meriendas</p>
        <div className="overflow-x-auto">
          <table className="text-left">
            <thead>
              <tr>
                <th />
                {DIAS_MENU.map((d) => (
                  <th key={d.valor} className="px-1 py-1 text-[0.6rem] font-medium uppercase text-ink-soft">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["desayunos", "Desayuno"],
                  ["meriendas", "Merienda"],
                ] as const
              ).map(([clave, etiqueta]) => (
                <tr key={clave}>
                  <td className="pr-2 text-xs font-medium text-ink-soft">{etiqueta}</td>
                  {DIAS_MENU.map((d) => (
                    <td key={d.valor} className="p-1">
                      <textarea
                        rows={3}
                        value={c[clave][d.valor] ?? ""}
                        onChange={(e) => actualizar(clave, { ...c[clave], [d.valor]: e.target.value })}
                        className="w-36 rounded-md border border-edge bg-panel px-1.5 py-1 text-xs text-ink focus:border-brass focus:outline-none"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <label className={ETIQUETA}>Colaciones (una por renglón)</label>
        <textarea
          rows={3}
          value={c.colaciones.join("\n")}
          onChange={(e) => actualizar("colaciones", e.target.value.split("\n"))}
          className={CAMPO}
        />
      </div>

      <div>
        <p className={ETIQUETA}>Almuerzos y cenas: si el menú general contiene… → indicaciones (una por renglón)</p>
        <div className="space-y-2">
          {c.reglas.map((r, i) => (
            <div key={i} className="flex flex-wrap items-start gap-2">
              <input
                value={r.contiene}
                onChange={(e) =>
                  actualizar(
                    "reglas",
                    c.reglas.map((x, j) => (j === i ? { ...x, contiene: e.target.value } : x)),
                  )
                }
                placeholder="Ej: Pastas"
                className="w-48 rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink"
              />
              <textarea
                rows={Math.max(2, r.indicaciones.length)}
                value={r.indicaciones.join("\n")}
                onChange={(e) =>
                  actualizar(
                    "reglas",
                    c.reglas.map((x, j) => (j === i ? { ...x, indicaciones: e.target.value.split("\n") } : x)),
                  )
                }
                className="min-w-64 flex-1 rounded-lg border border-edge bg-panel-deep px-2 py-1.5 text-sm text-ink"
              />
              <button
                type="button"
                onClick={() => actualizar("reglas", c.reglas.filter((_, j) => j !== i))}
                className="text-xs text-red-700 hover:text-red-500"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => actualizar("reglas", [...c.reglas, { contiene: "", indicaciones: [] }])}
          className="mt-2 rounded-lg border border-edge px-3 py-1.5 text-xs font-medium text-ink hover:border-brass"
        >
          + Agregar fila
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar ficha"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("¿Volver al contenido original de la ficha? Los pacientes se mantienen.")) {
              setC(MENU_ESPECIAL_BASE[menu.tipo]);
            }
          }}
          className="text-xs text-ink-soft hover:text-ink"
        >
          Volver al contenido original
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
