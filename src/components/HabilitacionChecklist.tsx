"use client";

import { useActionState, useEffect, useState } from "react";
import {
  eliminarDocumentoHabilitacion,
  subirDocumentoHabilitacion,
  type ActualizarHabilitacionEstado,
  type DocumentoConUrl,
} from "@/app/sucursales/[id]/legales/habilitacion/actions";
import { BotonMailDocumentos } from "@/components/BotonMailDocumentos";
import { VisorDocumento } from "@/components/VisorDocumento";
import type { ItemHabilitacion } from "@/lib/types";

type Props = {
  sucursalId: string;
  items: ItemHabilitacion[];
  documentos: DocumentoConUrl[];
};

const ESTADO_INICIAL: ActualizarHabilitacionEstado = { error: null };

// Vercel corta los envíos de más de 4,5 MB antes de llegar al servidor: se avisa antes de subir.
const MAX_BYTES = 4 * 1024 * 1024;
const TIPOS_ACEPTADOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function validarArchivo(archivo: FormDataEntryValue | null): string | null {
  if (!(archivo instanceof File) || archivo.size === 0) return null;
  if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
    return "Ese tipo de archivo no se acepta. Subí un PDF o una foto JPG/PNG.";
  }
  if (archivo.size > MAX_BYTES) {
    const mb = (archivo.size / 1024 / 1024).toFixed(1);
    return `El archivo pesa ${mb} MB y el máximo es 4 MB. Comprimilo (por ejemplo en ilovepdf.com) o escanealo en menor calidad.`;
  }
  return null;
}

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
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);

  // Se cierra solo si guardó bien; si hubo error queda abierto mostrándolo.
  useEffect(() => {
    if (estado.guardado) onCerrar();
  }, [estado, onCerrar]);

  async function borrar() {
    if (!documento) return;
    if (!window.confirm("¿Eliminar la carga de este ítem? Volverá a mostrarse como sin documentación."))
      return;
    await eliminarDocumentoHabilitacion(sucursalId, documento.id, documento.archivo_url);
    onCerrar();
  }

  return (
    <form
      action={(formData) => {
        const problema = validarArchivo(formData.get("archivo"));
        setErrorArchivo(problema);
        if (!problema) formAction(formData);
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
      {(errorArchivo ?? estado.error) && (
        <p className="w-full text-xs text-red-700">{errorArchivo ?? estado.error}</p>
      )}
    </form>
  );
}

function FilaItem({
  sucursalId,
  item,
  documento,
  seleccionado,
  onSeleccionar,
}: {
  seleccionado: boolean;
  onSeleccionar: () => void;
  sucursalId: string;
  item: ItemHabilitacion;
  documento: DocumentoConUrl | undefined;
}) {
  const [editando, setEditando] = useState(false);

  const actualizado = !!documento && (!!documento.archivo_url || !!documento.fecha_presentacion);

  return (
    <li className="border-t border-edge/60 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <label className="flex max-w-2xl items-start gap-2 text-sm text-ink">
          {documento?.archivo_url ? (
            <input
              type="checkbox"
              checked={seleccionado}
              onChange={onSeleccionar}
              title="Seleccionar para enviar por mail"
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[var(--color-brass)]"
            />
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}
          {item.descripcion}
        </label>
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
          {documento?.urlFirmada && (
            <VisorDocumento
              url={documento.urlFirmada}
              nombre={documento.nombre_archivo ?? documento.archivo_url ?? ""}
              titulo={item.descripcion}
            />
          )}
          {documento?.archivo_url && (
            <BotonMailDocumentos
              sucursalId={sucursalId}
              documentoIds={[documento.id]}
              etiqueta="Enviar por mail"
            />
          )}
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

  // Selección de documentos (con archivo) para mandar varios juntos en un mail.
  const conArchivo = documentos.filter((d) => d.archivo_url).map((d) => d.id);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  function alternar(id: string) {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

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

      {conArchivo.length > 0 && (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-edge bg-card p-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-ink">
            <span>
              <span className="font-semibold">{seleccionados.size}</span> documento
              {seleccionados.size === 1 ? "" : "s"} seleccionado{seleccionados.size === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={() => setSeleccionados(new Set(conArchivo))}
              className="text-xs text-brass hover:text-ink"
            >
              Seleccionar todos
            </button>
            {seleccionados.size > 0 && (
              <button
                type="button"
                onClick={() => setSeleccionados(new Set())}
                className="text-xs text-ink-soft hover:text-ink"
              >
                Quitar selección
              </button>
            )}
          </div>
          {seleccionados.size > 0 ? (
            <BotonMailDocumentos
              sucursalId={sucursalId}
              documentoIds={[...seleccionados]}
              etiqueta={`Enviar seleccionados por mail (${seleccionados.size})`}
              destacado
            />
          ) : (
            <p className="text-xs text-ink-soft">Tildá los documentos que quieras mandar juntos en un mail.</p>
          )}
        </div>
      )}

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
                  seleccionado={seleccionados.has(documentoPorItem.get(item.id)?.id ?? "")}
                  onSeleccionar={() => {
                    const id = documentoPorItem.get(item.id)?.id;
                    if (id) alternar(id);
                  }}
                />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
