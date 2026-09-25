"use client";

import { useActionState, useRef, useState } from "react";
import {
  eliminarLibreta,
  guardarLibreta,
  leerLibretaConIA,
  type EmpleadoConLibreta,
} from "@/app/sucursales/[id]/legales/libretas-actions";

type Estado = { error: string | null };
const INICIAL: Estado = { error: null };

const DIAS_AVISO = 30;
const ANCHO_MAXIMO = 1600;

const ETIQUETA_MIN = "mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft";
const CAMPO =
  "w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none";

type Props = {
  sucursalId: string;
  empleados: EmpleadoConLibreta[];
};

function diasParaVencer(fecha: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(fecha + "T00:00:00").getTime() - hoy.getTime()) / 86_400_000);
}

function formatearFecha(fecha: string | null): string {
  return fecha ? new Date(fecha + "T00:00:00").toLocaleDateString("es-AR") : "—";
}

function soloDigitos(valor: string | null): string {
  return (valor ?? "").replace(/\D/g, "");
}

async function comprimirImagen(archivo: File): Promise<File> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, ANCHO_MAXIMO / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const contexto = canvas.getContext("2d");
  if (!contexto) return archivo;
  contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
  if (!blob) return archivo;
  return new File([blob], archivo.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

function EstadoLibreta({ empleado }: { empleado: EmpleadoConLibreta }) {
  if (!empleado.libreta) {
    return (
      <span className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[0.65rem] font-semibold text-red-800">
        Sin libreta
      </span>
    );
  }
  const dias = diasParaVencer(empleado.libreta.fecha_vencimiento);
  if (dias < 0) {
    return (
      <span className="alerta-pulso rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[0.65rem] font-semibold text-red-800">
        Vencida hace {-dias} día{dias === -1 ? "" : "s"}
      </span>
    );
  }
  if (dias <= DIAS_AVISO) {
    return (
      <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-800">
        Vence en {dias} día{dias === 1 ? "" : "s"} — renovar
      </span>
    );
  }
  return (
    <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-800">
      Vigente
    </span>
  );
}

export function LibretasSanitariasClient({ sucursalId, empleados }: Props) {
  const accion = guardarLibreta.bind(null, sucursalId);
  const [estado, formAction, guardando] = useActionState(accion, INICIAL);

  const formRef = useRef<HTMLFormElement>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [archivoListo, setArchivoListo] = useState<File | null>(null);
  const [empleadoId, setEmpleadoId] = useState("");
  const [numero, setNumero] = useState("");
  const [emision, setEmision] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [emisor, setEmisor] = useState("");

  function limpiar() {
    setArchivoListo(null);
    setEmpleadoId("");
    setNumero("");
    setEmision("");
    setVencimiento("");
    setEmisor("");
    setAviso(null);
    formRef.current?.reset();
  }

  async function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    if (!original) return;

    setLeyendo(true);
    setAviso(null);

    const archivo =
      original.type === "application/pdf" ? original : await comprimirImagen(original);
    setArchivoListo(archivo);

    const datos = new FormData();
    datos.set("archivo", archivo);
    const leido = await leerLibretaConIA(datos);

    if (leido.error) {
      setAviso(`${leido.error} Completá los datos a mano.`);
    } else {
      if (leido.numero) setNumero(leido.numero);
      if (leido.fecha_emision) setEmision(leido.fecha_emision);
      if (leido.fecha_vencimiento) setVencimiento(leido.fecha_vencimiento);
      if (leido.emisor) setEmisor(leido.emisor);

      // Intenta reconocer al empleado por DNI y, si no, por nombre.
      const dniLeido = soloDigitos(leido.dni);
      const nombreLeido = (leido.nombre ?? "").toLowerCase();
      const encontrado =
        (dniLeido && empleados.find((emp) => soloDigitos(emp.dni) === dniLeido)) ||
        (nombreLeido &&
          empleados.find((emp) =>
            emp.nombre_completo
              .toLowerCase()
              .split(/\s+/)
              .every((parte) => nombreLeido.includes(parte)),
          ));
      if (encontrado) setEmpleadoId(encontrado.id);

      const faltantes = [
        !encontrado && "empleado",
        !leido.fecha_vencimiento && "vencimiento",
      ].filter(Boolean);
      setAviso(
        faltantes.length
          ? `Datos leídos. No se pudo reconocer: ${faltantes.join(" y ")}. Revisá y completá.`
          : "Datos leídos de la libreta. Revisá que estén bien y guardá.",
      );
    }

    setLeyendo(false);
  }

  async function borrar(id: string) {
    if (!window.confirm("¿Eliminar esta libreta?")) return;
    await eliminarLibreta(sucursalId, id);
  }

  const alertas = empleados.filter(
    (e) => !e.libreta || diasParaVencer(e.libreta.fecha_vencimiento) <= DIAS_AVISO,
  );

  return (
    <div className="space-y-6">
      {alertas.length > 0 && (
        <section className="alerta-pulso rounded-2xl border border-red-300 bg-red-50 p-5">
          <h2 className="mb-2 flex items-center gap-2 font-display text-base font-semibold text-red-800">
            <span className="alerta-punto h-2 w-2 rounded-full bg-red-600" />
            {alertas.length} empleado{alertas.length === 1 ? "" : "s"} con la libreta vencida, por vencer o sin cargar
          </h2>
          <ul className="space-y-1 text-sm">
            {alertas.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{e.nombre_completo}</span>
                <EstadoLibreta empleado={e} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-edge bg-card p-5">
        <h2 className="mb-1 font-display text-base font-semibold text-ink">Cargar libreta</h2>
        <p className="mb-4 text-xs text-ink-soft">
          Subí la foto o el PDF: el sistema lee los datos solo. Revisalos antes de guardar. Si el empleado
          renueva la libreta, cargá la nueva y queda la más reciente.
        </p>

        <form
          ref={formRef}
          action={(formData) => {
            formData.delete("archivo_original");
            if (archivoListo) formData.set("archivo", archivoListo);
            formAction(formData);
            limpiar();
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={ETIQUETA_MIN}>Foto o PDF de la libreta</label>
            <input
              type="file"
              name="archivo_original"
              accept="image/*,application/pdf"
              onChange={manejarArchivo}
              className={`${CAMPO} file:mr-3 file:rounded-md file:border-0 file:bg-brass file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-btn-ink`}
            />
            {leyendo && <p className="mt-2 text-xs text-ink-soft">Leyendo la libreta, un momento...</p>}
            {aviso && !leyendo && <p className="mt-2 text-xs text-ink-soft">{aviso}</p>}
          </div>

          <div>
            <label className={ETIQUETA_MIN}>Empleado</label>
            <select
              name="empleado_id"
              required
              value={empleadoId}
              onChange={(e) => setEmpleadoId(e.target.value)}
              className={CAMPO}
            >
              <option value="">Elegí...</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre_completo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={ETIQUETA_MIN}>Vigente hasta</label>
            <input
              type="date"
              name="fecha_vencimiento"
              required
              value={vencimiento}
              onChange={(e) => setVencimiento(e.target.value)}
              className={CAMPO}
            />
          </div>
          <div>
            <label className={ETIQUETA_MIN}>Fecha de emisión</label>
            <input
              type="date"
              name="fecha_emision"
              value={emision}
              onChange={(e) => setEmision(e.target.value)}
              className={CAMPO}
            />
          </div>
          <div>
            <label className={ETIQUETA_MIN}>N° de libreta</label>
            <input name="numero" value={numero} onChange={(e) => setNumero(e.target.value)} className={CAMPO} />
          </div>
          <div>
            <label className={ETIQUETA_MIN}>Emitida por</label>
            <input
              name="emisor"
              value={emisor}
              onChange={(e) => setEmisor(e.target.value)}
              placeholder="Municipio / organismo"
              className={CAMPO}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={guardando || leyendo}
              className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar libreta"}
            </button>
          </div>
          {estado.error && <p className="text-xs text-red-700 sm:col-span-2 lg:col-span-3">{estado.error}</p>}
        </form>
      </section>

      <section className="rounded-2xl border border-edge bg-card p-5">
        <h2 className="mb-3 font-display text-base font-semibold text-ink">Libretas del personal</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                <th className="px-3 py-2">Empleado</th>
                <th className="px-3 py-2">N°</th>
                <th className="px-3 py-2">Emisión</th>
                <th className="px-3 py-2">Vigente hasta</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((e) => (
                <tr key={e.id} className="border-t border-edge">
                  <td className="px-3 py-2 text-ink">
                    {e.nombre_completo}
                    {e.libreta?.emisor && <p className="text-xs text-ink-soft">{e.libreta.emisor}</p>}
                  </td>
                  <td className="px-3 py-2 text-ink-soft">{e.libreta?.numero ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-soft">{formatearFecha(e.libreta?.fecha_emision ?? null)}</td>
                  <td className="px-3 py-2 text-ink-soft">
                    {formatearFecha(e.libreta?.fecha_vencimiento ?? null)}
                  </td>
                  <td className="px-3 py-2">
                    <EstadoLibreta empleado={e} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {e.libreta?.urlFirmada && (
                      <a
                        href={e.libreta.urlFirmada}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mr-3 text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                      >
                        Ver
                      </a>
                    )}
                    {e.libreta && (
                      <button
                        type="button"
                        onClick={() => borrar(e.libreta!.id)}
                        className="text-xs text-red-700 hover:text-red-500"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {empleados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-ink-soft">
                    No hay empleados activos en esta sede.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
