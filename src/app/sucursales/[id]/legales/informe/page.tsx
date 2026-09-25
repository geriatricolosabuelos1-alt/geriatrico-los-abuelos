import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotonImprimir } from "@/components/BotonImprimir";
import { EstiloFoliado } from "@/components/EstiloFoliado";
import { listarItemsHabilitacion } from "@/app/sucursales/[id]/legales/habilitacion/actions";
import { listarContratosSalud, listarRetirosResiduos } from "@/app/sucursales/[id]/legales/sanitario-actions";
import { listarLibretas } from "@/app/sucursales/[id]/legales/libretas-actions";
import type { HabilitacionDocumento } from "@/lib/types";
import { diasHastaFecha, mesAnioArgentina } from "@/lib/fechas";

type Params = { id: string };

function fecha(valor: string | null | undefined): string {
  return valor ? new Date(valor + "T00:00:00").toLocaleDateString("es-AR") : "—";
}

function diasPara(valor: string): number {
  return diasHastaFecha(valor);
}

function estadoVencimiento(valor: string | null): string {
  if (!valor) return "—";
  const dias = diasPara(valor);
  if (dias < 0) return "VENCIDO";
  if (dias <= 30) return `Vence en ${dias} días`;
  return "Vigente";
}

const CELDA = "border border-neutral-400 px-1.5 py-1 align-top";
const CABECERA = `${CELDA} bg-neutral-100 text-left text-[0.62rem] uppercase`;

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 border-b border-black pb-0.5 text-sm font-bold uppercase tracking-wide">{titulo}</h2>
      {children}
    </section>
  );
}

