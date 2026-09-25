import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { BotonExportarPdf } from "@/components/BotonExportarPdf";
import { BotonEliminarEmergencia, FormularioEmergencia } from "@/components/EmergenciasClient";
import type { Emergencia, Perfil } from "@/lib/types";

type Params = { id: string };
type Busqueda = { anio?: string };

type EmergenciaConResidente = Emergencia & {
  residentes: { nombre: string; apellido: string } | null;
};

function formatearFechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split("-");
  return `${d}/${m}/${a.slice(2)}`;
}

function textoSatisfactoria(valor: boolean | null): string {
  if (valor === true) return "Sí";
  if (valor === false) return "No";
  return "—";
}

export default async function EmergenciasPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Busqueda>;
}) {
  const { id } = await params;
  const { anio: anioParam } = await searchParams;
  const anioActual = new Date().getFullYear();
  const anio = anioParam && /^\d{4}$/.test(anioParam) ? Number(anioParam) : anioActual;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, { data: residentes }, { data: contratos }, { data: emergencias }] =
    await Promise.all([
      supabase
        .from("perfiles")
        .select("id, nombre_completo, rol, sucursal_id, activo")
        .eq("id", user!.id)
        .single<Perfil>(),
      supabase
        .from("sucursales")
        .select("id, nombre")
        .eq("id", id)
        .single<{ id: string; nombre: string }>(),
      supabase
        .from("residentes")
        .select("id, nombre, apellido")
        .eq("sucursal_id", id)
        .eq("activo", true)
        .order("apellido")
        .returns<{ id: string; nombre: string; apellido: string }[]>(),
      supabase
        .from("contratos_proveedores_salud")
        .select("proveedor, tipo")
        .eq("sucursal_id", id)
        .returns<{ proveedor: string; tipo: string }[]>(),
      supabase
        .from("emergencias")
        .select("*, residentes(nombre, apellido)")
        .eq("sucursal_id", id)
        .gte("fecha", `${anio}-01-01`)
        .lte("fecha", `${anio}-12-31`)
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false })
        .returns<EmergenciaConResidente[]>(),
    ]);

  if (!sucursal || !perfil) notFound();

  const lista = emergencias ?? [];
  const prestadoresContrato = [
    ...(contratos ?? []).filter((c) => c.tipo === "area_protegida").map((c) => c.proveedor),
    ...(contratos ?? []).filter((c) => c.tipo !== "area_protegida").map((c) => c.proveedor),
  ];
  const prestadores = [...new Set([...prestadoresContrato, ...lista.map((e) => e.prestador)])];

  const porPrestador = new Map<string, { total: number; si: number; no: number; demoras: number[] }>();
  const porResidente = new Map<string, number>();
  for (const e of lista) {
    const p = porPrestador.get(e.prestador) ?? { total: 0, si: 0, no: 0, demoras: [] };
    p.total++;
    if (e.satisfactoria === true) p.si++;
    if (e.satisfactoria === false) p.no++;
    if (e.demora_minutos !== null) p.demoras.push(e.demora_minutos);
    porPrestador.set(e.prestador, p);

    const nombre = e.residentes ? `${e.residentes.apellido}, ${e.residentes.nombre}` : "Sin residente asignado";
    porResidente.set(nombre, (porResidente.get(nombre) ?? 0) + 1);
  }

  const CELDA = "px-3 py-2 align-top";

  return (
    <div className="flex min-h-screen w-full print:block">
      <div className="print:hidden">
        <Sidebar
          perfil={perfil!}
          activo={{ tipo: "sucursal", sucursalId: id, seccion: "emergencias", area: "medicina" }}
        />
      </div>

      <main className="flex-1 space-y-6 px-9 py-8 print:px-0 print:py-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal!.nombre}</p>
            <h1 className="font-display text-[32px] font-semibold text-ink print:text-2xl print:text-black">
              Emergencias {anio}
            </h1>
            <p className="mt-1 text-sm text-ink-soft print:hidden">
              Llamadas al servicio de emergencias: prestador, fecha, cantidad de veces y si la atención fue
              satisfactoria.
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            {[anioActual - 1, anioActual].map((a) => (
              <Link
                key={a}
                href={`/sucursales/${id}/emergencias?anio=${a}`}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  a === anio ? "border-brass bg-brass text-btn-ink" : "border-edge text-ink-soft hover:border-brass"
                }`}
              >
                {a}
              </Link>
            ))}
            <BotonExportarPdf />
          </div>
        </div>

        <FormularioEmergencia sucursalId={id} residentes={residentes ?? []} prestadores={prestadores} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-edge bg-card p-5 print:border-neutral-300">
            <h2 className="mb-3 font-display text-sm font-semibold text-ink">Por prestador</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                  <th className={CELDA}>Prestador</th>
                  <th className={`${CELDA} text-right`}>Llamadas</th>
                  <th className={`${CELDA} text-right`}>Satisfactorias</th>
                  <th className={`${CELDA} text-right`}>No satisf.</th>
                  <th className={`${CELDA} text-right`}>Demora prom.</th>
                </tr>
              </thead>
              <tbody>
                {[...porPrestador.entries()].map(([nombre, p]) => (
                  <tr key={nombre} className="border-t border-edge">
                    <td className={`${CELDA} text-ink`}>{nombre}</td>
                    <td className={`${CELDA} text-right font-semibold text-ink`}>{p.total}</td>
                    <td className={`${CELDA} text-right text-emerald-700`}>{p.si}</td>
                    <td className={`${CELDA} text-right text-red-700`}>{p.no}</td>
                    <td className={`${CELDA} text-right text-ink-soft`}>
                      {p.demoras.length
                        ? `${Math.round(p.demoras.reduce((a, b) => a + b, 0) / p.demoras.length)} min`
                        : "—"}
                    </td>
                  </tr>
                ))}
                {porPrestador.size === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-xs text-ink-soft">
                      Sin llamadas en {anio}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="rounded-2xl border border-edge bg-card p-5 print:border-neutral-300">
            <h2 className="mb-3 font-display text-sm font-semibold text-ink">Por residente</h2>
            <ul className="space-y-1 text-sm">
              {[...porResidente.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([nombre, cantidad]) => (
                  <li key={nombre} className="flex justify-between border-b border-edge py-1 last:border-0">
                    <span className="text-ink">{nombre}</span>
                    <span className="font-semibold text-ink">
                      {cantidad} {cantidad === 1 ? "vez" : "veces"}
                    </span>
                  </li>
                ))}
              {porResidente.size === 0 && <li className="text-xs text-ink-soft">Sin llamadas en {anio}.</li>}
            </ul>
          </section>
        </div>

        <section className="overflow-x-auto rounded-2xl border border-edge bg-card p-5 print:border-neutral-300">
          <h2 className="mb-3 font-display text-sm font-semibold text-ink">
            Detalle de llamadas ({lista.length})
          </h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                <th className={CELDA}>Fecha</th>
                <th className={CELDA}>Hora</th>
                <th className={CELDA}>Prestador</th>
                <th className={CELDA}>Residente</th>
                <th className={CELDA}>Motivo</th>
                <th className={CELDA}>Demora</th>
                <th className={CELDA}>Traslado</th>
                <th className={CELDA}>Satisfactoria</th>
                <th className={CELDA}>Observaciones</th>
                <th className={CELDA}></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => (
                <tr key={e.id} className="border-t border-edge">
                  <td className={`${CELDA} whitespace-nowrap text-ink`}>{formatearFechaCorta(e.fecha)}</td>
                  <td className={`${CELDA} text-ink-soft`}>{e.hora?.slice(0, 5) ?? "—"}</td>
                  <td className={`${CELDA} text-ink`}>{e.prestador}</td>
                  <td className={`${CELDA} text-ink-soft`}>
                    {e.residentes ? `${e.residentes.apellido}, ${e.residentes.nombre}` : "—"}
                  </td>
                  <td className={`${CELDA} text-ink-soft`}>{e.motivo ?? "—"}</td>
                  <td className={`${CELDA} text-ink-soft`}>
                    {e.demora_minutos !== null ? `${e.demora_minutos} min` : "—"}
                  </td>
                  <td className={`${CELDA} text-ink-soft`}>{e.traslado ? "Sí" : "No"}</td>
                  <td
                    className={`${CELDA} font-semibold ${
                      e.satisfactoria === true
                        ? "text-emerald-700"
                        : e.satisfactoria === false
                          ? "text-red-700"
                          : "text-ink-soft"
                    }`}
                  >
                    {textoSatisfactoria(e.satisfactoria)}
                  </td>
                  <td className={`${CELDA} text-ink-soft`}>{e.observaciones ?? "—"}</td>
                  <td className={`${CELDA} text-right`}>
                    <BotonEliminarEmergencia sucursalId={id} id={e.id} />
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-ink-soft">
                    Sin llamadas registradas en {anio}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
