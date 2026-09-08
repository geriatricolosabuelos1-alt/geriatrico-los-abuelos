"use client";

import { useRef, useState, useTransition } from "react";
import {
  asignarFoto,
  listarFotosGaleria,
  subirFotoGaleria,
  type FotoGaleria,
} from "@/app/residentes/[id]/legajo/fotos-actions";

type Props = {
  residenteId: string;
  sucursalId: string;
  fotoActual: string | null;
};

export function FotoPicker({ residenteId, sucursalId, fotoActual }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [galeria, setGaleria] = useState<FotoGaleria[]>([]);
  const [cargandoGaleria, setCargandoGaleria] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foto, setFoto] = useState(fotoActual);
  const [, startTransition] = useTransition();
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  async function abrirGaleria() {
    setAbierto(true);
    setCargandoGaleria(true);
    const fotos = await listarFotosGaleria();
    setGaleria(fotos);
    setCargandoGaleria(false);
  }

  async function elegirFoto(url: string) {
    setFoto(url);
    setAbierto(false);
    startTransition(async () => {
      const resultado = await asignarFoto(residenteId, sucursalId, url);
      if (resultado.error) setError(resultado.error);
    });
  }

  async function quitarFoto() {
    setFoto(null);
    setAbierto(false);
    startTransition(async () => {
      const resultado = await asignarFoto(residenteId, sucursalId, null);
      if (resultado.error) setError(resultado.error);
    });
  }

  async function manejarSubida(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setSubiendo(true);
    setError(null);

    const formData = new FormData();
    formData.append("archivo", archivo);
    const resultado = await subirFotoGaleria({ error: null, url: null }, formData);

    setSubiendo(false);
    if (inputArchivoRef.current) inputArchivoRef.current.value = "";

    if (resultado.error) {
      setError(resultado.error);
      return;
    }

    if (resultado.url) {
      setGaleria((prev) => [{ nombre: "nueva", url: resultado.url! }, ...prev]);
      await elegirFoto(resultado.url);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-32 w-32 overflow-hidden rounded-full border-2 border-edge bg-panel-deep">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="Foto del residente" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-ink-soft">
            ?
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={abrirGaleria}
        className="rounded-full border border-edge px-4 py-1.5 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink"
      >
        {foto ? "Cambiar foto" : "Elegir foto"}
      </button>

      {error && <p className="text-xs text-red-700">{error}</p>}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-edge bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-ink">
                Elegir foto
              </h3>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="text-sm text-ink-soft hover:text-ink"
              >
                Cerrar
              </button>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <label className="cursor-pointer rounded-full bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90">
                {subiendo ? "Subiendo..." : "+ Subir foto nueva"}
                <input
                  ref={inputArchivoRef}
                  type="file"
                  accept="image/*"
                  onChange={manejarSubida}
                  disabled={subiendo}
                  className="hidden"
                />
              </label>
              {foto && (
                <button
                  type="button"
                  onClick={quitarFoto}
                  className="text-xs text-red-700 underline decoration-red-600/40 underline-offset-2 hover:text-red-500"
                >
                  Quitar foto actual
                </button>
              )}
            </div>

            {cargandoGaleria ? (
              <p className="text-sm text-ink-soft">Cargando...</p>
            ) : galeria.length === 0 ? (
              <p className="text-sm text-ink-soft">Todavía no hay fotos en la galería.</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {galeria.map((item) => (
                  <button
                    key={item.url}
                    type="button"
                    onClick={() => elegirFoto(item.url)}
                    className="aspect-square overflow-hidden rounded-lg border-2 border-edge hover:border-brass"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