export default async function InformeLegalesPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  const anio = mesAnioArgentina().anio;

  const [{ data: sucursal }, items, { data: docs }, contratos, residuos, libretas, { data: emergencias }] =
    await Promise.all([
      supabase
        .from("sucursales")
        .select("id, nombre, direccion")
        .eq("id", id)
        .single<{ id: string; nombre: string; direccion: string | null }>(),
      listarItemsHabilitacion(),
      supabase
        .from("habilitacion_documentos")
        .select("id, sucursal_id, item_id, archivo_url, nombre_archivo, fecha_presentacion, notas, updated_at")
        .eq("sucursal_id", id)
        .returns<HabilitacionDocumento[]>(),
      listarContratosSalud(id),
      listarRetirosResiduos(id),
      listarLibretas(id),
      supabase
        .from("emergencias")
        .select("prestador, satisfactoria")
        .eq("sucursal_id", id)
        .gte("fecha", `${anio}-01-01`)
        .returns<{ prestador: string; satisfactoria: boolean | null }[]>(),
    ]);

  if (!sucursal) notFound();

  const docPorItem = new Map((docs ?? []).map((d) => [d.item_id, d]));
  const categorias = [...new Set(items.map((i) => i.categoria))];
  const presentados = items.filter((i) => {
    const d = docPorItem.get(i.id);
    return d && (d.archivo_url || d.fecha_presentacion);
  }).length;

  const emergenciasPorPrestador = new Map<string, { total: number; si: number; no: number }>();
  for (const e of emergencias ?? []) {
    const p = emergenciasPorPrestador.get(e.prestador) ?? { total: 0, si: 0, no: 0 };
    p.total++;
    if (e.satisfactoria === true) p.si++;
    if (e.satisfactoria === false) p.no++;
    emergenciasPorPrestador.set(e.prestador, p);
  }

  return (
    <div className="flex min-h-screen w-full justify-center bg-panel px-4 py-10 print:block print:min-h-0 print:bg-white print:p-0">
      <EstiloFoliado pie={`Documentación legal · ${sucursal.nombre}`} />
      <div className="w-full max-w-[860px] rounded-2xl border border-edge bg-white p-10 text-[0.72rem] text-black shadow-2xl print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={`/sucursales/${id}/legales/habilitacion`}
            className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
          >
            ← Volver a Legales
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href={`/sucursales/${id}/legales/legajos`}
              className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
            >
              Legajos de residentes foliados
            </Link>
            <BotonImprimir />
          </div>
        </div>

        <header className="border-b-2 border-black pb-2">
          <p className="text-[0.65rem] uppercase tracking-widest text-neutral-600">Documentación legal</p>
          <h1 className="text-xl font-bold">Residencia {sucursal.nombre}</h1>
          {sucursal.direccion && <p>{sucursal.direccion}</p>}
          <p className="text-neutral-600">Emitido el {new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</p>
        </header>

        <Seccion titulo={`1. Habilitación (${presentados} de ${items.length} ítems presentados)`}>
          {categorias.map((cat) => (
            <div key={cat} className="mb-3">
              <p className="mb-1 font-semibold">{cat}</p>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={CABECERA}>Requisito</th>
                    <th className={`${CABECERA} w-24`}>Estado</th>
                    <th className={`${CABECERA} w-24`}>Presentado</th>
                    <th className={CABECERA}>Archivo / notas</th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter((i) => i.categoria === cat)
                    .map((i) => {
                      const d = docPorItem.get(i.id);
                      const ok = !!d && !!(d.archivo_url || d.fecha_presentacion);
                      return (
                        <tr key={i.id} className="break-inside-avoid">
                          <td className={CELDA}>{i.descripcion}</td>
                          <td className={`${CELDA} font-semibold`}>{ok ? "Presentado" : "PENDIENTE"}</td>
                          <td className={CELDA}>{fecha(d?.fecha_presentacion)}</td>
                          <td className={CELDA}>
                            {[d?.nombre_archivo, d?.notas].filter(Boolean).join(" — ") || "—"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ))}
          {items.length === 0 && <p className="text-neutral-600">Sin ítems de habilitación cargados.</p>}
        </Seccion>

        <Seccion titulo="2. Contratos con proveedores de salud (Área Protegida)">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={CABECERA}>Proveedor</th>
                <th className={CABECERA}>Tipo</th>
                <th className={CABECERA}>Contacto</th>
                <th className={CABECERA}>Vencimiento</th>
                <th className={CABECERA}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => (
                <tr key={c.id}>
                  <td className={CELDA}>{c.proveedor}</td>
                  <td className={CELDA}>{c.tipo === "area_protegida" ? "Área Protegida" : "Otro"}</td>
                  <td className={CELDA}>{c.contacto ?? "—"}</td>
                  <td className={CELDA}>{fecha(c.fecha_vencimiento)}</td>
                  <td className={`${CELDA} font-semibold`}>{estadoVencimiento(c.fecha_vencimiento)}</td>
                </tr>
              ))}
              {contratos.length === 0 && (
                <tr>
                  <td colSpan={5} className={CELDA}>
                    Sin contratos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Seccion>

        <Seccion titulo="3. Libretas sanitarias del personal">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={CABECERA}>Empleado</th>
                <th className={CABECERA}>DNI</th>
                <th className={CABECERA}>N° libreta</th>
                <th className={CABECERA}>Emitida por</th>
                <th className={CABECERA}>Vigente hasta</th>
                <th className={CABECERA}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {libretas.map((e) => (
                <tr key={e.id} className="break-inside-avoid">
                  <td className={CELDA}>{e.nombre_completo}</td>
                  <td className={CELDA}>{e.dni ?? "—"}</td>
                  <td className={CELDA}>{e.libreta?.numero ?? "—"}</td>
                  <td className={CELDA}>{e.libreta?.emisor ?? "—"}</td>
                  <td className={CELDA}>{fecha(e.libreta?.fecha_vencimiento)}</td>
                  <td className={`${CELDA} font-semibold`}>
                    {e.libreta ? estadoVencimiento(e.libreta.fecha_vencimiento) : "SIN LIBRETA"}
                  </td>
                </tr>
              ))}
              {libretas.length === 0 && (
                <tr>
                  <td colSpan={6} className={CELDA}>
                    Sin empleados activos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Seccion>

        <Seccion titulo="4. Retiro de residuos patogénicos">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={CABECERA}>Fecha</th>
                <th className={CABECERA}>Empresa transportista</th>
                <th className={CABECERA}>Kg</th>
                <th className={CABECERA}>N° manifiesto</th>
              </tr>
            </thead>
            <tbody>
              {residuos.map((r) => (
                <tr key={r.id} className="break-inside-avoid">
                  <td className={CELDA}>{fecha(r.fecha)}</td>
                  <td className={CELDA}>{r.empresa}</td>
                  <td className={CELDA}>{r.cantidad_kg ?? "—"}</td>
                  <td className={CELDA}>{r.numero_manifiesto ?? "—"}</td>
                </tr>
              ))}
              {residuos.length === 0 && (
                <tr>
                  <td colSpan={4} className={CELDA}>
                    Sin retiros registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Seccion>

        <Seccion titulo={`5. Servicio de emergencias ${anio}`}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={CABECERA}>Prestador</th>
                <th className={CABECERA}>Llamadas</th>
                <th className={CABECERA}>Satisfactorias</th>
                <th className={CABECERA}>No satisfactorias</th>
              </tr>
            </thead>
            <tbody>
              {[...emergenciasPorPrestador.entries()].map(([p, v]) => (
                <tr key={p}>
                  <td className={CELDA}>{p}</td>
                  <td className={CELDA}>{v.total}</td>
                  <td className={CELDA}>{v.si}</td>
                  <td className={CELDA}>{v.no}</td>
                </tr>
              ))}
              {emergenciasPorPrestador.size === 0 && (
                <tr>
                  <td colSpan={4} className={CELDA}>
                    Sin llamadas registradas en {anio}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Seccion>
      </div>
    </div>
  );
}
