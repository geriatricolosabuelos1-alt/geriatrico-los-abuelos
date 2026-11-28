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
type SearchParams = { mes?: string; q?: string; tipo?: string; desde?: string; hasta?: string };

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
  receptor_nombre: string | null;
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

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Minúsculas y sin acentos, para buscar sin importar cómo se escribió.
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function soloDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

// Todas las palabras buscadas tienen que aparecer (nombre, documento, número de factura o detalle).
// Los números se comparan sin guiones ni espacios: "20-1234" encuentra "20123456789".
function coincide(fila: FilaRegistro, busqueda: string): boolean {
  const numero = numeroFacturaC(fila.ptoVta, fila.cbteNro);
  const texto = normalizar([fila.nombre, fila.documento, numero, fila.detalle].join(" "));
  const numeros = [fila.documento, numero].map(soloDigitos).join(" ");
  return normalizar(busqueda)
    .split(/\s+/)
    .filter(Boolean)
    .every((p) => texto.includes(p) || (soloDigitos(p).length >= 3 && numeros.includes(soloDigitos(p))));
}

const CAMPO_FILTRO =
  "rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none";

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
  const sp = await searchParams;
  const hoy = hoyArgentina();
  const periodo = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoy.slice(0, 7);
  const busqueda = (sp.q ?? "").trim();
  const tipo = sp.tipo === "residente" || sp.tipo === "externa" ? sp.tipo : "todos";
  const filtroDesde = sp.desde && FECHA_ISO.test(sp.desde) ? sp.desde : "";
  const filtroHasta = sp.hasta && FECHA_ISO.test(sp.hasta) ? sp.hasta : "";
  // Con fechas elegidas se usa ese rango; si solo se busca texto, se busca en todas las fechas;
  // sin filtros se ve el mes.
  const porRango = !!(filtroDesde || filtroHasta);
  const porMes = !porRango && !busqueda;
  const desde = porMes ? `${periodo}-01` : filtroDesde || null;
  const hastaExclusivo = porMes ? `${sumarMes(periodo, 1)}-01` : null;
  const hastaInclusivo = porMes ? null : filtroHasta || null;
  const hayFiltros = !porMes || tipo !== "todos";

  function enRango<T extends { gte: (c: string, v: string) => T; lt: (c: string, v: string) => T; lte: (c: string, v: string) => T }>(
    consulta: T,
  ): T {
    let q = consulta;
    if (desde) q = q.gte("fecha_emision", desde);
    if (hastaExclusivo) q = q.lt("fecha_emision", hastaExclusivo);
    if (hastaInclusivo) q = q.lte("fecha_emision", hastaInclusivo);
    return q;
  }

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
    tipo === "residente"
      ? Promise.resolve({ data: [] as FacturaExterna[] })
      : enRango(supabase.from("facturas_externas").select("*").eq("sucursal_id", id)).returns<FacturaExterna[]>(),
    // Solo el CUIT público de la sede, sin certificado ni clave.
    clienteArca().then((arca) =>
      arca
        .from("arca_config")
        .select("cuit, activo")
        .eq("sucursal_id", id)
        .maybeSingle<{ cuit: string; activo: boolean }>(),
    ),
    tipo === "externa"
      ? Promise.resolve({ data: [] as FacturaResidente[] })
      : enRango(supabase
      .from("facturas_arca")
      .select(
        "id, pto_vta, cbte_nro, importe, fecha_emision, doc_tipo, doc_nro, periodo_desde, periodo_hasta, detalle, receptor_nombre, residentes(nombre, apellido)",
      )
      .eq("sucursal_id", id))
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
        // A nombre del familiar si se facturó a él (el residente queda en el detalle).
        nombre:
          f.receptor_nombre ?? (f.residentes ? `${f.residentes.apellido}, ${f.residentes.nombre}` : "Residente"),
        documento: documentoReceptor(f.doc_tipo, f.doc_nro),
        periodo:
          f.periodo_desde && f.periodo_hasta
            ? `${formatearFecha(f.periodo_desde)} al ${formatearFecha(f.periodo_hasta)}`
            : "—",
        detalle: [
          f.receptor_nombre && f.residentes ? `Residente: ${f.residentes.apellido}, ${f.residentes.nombre}` : null,
          (f.detalle ?? []).map((l) => l.descripcion).join(" · ") || "Servicios de residencia geriátrica",
        ]
          .filter(Boolean)
          .join(" · "),
        importe: Number(f.importe),
        href: `/sucursales/${id}/facturacion/residente/${f.id}`,
      }),
    ),
  ]
    .filter((f) => !busqueda || coincide(f, busqueda))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.cbteNro - a.cbteNro);
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

        <section className="space-y-4 rounded-2xl border border-edge bg-card p-6">
          <form className="flex flex-wrap items-end gap-3 border-b border-edge pb-4">
            {porMes && <input type="hidden" name="mes" value={periodo} />}
            <label className="min-w-56 flex-1 text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              Buscar
              <input
                name="q"
                defaultValue={busqueda}
                placeholder="Nombre, CUIT/CUIL/DNI, Nº de factura o detalle"
                className={`${CAMPO_FILTRO} mt-1 w-full font-normal normal-case tracking-normal`}
              />
            </label>
            <label className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              Tipo
              <select name="tipo" defaultValue={tipo} className={`${CAMPO_FILTRO} mt-1 block font-normal normal-case`}>
                <option value="todos">Todas</option>
                <option value="residente">Residentes</option>
                <option value="externa">Servicios externos</option>
              </select>
            </label>
            <label className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              Desde
              <input type="date" name="desde" defaultValue={filtroDesde} className={`${CAMPO_FILTRO} mt-1 block font-normal`} />
            </label>
            <label className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
              Hasta
              <input type="date" name="hasta" defaultValue={filtroHasta} className={`${CAMPO_FILTRO} mt-1 block font-normal`} />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90"
            >
              Filtrar
            </button>
            {hayFiltros && (
              <Link
                href={`/sucursales/${id}/facturacion`}
                className="py-2 text-sm text-ink-soft underline underline-offset-2 hover:text-ink"
              >
                Limpiar
              </Link>
            )}
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {porMes ? (
            <div className="flex items-center gap-3">
              <Link
                href={`/sucursales/${id}/facturacion?mes=${sumarMes(periodo, -1)}${tipo !== "todos" ? `&tipo=${tipo}` : ""}`}
                className="rounded-lg border border-edge px-3 py-1.5 text-sm text-ink-soft hover:text-ink"
              >
                ←
              </Link>
              <h2 className="font-display text-lg font-semibold text-ink">
                {NOMBRES_MES[numMes - 1]} {anio}
              </h2>
              <Link
                href={`/sucursales/${id}/facturacion?mes=${sumarMes(periodo, 1)}${tipo !== "todos" ? `&tipo=${tipo}` : ""}`}
                className="rounded-lg border border-edge px-3 py-1.5 text-sm text-ink-soft hover:text-ink"
              >
                →
              </Link>
            </div>
            ) : (
              <h2 className="font-display text-lg font-semibold text-ink">
                Resultados
                <span className="ml-2 text-sm font-normal text-ink-soft">
                  {filtroDesde || filtroHasta
                    ? `${filtroDesde ? `desde ${formatearFecha(filtroDesde)}` : ""} ${filtroHasta ? `hasta ${formatearFecha(filtroHasta)}` : ""}`
                    : "todas las fechas"}
                </span>
              </h2>
            )}
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
            <p className="py-6 text-center text-sm text-ink-soft">{porMes ? "No hay facturas emitidas en este mes." : "No hay facturas que coincidan con la búsqueda."}</p>
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
