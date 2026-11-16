"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  actualizarEstadoReceta,
  crearReceta,
  eliminarReceta,
  marcarRecetasPedidas,
  type RecetaEstado,
} from "@/app/sucursales/[id]/medicacion/recetario/actions";
import { mensajePedidoReceta, telefonoWhatsapp } from "@/lib/recetas";
import type { EstadoReceta, MedicamentoResidente, RecetaMedicamento } from "@/lib/types";

type ResidenteConMeds = {
  id: string;
  nombre: string;
  apellido: string;
  medicamentos_residente: MedicamentoResidente[];
  ficha_administrativa: { obra_social: string | null } | null;
};

type RecetaConNombres = RecetaMedicamento & {
  residente_nombre: string;
  medicamento_nombre: string | null;
  contacto_familiar: string | null;
  telefono_familiar: string | null;
  residente_dni: string | null;
  numero_afiliado: string | null;
  obra_social_ficha: string | null;
  medicamento_detalle: string | null;
};

type Props = {
  sucursalId: string;
  nombreSede: string;
  residentes: ResidenteConMeds[];
  recetas: RecetaConNombres[];
  puedeEliminar: boolean;
  // Viene de una alerta de stock: residente y medicamento ya elegidos, falta la cantidad.
  pedidoDesdeAlerta?: { residenteId: string; medicamentos: string[] } | null;
};

const ESTADO_INICIAL: RecetaEstado = { error: null };

const ETIQUETA_ESTADO: Record<EstadoReceta, string> = {
  pendiente_pedir: "Pendiente de pedir",
  pedida: "Pedida",
  recibida: "Recibida",
};

