"use client";

import { useRef, useState, useTransition } from "react";
import {
  guardarContratoEditado,
  restaurarContratoOriginal,
} from "@/app/residentes/[id]/contrato/actions";

type Props = {
  residenteId: string;
  puedeEditar: boolean;
  editado: boolean;
  children: React.ReactNode;
};

// Convierte el contenido editado en una lista de párrafos de texto plano.
// Los espacios en blanco para completar a mano se guardan como una línea.
function extraerParrafos(contenedor: HTMLElement): string[] {
  const parrafos: string[] = [];
  for (const hijo of Array.from(contenedor.children)) {
    const texto = (hijo as HTMLElement).innerText ?? "";
    for (const linea of texto.split("\n")) {
      const limpia = linea.replace(/[  ]{5,}/g, " ____________ ").replace(/\s+/g, " ").trim();
      if (limpia) parrafos.push(limpia);
    }
  }
  return parrafos;
}

export function ContratoEditable({ residenteId, puedeEditar, editado, children }: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [editando, setEditando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function guardar() {
    if (!contenedorRef.current) return;
    const parrafos = extraerParrafos(contenedorRef.current);
    iniciar(async () => {
      const r = await guardarContratoEditado(residenteId, parrafos);
      if (r.error) {
        setMensaje(r.error);
      } else {
        window.location.reload();
      }
    });
  }

  function restaurar() {
    if (!window.confirm("¿Descartar los cambios y volver al contrato modelo original?")) return;
    iniciar(async () => {
      const r = await restaurarContratoOriginal(residenteId);
      if (r.error) setMensaje(r.error);
      else window.location.reload();
    });
  }

  return (
    <>
      {puedeEditar && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-edge bg-panel-deep p-3 print:hidden">
          {editando ? (
            <>
              <p className="w-full text-xs text-ink-soft">
                Hacé clic en el texto para modificarlo. Podés imprimir directamente o guardar los cambios
                para que queden en este residente.
              </p>
              <button
                type="button"
                onClick={guardar}
                disabled={pendiente}
                className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
              >
                {pendiente ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg border border-edge px-4 py-2 text-sm text-ink hover:border-brass"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditando(true);
                setMensaje(null);
              }}
              className="rounded-lg border border-brass px-4 py-2 text-sm font-semibold text-brass hover:bg-brass/10"
            >
              Editar contrato
            </button>
          )}
          {editado && !editando && (
            <>
              <span className="text-xs text-ink-soft">Este contrato tiene cambios respecto del modelo.</span>
              <button
                type="button"
                onClick={restaurar}
                disabled={pendiente}
                className="text-xs text-red-700 underline underline-offset-2 hover:text-red-500"
              >
                Volver al modelo original
              </button>
            </>
          )}
          {mensaje && <p className="w-full text-xs text-ink-soft">{mensaje}</p>}
        </div>
      )}

      <div
        ref={contenedorRef}
        contentEditable={editando}
        suppressContentEditableWarning
        className={`space-y-5 ${
          editando ? "rounded-lg outline-2 outline-offset-8 outline-dashed outline-brass/60" : ""
        }`}
      >
        {children}
      </div>
    </>
  );
}
