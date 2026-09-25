import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotonExportarPdf } from "@/components/BotonExportarPdf";
import type { EstadoDosis, MedicamentoResidente } from "@/lib/types";

type Params = { id: string };
type Busqueda = { tipo?: string; desde?: string; hasta?: string; residente?: string };

const ZONA = "America/Argentina/Buenos_Aires";

const ETIQUETA_ESTADO: Record<EstadoDosis, string> = {
  administrado: "Administrada",
  omitido: "Omitida",
  rechazado: "Rechazada",
  suspendido: "Suspendida",
};

type ResidenteConMeds = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  habitacion: string | null;
  medicamentos_residente: MedicamentoResidente[];
};

type DosisConDatos = {
  id: string;
  cantidad: number;
  estado: EstadoDosis;
  motivo: string | null;
  horario_previsto: string | null;
  administrado_por: string | null;
  fecha: string;
  residentes: { nombre: string; apellido: string; dni: string | null; sucursal_id: string };
  medicamentos_residente: { nombre: string; dosis: string | null } | null;
};

function hoyArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
}

function primeroDelMes(fecha: string): string {
  return fecha.slice(0, 8) + "01";
}

function esFecha(valor: string | undefined): valor is string {
  return !!valor && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function formatearFecha(fecha: string): string {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-AR");
}

export default async function RegistroMedicacionPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Busqueda>;
}) {
  const { id } = await params;
  const busqueda = await searchParams;
  const tipo = busqueda.tipo === "administrada" ? "administrada" : "indicada";
  const hoy = hoyArgentina();
  const desde = esFecha(busqueda.desde) ? busqueda.desde : primeroDelMes(hoy);
  const hasta = esFecha(busqueda.hasta) ? busqueda.hasta : hoy;

  const supabase = await createClient();

  const [{ data: sucursal }, { data: listaResidentes }] = await Promise.all([
    supabase.from("sucursales").select("id, nombre").eq("id", id).single<{ id: string; nombre: string }>(),
    supabase
      .from("residentes")
      .select("id, nombre, apellido")
      .eq("sucursal_id", id)
      .eq("activo", true)
      .order("apellido")
      .returns<{ id: string; nombre: string; apellido: string }[]>(),
  ]);

  if (!sucursal) notFound();

  // Residente en particular (vacío = todos). Solo se aceptan residentes de esta sede.
  const residenteElegido = (listaResidentes ?? []).find((r) => r.id === busqueda.residente) ?? null;

  let residentes: ResidenteConMeds[] = [];
  let dosis: DosisConDatos[] = [];
  const nombrePorPerfil = new Map<string, string>();

  if (tipo === "indicada") {
    const consulta = supabase
      .from("residentes")
      .select(
        "id, nombre, apellido, dni, habitacion, medicamentos_residente(id, nombre, dosis, dosis_diaria, frecuencia, horario, horarios, via_administracion, tipo_administracion, instrucciones, cantidad_stock, activo)",
      )
      .eq("sucursal_id", id)
      .eq("activo", true)
      .order("apellido");
    const { data } = await (residenteElegido ? consulta.eq("id", residenteElegido.id) : consulta).returns<
      ResidenteConMeds[]
    >();
    residentes = (data ?? [])
      .map((r) => ({
        ...r,
        medicamentos_residente: r.medicamentos_residente
          .filter((m) => m.activo)
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      }))
      .filter((r) => r.medicamentos_residente.length > 0);
  } else {
    const consultaDosis = supabase
      .from("dosis_administradas")
      .select(
        "id, cantidad, estado, motivo, horario_previsto, administrado_por, fecha, residentes!inner(nombre, apellido, dni, sucursal_id), medicamentos_residente(nombre, dosis)",
      )
      .eq("residentes.sucursal_id", id)
      .gte("fecha", `${desde}T00:00:00-03:00`)
      .lte("fecha", `${hasta}T23:59:59.999-03:00`)
      .order("fecha", { ascending: true })
      .limit(5000);
    const { data } = await (residenteElegido
      ? consultaDosis.eq("residente_id", residenteElegido.id)
      : consultaDosis
    ).returns<DosisConDatos[]>();
    dosis = (data ?? []).sort(
      (a, b) =>
        `${a.residentes.apellido} ${a.residentes.nombre}`.localeCompare(
          `${b.residentes.apellido} ${b.residentes.nombre}`,
        ) || a.fecha.localeCompare(b.fecha),
    );

    const idsPerfiles = [...new Set(dosis.map((d) => d.administrado_por).filter((x): x is string => !!x))];
    if (idsPerfiles.length > 0) {
      const { data: perfiles } = await supabase
        .from("perfiles")
        .select("id, nombre_completo")
        .in("id", idsPerfiles)
        .returns<{ id: string; nombre_completo: string }[]>();
      for (const p of perfiles ?? []) nombrePorPerfil.set(p.id, p.nombre_completo);
    }
  }

  const totalAdministradas = dosis.filter((d) => d.estado === "administrado").length;
  const CELDA = "py-2 pr-3 align-top";

  return (
    <div className="flex min-h-screen w-full justify-center bg-panel px-4 py-10 print:block print:min-h-0 print:bg-white print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 12mm; }`}</style>

      <div className="w-full max-w-[960px] overflow-hidden rounded-2xl border border-edge bg-card p-8 shadow-2xl print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={`/sucursales/${id}/medicacion`}
            className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
          >
            ← Volver a medicación
          </Link>
          <BotonExportarPdf />
        </div>

        <form className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-edge bg-panel-deep p-3 print:hidden">
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              Informe
            </label>
            <select
              name="tipo"
              defaultValue={tipo}
              className="rounded-lg border border-edge bg-card px-3 py-2 text-sm text-ink"
            >
              <option value="indicada">Medicación indicada (actual)</option>
              <option value="administrada">Dosis administradas (período)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              Residente
            </label>
            <select
              name="residente"
              defaultValue={residenteElegido?.id ?? ""}
              className="rounded-lg border border-edge bg-card px-3 py-2 text-sm text-ink"
            >
              <option value="">Todos los residentes</option>
              {(listaResidentes ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.apellido}, {r.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              Desde
            </label>
            <input
              type="date"
              name="desde"
              defaultValue={desde}
              className="rounded-lg border border-edge bg-card px-3 py-2 text-sm text-ink"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              Hasta
            </label>
            <input
              type="date"
              name="hasta"
              defaultValue={hasta}
              className="rounded-lg border border-edge bg-card px-3 py-2 text-sm text-ink"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90"
          >
            Ver
          </button>
          <p className="w-full text-[0.65rem] text-ink-soft">
            Las fechas se usan solo para el informe de dosis administradas.
          </p>
        </form>

        <div className="mb-6">
          <p className="font-display text-xl font-semibold text-ink print:text-black">Los Abuelos</p>
          <p className="text-xs uppercase tracking-widest text-ink-soft print:text-neutral-600">
            {tipo === "indicada" ? "Registro de medicación indicada" : "Registro de dosis administradas"} ·{" "}
            {sucursal.nombre}
            {residenteElegido && ` · ${residenteElegido.apellido}, ${residenteElegido.nombre}`}
          </p>
          <p className="mt-1 text-xs text-ink-soft print:text-neutral-600">
            {tipo === "administrada"
              ? `Período ${formatearFecha(desde)} al ${formatearFecha(hasta)} · ${dosis.length} registro${
                  dosis.length === 1 ? "" : "s"
                } (${totalAdministradas} administrada${totalAdministradas === 1 ? "" : "s"}) · `
              : ""}
            Generado el {new Date().toLocaleDateString("es-AR", { timeZone: ZONA })}
          </p>
        </div>

        {tipo === "indicada" ? (
          <div className="space-y-6">
            {residentes.map((r) => (
              <section key={r.id} className="break-inside-avoid">
                <h2 className="mb-1 border-b border-edge pb-1 text-sm font-semibold text-ink print:border-neutral-400 print:text-black">
                  {r.apellido}, {r.nombre}
                  <span className="ml-2 text-xs font-normal text-ink-soft print:text-neutral-600">
                    {r.dni ? `DNI ${r.dni}` : ""}
                    {r.habitacion ? ` · Hab. ${r.habitacion}` : ""}
                  </span>
                </h2>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[0.6rem] font-semibold uppercase tracking-wide text-ink-soft print:text-neutral-500">
                      <th className={CELDA}>Medicamento</th>
                      <th className={CELDA}>Dosis</th>
                      <th className={CELDA}>Frecuencia / horarios</th>
                      <th className={CELDA}>Vía</th>
                      <th className={CELDA}>Indicaciones</th>
                      <th className={`${CELDA} text-right`}>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.medicamentos_residente.map((m) => (
                      <tr key={m.id} className="border-t border-edge print:border-neutral-300">
                        <td className={`${CELDA} font-medium text-ink print:text-black`}>
                          {m.nombre}
                          {m.tipo_administracion === "sos" && (
                            <span className="ml-1 text-[0.6rem] font-semibold text-amber-700">SOS</span>
                          )}
                        </td>
                        <td className={`${CELDA} text-ink-soft print:text-neutral-700`}>{m.dosis ?? "—"}</td>
                        <td className={`${CELDA} text-ink-soft print:text-neutral-700`}>
                          {[m.frecuencia, m.horarios?.length ? m.horarios.join(", ") : m.horario]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </td>
                        <td className={`${CELDA} text-ink-soft print:text-neutral-700`}>
                          {m.via_administracion ?? "—"}
                        </td>
                        <td className={`${CELDA} text-ink-soft print:text-neutral-700`}>{m.instrucciones ?? "—"}</td>
                        <td className={`${CELDA} text-right text-ink print:text-black`}>{m.cantidad_stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
            {residentes.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-soft">No hay medicación cargada en esta sede.</p>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-edge text-[0.6rem] font-semibold uppercase tracking-wide text-ink-soft print:border-neutral-300 print:text-neutral-500">
                <th className={CELDA}>Residente</th>
                <th className={CELDA}>Fecha y hora</th>
                <th className={CELDA}>Medicamento</th>
                <th className={CELDA}>Cant.</th>
                <th className={CELDA}>Estado</th>
                <th className={CELDA}>Registró</th>
                <th className={CELDA}>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {dosis.map((d) => (
                <tr key={d.id} className="border-b border-edge print:border-neutral-300">
                  <td className={`${CELDA} font-medium text-ink print:text-black`}>
                    {d.residentes.apellido}, {d.residentes.nombre}
                  </td>
                  <td className={`${CELDA} whitespace-nowrap text-ink-soft print:text-neutral-700`}>
                    {new Date(d.fecha).toLocaleString("es-AR", {
                      timeZone: ZONA,
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {d.horario_previsto && (
                      <span className="block text-[0.6rem]">prevista {d.horario_previsto.slice(0, 5)}</span>
                    )}
                  </td>
                  <td className={`${CELDA} text-ink print:text-black`}>
                    {d.medicamentos_residente?.nombre ?? "—"}
                    {d.medicamentos_residente?.dosis && (
                      <span className="block text-[0.6rem] text-ink-soft">{d.medicamentos_residente.dosis}</span>
                    )}
                  </td>
                  <td className={`${CELDA} text-ink-soft print:text-neutral-700`}>{d.cantidad}</td>
                  <td
                    className={`${CELDA} ${
                      d.estado === "administrado" ? "text-emerald-700" : "text-red-700"
                    } font-semibold`}
                  >
                    {ETIQUETA_ESTADO[d.estado]}
                  </td>
                  <td className={`${CELDA} text-ink-soft print:text-neutral-700`}>
                    {(d.administrado_por && nombrePorPerfil.get(d.administrado_por)) ?? "—"}
                  </td>
                  <td className={`${CELDA} text-ink-soft print:text-neutral-700`}>{d.motivo ?? "—"}</td>
                </tr>
              ))}
              {dosis.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-ink-soft">
                    No hay dosis registradas en ese período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
