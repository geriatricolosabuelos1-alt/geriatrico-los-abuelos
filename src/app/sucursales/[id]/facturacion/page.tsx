import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { FormularioFacturaExterna } from "@/components/FormularioFacturaExterna";
import { clienteArca } from "@/lib/arca/cliente";
import { hoyArgentina } from "@/lib/fechas";
import { documentoReceptor, numeroFacturaC, type FacturaExterna } from "@/lib/facturacion";
import type { Perfil } from "@/lib/types";

type Params = { id: string };
type SearchParams = { mes?: string };

const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function sumarMes(periodo: string, delta: number): string {
  const [a, m] = periodo.split("-").map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type FacturaResidente = {
  id: string;
  pto_vta: number;
  cbte_nro: number;
  importe: number;
  fecha_emision: string;
  doc_tipo: number;
  doc_nro: string;
  periodo_desde: string | null;
  periodo_hasta: string | null;
  detalle: { descripcion: string; importe: number }[] | null;
  residentes: { nombre: string; apellido: string } | null;
};

// Una fila del registro: factura de arancel de un residente o de un servicio externo.
type FilaRegistro = {
  clave: string;
  tipo: "residente" | "externa";
  fecha: string;
  ptoVta: number;
  cbteNro: number;
  nombre: string;
  documento: string;
  periodo: string;
  detalle: string;
  importe: number;
  href: string;
};

function formatearFecha(fecha: string): string {
  const [a, m, d] = fecha.split("-");
  return `${d}/${m}/${a}`;
}

function formatearImporte(monto: number): string {
  return `$${Number(monto).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

// Facturación de servicios externos (no del geriátrico) con el CUIT de la sede.
export default async function FacturacionPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { mes } = await searchParams;
  const hoy = hoyArgentina();
  const periodo = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : hoy.slice(0, 7);
  const desde = `${periodo}-01`;
  const hasta = `${sumarMes(periodo, 1)}-01`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, { data: facturas }, { data: config }, { data: deResidentes }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre_completo, rol, sucursal_id, activo")
      .eq("id", user!.id)
      .single<Perfil>(),
    supabase.from("sucursales").select("id, nombre").eq("id", id).single<{ id: string; nombre: string }>(),
    supabase
      .from("facturas_externas")
      .select("*")
      .eq("sucursal_id", id)
      .gte("fecha_emision", desde)
      .lt("fecha_emision", hasta)
      .order("fecha_emision", { ascending: false })
      .order("cbte_nro", { ascending: false })
      .returns<FacturaExterna[]>(),
    // Solo el CUIT público de la sede, sin certificado ni clave.
    clienteArca().then((arca) =>
      arca
        .from("arca_config")
        .select("cuit, activo")
        .eq("sucursal_id", id)
        .maybeSingle<{ cuit: string; activo: boolean }>(),
    ),
    supabase
      .from("facturas_arca")
      .select(
        "id, pto_vta, cbte_nro, importe, fecha_emision, doc_tipo, doc_nro, periodo_desde, periodo_hasta, detalle, residentes(nombre, apellido)",
      )
      .eq("sucursal_id", id)
      .gte("fecha_emision", desde)
      .lt("fecha_emision", hasta)
      .returns<FacturaResidente[]>(),
  ]);

  if (!sucursal || !perfil) notFound();

  const lista: FilaRegistro[] = [
    ...(facturas ?? []).map(
      (f): FilaRegistro => ({
        clave: `e-${f.id}`,
        tipo: "externa",
        fecha: f.fecha_emision,
        ptoVta: f.pto_vta,
        cbteNro: f.cbte_nro,
        nombre: f.receptor_nombre,
        documento: documentoReceptor(f.doc_tipo, f.doc_nro),
        periodo: `${formatearFecha(f.periodo_desde)} al ${formatearFecha(f.periodo_hasta)}`,
        detalle: f.detalle.map((l) => l.descripcion).join(" · "),
        importe: Number(f.importe),
        href: `/sucursales/${id}/facturacion/${f.id}`,
      }),
    ),
    ...(deResidentes ?? []).map(
      (f): FilaRegistro => ({
        clave: `r-${f.id}`,
        tipo: "residente",
        fecha: f.fecha_emision,
        ptoVta: f.pto_vta,
        cbteNro: f.cbte_nro,
        nombre: f.residentes ? `${f.residentes.apellido}, ${f.residentes.nombre}` : "Residente",
        documento: documentoReceptor(f.doc_tipo, f.doc_nro),
        periodo:
          f.periodo_desde && f.periodo_hasta
            ? `${formatearFecha(f.periodo_desde)} al ${formatearFecha(f.periodo_hasta)}`
            : "—",
        detalle: (f.detalle ?? []).map((l) => l.descripcion).join(" · ") || "Servicios de residencia geriátrica",
        importe: Number(f.importe),
        href: `/sucursales/${id}/facturacion/residente/${f.id}`,
      }),
    ),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.cbteNro - a.cbteNro);
  const total = lista.reduce((acc, f) => acc + f.importe, 0);
  const totalResidentes = lista.filter((f) => f.tipo === "residente").reduce((acc, f) => acc + f.importe, 0);
  const totalExternas = total - totalResidentes;
  const [anio, numMes] = periodo.split("-").map(Number);
  const cuitSede = config?.activo ? config.cuit : null;

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar perfil={perfil} activo={{ tipo: "sucursal", sucursalId: id, seccion: "facturacion" }} />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal.nombre}</p>
            <h1 className="font-display text-[32px] font-semibold text-ink">Facturación</h1>
            <p className="text-sm text-ink-soft">
              Registro de todas las facturas de la sede: aranceles de residentes y servicios externos.
            </p>
          </div>
          <FormularioFacturaExterna sucursalId={id} sedeNombre={sucursal.nombre} cuitSede={cuitSede} hoy={hoy} />
        </div>

        {!cuitSede && (
          <p className="rounded-lg border border-edge bg-card px-4 py-3 text-sm text-ink-soft">
            Esta sede todavía no tiene la facturación electrónica de ARCA configurada.
          </p>
        )}

        <section className="space-y-3 rounded-2xl border border-edge bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href={`/sucursales/${id}/facturacion?mes=${sumarMes(periodo, -1)}`}
                className="rounded-lg border border-edge px-3 py-1.5 text-sm text-ink-soft hover:text-ink"
              >
                ←
              </Link>
              <h2 className="font-display text-lg font-semibold text-ink">
                {NOMBRES_MES[numMes - 1]} {anio}
              </h2>
              <Link
                href={`/sucursales/${id}/facturacion?mes=${sumarMes(periodo, 1)}`}
                className="rounded-lg border border-edge px-3 py-1.5 text-sm text-ink-soft hover:text-ink"
              >
                →
              </Link>
            </div>
            <div className="text-right text-sm text-ink-soft">
              <p>
                {lista.length} factura{lista.length === 1 ? "" : "s"} ·{" "}
                <span className="font-semibold text-ink">{formatearImporte(total)}</span>
              </p>
              <p className="text-xs">
                Residentes {formatearImporte(totalResidentes)} · Servicios externos {formatearImporte(totalExternas)}
              </p>
            </div>
          </div>

          {lista.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-soft">No hay facturas emitidas en este mes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-edge text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Número</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">A nombre de</th>
                    <th className="py-2 pr-3">Período</th>
                    <th className="py-2 pr-3">Detalle</th>
                    <th className="py-2 pr-3 text-right">Monto</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lista.map((f) => (
                    <tr key={f.clave} className="border-b border-edge/60 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap text-ink">{formatearFecha(f.fecha)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-ink">{numeroFacturaC(f.ptoVta, f.cbteNro)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                            f.tipo === "residente" ? "bg-brass-soft text-brass" : "bg-panel-deep text-ink-soft"
                          }`}
                        >
                          {f.tipo === "residente" ? "Residente" : "Servicio externo"}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <p className="font-medium text-ink">{f.nombre}</p>
                        <p className="text-xs text-ink-soft">{f.documento}</p>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-ink-soft">{f.periodo}</td>
                      <td className="max-w-xs py-2 pr-3 text-xs text-ink-soft">
                        <p className="line-clamp-3">{f.detalle}</p>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap text-right font-medium text-ink">
                        {formatearImporte(f.importe)}
                      </td>
                      <td className="py-2 text-right">
                        <Link
                          href={f.href}
                          className="text-xs whitespace-nowrap text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                        >
                          Ver / imprimir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
