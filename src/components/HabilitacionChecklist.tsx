"use client";

import { useActionState, useState } from "react";
import {
  eliminarDocumentoHabilitacion,
  subirDocumentoHabilitacion,
  type ActualizarHabilitacionEstado,
  type DocumentoConUrl,
} from "@/app/sucursales/[id]/legales/habilitacion/actions";
import type { ItemHabilitacion } from "@/lib/types";

type Props = {
  sucursalId: string;
  items: ItemHabilitacion[];
  documentos: DocumentoConUrl[];
};

const ESTADO_INICIAL: ActualizarHabilitacionEstado = { error: null };

function EditorItem({
  sucursalId,
  itemId,
  documento,
  onCerrar,
}: {
  sucursalId: string;
  itemId: string;
  documento: DocumentoConUrl | undefined;
  onCerrar: () => void;
}) {
  const accionConId = subirDocumentoHabilitacion.bind(null, sucursalId);
  const [estado, formAction, enviando] = useActionState(accionConId, ESTADO_INICIAL);

  async function borrar() {
    if (!documento) return;
    if (!window.confirm("¿Eliminar la carga de este ítem? Volverá a mostrarse como sin documentación."))
      return;
    await eliminarDocumentoHabilitacion(sucursalId, documento.id, documento.archivo_url);
    onCerrar();
  }

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        onCerrar();
      }}
      className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-edge bg-panel-deep p-3"
    >
      <input type="hidden" name="item_id" value={itemId} />
      <div>
        <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
          Archivo (PDF)
        </label>
        <input
          type="file"
          name="archivo"
          accept="application/pdf,image/*"
          className="text-xs text-ink"
        />
      </div>
      <div>
        <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
          Fecha de presentación
        </label>
        <input
          type="date"
          name="fecha_presentacion"
          defaultValue={documento?.fecha_presentacion ?? ""}
          className="rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div className="min-w-[180px] flex-1">
        <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
          Notas
        </label>
        <input
          name="notas"
          defaultValue={documento?.notas ?? ""}
          placeholder="Ej: vence en marzo 2027"
          className="w-full rounded-lg border border-edge bg-panel px-2 py-1.5 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brass px-3 py-1.5 text-xs font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        {enviando ? "Guardando..." : "Guardar"}
      </button>
      {documento && (
        <button type="button" onClick={borrar} className="text-xs text-red-700 hover:text-red-500">
          Eliminar carga
        </button>
      )}
      <button type="button" onClick={onCerrar} className="text-xs text-ink-soft hover:text-ink">
        Cancelar
      </button>
      {estado.error && <p className="w-full text-xs text-red-700">{estado.error}</p>}
    </form>
  );
}

function FilaItem({
  sucursalId,
  item,
  documento,
}: {
  sucursalId: string;
  item: ItemHabilitacion;
  documento: DocumentoConUrl | undefined;
}) {
  const [editando, setEditando] = useState(false);

  const actualizado = !!documento && (!!documento.archivo_url || !!documento.fecha_presentacion);

  return (
    <li className="border-t border-edge/60 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="max-w-2xl text-sm text-ink">{item.descripcion}</p>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${
              actualizado
                ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                : "border-red-300 bg-red-100 text-red-800"
            }`}
          >
            {actualizado ? "Actualizado" : "Sin documentación"}
          </span>
          <button
            type="button"
            onClick={() => setEditando((v) => !v)}
            className="text-xs text-brass hover:text-ink"
          >
            {documento ? "Editar" : "Cargar"}
          </button>
        </div>
      </div>

      {actualizado && !editando && (
        <p className="mt-1 text-xs text-ink-soft">
          {documento?.fecha_presentacion &&
            `Presentado el ${new Date(documento.fecha_presentacion).toLocaleDateString("es-AR")}`}
          {documento?.nombre_archivo && (
            <>
              {documento.fecha_presentacion && " · "}
              {documento.urlFirmada ? (
                <a
                  href={documento.urlFirmada}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                >
                  {documento.nombre_archivo}
                </a>
              ) : (
                documento.nombre_archivo
              )}
            </>
          )}
          {documento?.notas && (
            <>
              {(documento.fecha_presentacion || documento.nombre_archivo) && " · "}
              {documento.notas}
            </>
          )}
        </p>
      )}

      {editando && (
        <EditorItem
          sucursalId={sucursalId}
          itemId={item.id}
          documento={documento}
          onCerrar={() => setEditando(false)}
        />
      )}
    </li>
  );
}

export function HabilitacionChecklist({ sucursalId, items, documentos }: Props) {
  const documentoPorItem = new Map(documentos.map((d) => [d.item_id, d]));

  const categorias = [...new Set(items.map((i) => i.categoria))];

  const total = items.length;
  const actualizados = items.filter((i) => {
    const d = documentoPorItem.get(i.id);
    return !!d && (!!d.archivo_url || !!d.fecha_presentacion);
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-edge bg-card p-4">
        <p className="text-sm text-ink">
          <span className="font-semibold text-ink">{actualizados}</span> de{" "}
          <span className="font-semibold text-ink">{total}</span> requisitos actualizados
        </p>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-panel-deep">
          <div
            className="h-full bg-brass"
            style={{ width: `${total > 0 ? (actualizados / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {categorias.map((categoria) => (
        <section key={categoria} className="rounded-2xl border border-edge bg-card p-5">
          <h3 className="mb-1 font-display text-sm font-semibold text-ink">{categoria}</h3>
          <ul>
            {items
              .filter((i) => i.categoria === categoria)
              .map((item) => (
                <FilaItem
                  key={item.id}
                  sucursalId={sucursalId}
                  item={item}
                  documento={documentoPorItem.get(item.id)}
                />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