const ESTILO_ESTADO: Record<EstadoReceta, string> = {
  pendiente_pedir: "bg-amber-100 text-amber-800 border-amber-300",
  pedida: "bg-blue-100 text-blue-800 border-blue-300",
  recibida: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

const SIGUIENTE_ESTADO: Record<EstadoReceta, EstadoReceta | null> = {
  pendiente_pedir: "pedida",
  pedida: "recibida",
  recibida: null,
};

function semaforoVencimiento(fechaVencimiento: string | null): { texto: string; estilo: string } | null {
  if (!fechaVencimiento) return null;
  const dias = Math.ceil(
    (new Date(fechaVencimiento + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (dias < 0) return { texto: "Vencida", estilo: "bg-red-100 text-red-800 border-red-300" };
  if (dias <= 5) return { texto: `Vence en ${dias}d`, estilo: "bg-red-100 text-red-800 border-red-300" };
  if (dias <= 15) return { texto: `Vence en ${dias}d`, estilo: "bg-amber-100 text-amber-800 border-amber-300" };
  return { texto: `Vence en ${dias}d`, estilo: "bg-emerald-100 text-emerald-800 border-emerald-300" };
}

function FormularioNuevaReceta({
  sucursalId,
  residentes,
  nombresPedidos,
  inicial,
}: {
  sucursalId: string;
  residentes: ResidenteConMeds[];
  nombresPedidos: string[];
  inicial?: { residenteId: string; medicamentos: string[] } | null;
}) {
  const router = useRouter();
  // Si vino desde una alerta, después de agregarla se vuelve al recetario sin el pedido precargado.
  const accion = async (previo: RecetaEstado, datos: FormData) => {
    const resultado = await crearReceta(sucursalId, previo, datos);
    if (!resultado.error && inicial) router.replace(`/sucursales/${sucursalId}/medicacion/recetario`);
    return resultado;
  };
  const [estado, formAction, enviando] = useActionState(accion, ESTADO_INICIAL);
  const [residenteId, setResidenteId] = useState(inicial?.residenteId ?? "");
  // Un renglón por medicamento (cada uno con su cantidad): se piden todos juntos para el residente.
  const [renglones, setRenglones] = useState<{ clave: number; medicamento: string }[]>(
    (inicial?.medicamentos.length ? inicial.medicamentos : [""]).map((m, i) => ({ clave: i, medicamento: m })),
  );

  const medicamentosDelResidente =
    residentes.find((r) => r.id === residenteId)?.medicamentos_residente.filter((m) => m.activo) ?? [];
  // Sugerencias: medicamentos del residente + los que ya se pidieron antes en recetas.
  const sugerencias = [
    ...new Set(
      [...medicamentosDelResidente.map((m) => m.nombre), ...nombresPedidos]
        .map((n) => n.trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));
  const obraSocialSugerida = residentes.find((r) => r.id === residenteId)?.ficha_administrativa?.obra_social;

  return (
    <form
      action={formAction}
      className={`flex flex-wrap items-start gap-3 rounded-2xl border bg-card p-4 ${
        inicial ? "border-brass ring-2 ring-brass/30" : "border-edge"
      }`}
    >
      {inicial && (
        <p className="w-full text-sm font-semibold text-brass">
          Pedido desde la alerta de stock: completá la cantidad de cada medicamento y agregá las recetas.
        </p>
      )}
      <div>
        <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
          Residente
        </label>
        <select
          name="residente_id"
          required
          value={residenteId}
          onChange={(e) => setResidenteId(e.target.value)}
          className="w-44 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
        >
          <option value="">Seleccioná...</option>
          {residentes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.apellido}, {r.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <div className="flex gap-2">
          <label className="block w-48 text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
            Medicamento
          </label>
          <label className="block w-28 text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
            Cantidad
          </label>
        </div>
        {renglones.map((r, i) => (
          <div key={r.clave} className="flex items-center gap-2">
            <input
              name="medicamento"
              defaultValue={r.medicamento}
              list="medicamentos-receta"
              autoComplete="off"
              placeholder="Escribí o elegí..."
              aria-label={`Medicamento ${i + 1}`}
              className="w-48 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
            />
            <input
              name="cantidad"
              required={!!inicial}
              autoFocus={!!inicial && i === 0}
              placeholder="Ej: 2 cajas"
              aria-label={`Cantidad ${i + 1}`}
              className="w-28 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
            />
            {renglones.length > 1 && (
              <button
                type="button"
                onClick={() => setRenglones((lista) => lista.filter((x) => x.clave !== r.clave))}
                aria-label={`Quitar medicamento ${i + 1}`}
                className="px-1 text-lg text-ink-soft hover:text-red-700"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setRenglones((lista) => [...lista, { clave: Math.max(-1, ...lista.map((x) => x.clave)) + 1, medicamento: "" }])
          }
          className="text-xs text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
        >
          + Otro medicamento
        </button>
        <datalist id="medicamentos-receta">
          {sugerencias.map((nombre) => (
            <option key={nombre} value={nombre} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
          Obra social
        </label>
        <input
          name="obra_social"
          defaultValue={obraSocialSugerida ?? ""}
          placeholder="PAMI, OSDE..."
          className="w-36 rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
          Vencimiento
        </label>
        <input
          type="date"
          name="fecha_vencimiento"
          className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none"
        />
      </div>
      <div className="min-w-40 flex-1">
        <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
          Notas
        </label>
        <input
          name="notas"
          placeholder="Ej: pedir antes del 20"
          className="w-full rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90 disabled:opacity-50"
      >
        {enviando ? "Guardando..." : renglones.length > 1 ? "+ Agregar recetas" : "+ Agregar receta"}
      </button>
      {estado.error && <p className="w-full text-xs text-red-700">{estado.error}</p>}
    </form>
  );
}

function FilaReceta({
  sucursalId,
  nombreSede,
  receta,
  puedeEliminar,
  grupo,
  primeraDelGrupo,
}: {
  sucursalId: string;
  nombreSede: string;
  receta: RecetaConNombres;
  puedeEliminar: boolean;
  // Recetas sin recibir del mismo residente: se piden todas juntas en un solo mensaje.
  grupo: RecetaConNombres[];
  primeraDelGrupo: boolean;
}) {
  const [enviando, setEnviando] = useState(false);
  const siguiente = SIGUIENTE_ESTADO[receta.estado];

  async function avanzar() {
    if (!siguiente) return;
    setEnviando(true);
    await actualizarEstadoReceta(sucursalId, receta.id, siguiente);
    setEnviando(false);
  }

  async function borrar() {
    if (!window.confirm("¿Eliminar esta receta?")) return;
    await eliminarReceta(sucursalId, receta.id);
  }

  const telefono = telefonoWhatsapp(receta.telefono_familiar);

  // Abre WhatsApp con el pedido de la receta al familiar y, si estaba pendiente, la marca pedida hoy.
  async function enviarWhatsapp() {
    if (!telefono) return;
    const texto = mensajePedidoReceta({
      contacto: receta.contacto_familiar,
      sede: nombreSede,
      // "Pérez, Ana" -> "Ana Pérez"
      residente: receta.residente_nombre.split(", ").reverse().join(" "),
      dni: receta.residente_dni,
      obraSocial: receta.obra_social ?? receta.obra_social_ficha,
      numeroAfiliado: receta.numero_afiliado,
      medicamentos: grupo.map((r) => ({
        nombre: r.medicamento_nombre,
        detalle: r.medicamento_detalle,
        cantidad: r.cantidad ?? null,
      })),
    });
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
    const pendientes = grupo.filter((r) => r.estado === "pendiente_pedir").map((r) => r.id);
    if (pendientes.length > 0) {
      setEnviando(true);
      await marcarRecetasPedidas(sucursalId, pendientes);
      setEnviando(false);
    }
  }

  return (
    <tr className={primeraDelGrupo ? "border-t-2 border-edge" : "border-t border-edge/40"}>
      <td className="px-3 py-2 text-sm text-ink">{primeraDelGrupo ? receta.residente_nombre : ""}</td>
      <td className="px-3 py-2 text-sm text-ink-soft">{receta.medicamento_nombre ?? "General"}</td>
      <td className="px-3 py-2 text-sm text-ink">{receta.cantidad ?? "—"}</td>
      <td className="px-3 py-2 text-sm text-ink-soft">{receta.obra_social ?? "—"}</td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${ESTILO_ESTADO[receta.estado]}`}
          >
            {ETIQUETA_ESTADO[receta.estado]}
            {receta.estado === "pedida" &&
              receta.fecha_pedido &&
              ` el ${new Date(receta.fecha_pedido + "T00:00:00").toLocaleDateString("es-AR")}`}
            {receta.estado === "recibida" &&
              receta.fecha_recibido &&
              ` el ${new Date(receta.fecha_recibido + "T00:00:00").toLocaleDateString("es-AR")}`}
          </span>
          {receta.estado !== "recibida" &&
            (() => {
              const semaforo = semaforoVencimiento(receta.fecha_vencimiento);
              return semaforo ? (
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${semaforo.estilo}`}
                >
                  {semaforo.texto}
                </span>
              ) : null;
            })()}
        </div>
      </td>
      <td className="px-3 py-2 text-xs text-ink-soft">{receta.notas ?? "—"}</td>
      <td className="px-3 py-2 text-right">
        <div className="flex flex-wrap justify-end gap-2">
          {primeraDelGrupo && grupo.length > 0 && (
            <button
              type="button"
              onClick={enviarWhatsapp}
              disabled={!telefono || enviando}
              title={
                telefono
                  ? `Enviar a ${receta.contacto_familiar ?? "el familiar"} (${receta.telefono_familiar})`
                  : "Falta el teléfono del familiar: cargalo en el legajo del residente"
              }
              className="text-xs font-semibold text-emerald-700 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {grupo.every((r) => r.estado === "pedida") ? "Reenviar por WhatsApp" : "Enviar por WhatsApp"}
              {grupo.length > 1 && ` (${grupo.length})`}
            </button>
          )}
          {siguiente && (
            <button
              type="button"
              onClick={avanzar}
              disabled={enviando}
              className="text-xs font-semibold text-brass hover:text-ink disabled:opacity-50"
            >
              Marcar {ETIQUETA_ESTADO[siguiente].toLowerCase()}
            </button>
          )}
          {puedeEliminar && (
            <button type="button" onClick={borrar} className="text-xs text-red-700 hover:text-red-500">
              Eliminar
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function RecetarioClient({
  sucursalId,
  nombreSede,
  residentes,
  recetas,
  puedeEliminar,
  pedidoDesdeAlerta,
}: Props) {
  // Agrupadas por residente: todas sus recetas juntas, de la más nueva a la más vieja.
  const ordenadas = [...recetas].sort(
    (a, b) => a.residente_nombre.localeCompare(b.residente_nombre, "es") || b.created_at.localeCompare(a.created_at),
  );
  const sinRecibirPorResidente = new Map<string, RecetaConNombres[]>();
  for (const r of ordenadas) {
    if (r.estado === "recibida") continue;
    sinRecibirPorResidente.set(r.residente_id, [...(sinRecibirPorResidente.get(r.residente_id) ?? []), r]);
  }

  return (
    <div className="space-y-4">
      <FormularioNuevaReceta
        sucursalId={sucursalId}
        residentes={residentes}
        nombresPedidos={recetas.map((r) => r.medicamento_nombre).filter((n): n is string => !!n)}
        inicial={pedidoDesdeAlerta}
      />

      <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              <th className="px-3 py-2">Residente</th>
              <th className="px-3 py-2">Medicamento</th>
              <th className="px-3 py-2">Cantidad</th>
              <th className="px-3 py-2">Obra social</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Notas</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((r, i) => (
              <FilaReceta
                key={r.id}
                sucursalId={sucursalId}
                nombreSede={nombreSede}
                receta={r}
                puedeEliminar={puedeEliminar}
                grupo={sinRecibirPorResidente.get(r.residente_id) ?? []}
                primeraDelGrupo={i === 0 || ordenadas[i - 1].residente_id !== r.residente_id}
              />
            ))}
            {recetas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-ink-soft">
                  Sin recetas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
