import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { BotonImprimir } from "@/components/BotonImprimir";
import { puedeVerSeguridad } from "@/lib/auditoria";
import { ZONA_ARGENTINA, finDiaArgentina, hoyArgentina, inicioDiaArgentina } from "@/lib/fechas";
import type { Perfil } from "@/lib/types";

const POR_PAGINA = 100;

// Nombre de cada tabla como la conoce el usuario (el módulo del sistema).
const MODULO: Record<string, string> = {
  alertas_medicacion: "Alertas de medicación",
  alertas_nutricion: "Alertas de nutrición",
  alimentacion_enteral: "Alimentación enteral",
  arca_config: "Configuración de ARCA",
  cambios_medicacion: "Cambios de medicación",
  cargos_extra_residente: "Cargos extra",
  catalogo_medicamentos: "Catálogo de medicamentos",
  contratos_editados: "Contratos",
  contratos_proveedores_salud: "Certificaciones y proveedores",
  control_heladeras: "Control de heladeras",
  documentos_residente: "Documentos del residente",
  dosis_administradas: "Dosis administradas",
  emergencias: "Emergencias / ambulancias",
  empleados: "Empleados",
  evaluaciones_mna: "Evaluación MNA",
  evoluciones_medicas: "Evoluciones médicas",
  evoluciones_medicas_addendas: "Addendas de evolución",
  facturas_arca: "Facturas ARCA",
  ficha_administrativa: "Ficha administrativa",
  ficha_medica: "Ficha médica",
  ficha_nutricional: "Ficha nutricional",
  fichadas: "Fichadas (horario)",
  gastos: "Gastos",
  gastos_fijos_catalogo: "Gastos fijos",
  habilitacion_documentos: "Habilitación (documentos)",
  ingresos_medicamento: "Ingresos de medicamentos",
  insumos: "Inventario (insumos)",
  interconsultas: "Interconsultas",
  items_habilitacion: "Habilitación (checklist)",
  kinesiologia_evaluaciones: "Kinesiología (evaluaciones)",
  kinesiologia_sesiones: "Kinesiología (sesiones)",
  libretas_sanitarias: "Libretas sanitarias",
  medicamentos_residente: "Medicación del residente",
  mediciones_antropometricas: "Mediciones antropométricas",
  menu_semanal: "Menú semanal",
  movimientos_inventario: "Movimientos de inventario",
  notas_evolucion: "Notas de evolución",
  pagos: "Cuotas / pagos",
  pagos_historial: "Historial de pagos",
  perfiles: "Cuentas de usuario",
  prescripcion_dietaria: "Prescripción dietaria",
  recetas_medicamento: "Recetario",
  recibos_sueldo: "Recibos de sueldo",
  registro_ingesta: "Registro de ingesta",
  residentes: "Residentes",
  restricciones_residente: "Restricciones del residente",
  retiros_residuos_patogenicos: "Residuos patogénicos",
  sucursales: "Sedes",
  turnos: "Turnos",
  turnos_cubiertos: "Turnos cubiertos",
  turnos_programados: "Turnos programados",
  vacunaciones_residente: "Vacunación",
  valoracion_deglucion: "Valoración de deglución",
};

const ACCION: Record<string, { texto: string; estilo: string }> = {
  ALTA: { texto: "Alta", estilo: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  MODIFICACION: { texto: "Modificación", estilo: "border-amber-300 bg-amber-50 text-amber-800" },
  BAJA: { texto: "Eliminación", estilo: "border-red-300 bg-red-50 text-red-800" },
  INGRESO: { texto: "Ingreso", estilo: "border-sky-300 bg-sky-50 text-sky-800" },
  INGRESO_FALLIDO: { texto: "Ingreso fallido", estilo: "border-red-300 bg-red-50 text-red-800" },
  CUENTA: { texto: "Cuentas", estilo: "border-violet-300 bg-violet-50 text-violet-800" },
};

type Movimiento = {
  id: number;
  fecha: string;
  usuario_id: string | null;
  usuario: string | null;
  nombre: string | null;
  accion: string;
  tabla: string | null;
  registro_id: string | null;
  sucursal_id: string | null;
  descripcion: string | null;
  cambios: Record<string, { antes: unknown; despues: unknown }> | null;
  datos: Record<string, unknown> | null;
};

type Filtros = {
  usuario?: string;
  desde?: string;
  hasta?: string;
  modulo?: string;
  accion?: string;
  pagina?: string;
};

const CAMPOS_TECNICOS = new Set(["id", "created_at", "updated_at"]);

function fechaHora(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_ARGENTINA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function etiquetaCampo(campo: string): string {
  const texto = campo.replace(/_id$/, "").replace(/_/g, " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function valor(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (v === true) return "Sí";
  if (v === false) return "No";
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return fechaHora(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.split("-").reverse().join("/");
    return v.length > 300 ? `${v.slice(0, 300)}…` : v;
  }
  const json = JSON.stringify(v);
  return json.length > 300 ? `${json.slice(0, 300)}…` : json;
}

function textoDe(datos: Record<string, unknown> | null, campo: string): string | null {
  const v = datos?.[campo];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export default async function SeguridadPage({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const filtros = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol, sucursal_id, activo, usuario")
    .eq("id", user!.id)
    .single<Perfil & { usuario: string | null }>();

  if (!perfil || !puedeVerSeguridad(perfil.usuario)) notFound();

  const pagina = Math.max(1, Number(filtros.pagina) || 1);
  const desde = filtros.desde || "";
  const hasta = filtros.hasta || "";

  let consulta = supabase
    .from("auditoria")
    .select("*", { count: "exact" })
    .order("fecha", { ascending: false })
    .order("id", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  if (filtros.usuario === "_sistema") consulta = consulta.is("usuario", null);
  else if (filtros.usuario) consulta = consulta.eq("usuario", filtros.usuario);
  if (desde) consulta = consulta.gte("fecha", inicioDiaArgentina(desde));
  if (hasta) consulta = consulta.lte("fecha", finDiaArgentina(hasta));
  if (filtros.modulo) consulta = consulta.eq("tabla", filtros.modulo);
  if (filtros.accion) consulta = consulta.eq("accion", filtros.accion);

  const [{ data: movimientosData, count }, { data: cuentas }, { data: sedes }] = await Promise.all([
    consulta.returns<Movimiento[]>(),
    supabase
      .from("perfiles")
      .select("usuario, nombre_completo")
      .not("usuario", "is", null)
      .order("nombre_completo")
      .returns<{ usuario: string; nombre_completo: string }[]>(),
    supabase.from("sucursales").select("id, nombre").returns<{ id: string; nombre: string }[]>(),
  ]);

  const movimientos = movimientosData ?? [];
  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const nombreSede = new Map((sedes ?? []).map((s) => [s.id, s.nombre]));

  // Nombres de los residentes y empleados a los que se refiere cada movimiento.
  const idsResidentes = new Set<string>();
  const idsEmpleados = new Set<string>();
  for (const m of movimientos) {
    const r = textoDe(m.datos, "residente_id");
    const e = textoDe(m.datos, "empleado_id");
    if (r) idsResidentes.add(r);
    if (e) idsEmpleados.add(e);
  }
  const [{ data: residentes }, { data: empleados }] = await Promise.all([
    idsResidentes.size
      ? supabase
          .from("residentes")
          .select("id, nombre, apellido")
          .in("id", [...idsResidentes])
          .returns<{ id: string; nombre: string; apellido: string }[]>()
      : Promise.resolve({ data: [] as { id: string; nombre: string; apellido: string }[] }),
    idsEmpleados.size
      ? supabase
          .from("empleados")
          .select("id, nombre_completo")
          .in("id", [...idsEmpleados])
          .returns<{ id: string; nombre_completo: string }[]>()
      : Promise.resolve({ data: [] as { id: string; nombre_completo: string }[] }),
  ]);
  const nombreResidente = new Map((residentes ?? []).map((r) => [r.id, `${r.apellido}, ${r.nombre}`]));
  const nombreEmpleado = new Map((empleados ?? []).map((e) => [e.id, e.nombre_completo]));

  function sobreQuien(m: Movimiento): string | null {
    if (m.tabla === "residentes") {
      const a = textoDe(m.datos, "apellido");
      const n = textoDe(m.datos, "nombre");
      if (a || n) return `Residente: ${[a, n].filter(Boolean).join(", ")}`;
    }
    if (m.tabla === "empleados" || m.tabla === "perfiles") {
      const n = textoDe(m.datos, "nombre_completo");
      if (n) return n;
    }
    const r = textoDe(m.datos, "residente_id");
    if (r) return `Residente: ${nombreResidente.get(r) ?? "(eliminado)"}`;
    const e = textoDe(m.datos, "empleado_id");
    if (e) return `Empleado: ${nombreEmpleado.get(e) ?? "(eliminado)"}`;
    return textoDe(m.datos, "nombre") ?? textoDe(m.datos, "descripcion") ?? textoDe(m.datos, "titulo");
  }

  function quien(m: Movimiento): string {
    if (m.nombre) return `${m.nombre}${m.usuario ? ` (${m.usuario})` : ""}`;
    if (m.usuario) return m.usuario;
    if (m.tabla === "fichadas") return "Reloj de fichado (DNI)";
    return "Sistema (automático)";
  }

  const modulosOrdenados = Object.entries(MODULO).sort((a, b) => a[1].localeCompare(b[1], "es"));

  function enlacePagina(p: number): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(filtros)) if (v && k !== "pagina") q.set(k, v);
    q.set("pagina", String(p));
    return `/admin/seguridad?${q.toString()}`;
  }

  const estiloCampo =
    "rounded-lg border border-edge bg-card px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none";

  return (
    <div className="flex min-h-screen w-full">
      <div className="print:hidden">
        <Sidebar perfil={perfil} activo={{ tipo: "seguridad" }} />
      </div>

      <main className="flex-1 space-y-6 px-9 py-8 print:px-0 print:py-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brass">Administración</p>
            <h1 className="font-display text-[32px] font-semibold text-ink">Seguridad</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Todos los movimientos de cada usuario: qué cargó, cambió o borró, con fecha y hora. Los
              registros no se pueden modificar ni eliminar.
            </p>
          </div>
          <BotonImprimir />
        </div>

        <form
          method="get"
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-edge bg-card p-4 print:hidden"
        >
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
            Usuario
            <select name="usuario" defaultValue={filtros.usuario ?? ""} className={estiloCampo}>
              <option value="">Todos</option>
              {(cuentas ?? []).map((c) => (
                <option key={c.usuario} value={c.usuario}>
                  {c.nombre_completo} ({c.usuario})
                </option>
              ))}
              <option value="_sistema">Sistema / reloj de fichado</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
            Desde
            <input type="date" name="desde" defaultValue={desde} max={hoyArgentina()} className={estiloCampo} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
            Hasta
            <input type="date" name="hasta" defaultValue={hasta} max={hoyArgentina()} className={estiloCampo} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
            Módulo
            <select name="modulo" defaultValue={filtros.modulo ?? ""} className={estiloCampo}>
              <option value="">Todos</option>
              {modulosOrdenados.map(([tabla, nombre]) => (
                <option key={tabla} value={tabla}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
            Acción
            <select name="accion" defaultValue={filtros.accion ?? ""} className={estiloCampo}>
              <option value="">Todas</option>
              {Object.entries(ACCION).map(([clave, a]) => (
                <option key={clave} value={clave}>
                  {a.texto}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90"
          >
            Filtrar
          </button>
          <Link href="/admin/seguridad" className="px-2 py-2 text-sm text-ink-soft underline underline-offset-2">
            Limpiar
          </Link>
        </form>

        <p className="text-sm text-ink-soft">
          {total} movimiento{total === 1 ? "" : "s"}
          {paginas > 1 ? ` · página ${pagina} de ${paginas}` : ""}
        </p>

        {movimientos.length === 0 ? (
          <p className="rounded-2xl border border-edge bg-card p-6 text-sm text-ink-soft">
            No hay movimientos con esos filtros.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-edge bg-card">
            <ul className="divide-y divide-edge">
              {movimientos.map((m) => {
                const accion = ACCION[m.accion] ?? { texto: m.accion, estilo: "border-edge bg-card text-ink" };
                const modulo = m.tabla ? (MODULO[m.tabla] ?? m.tabla) : "Acceso al sistema";
                const sobre = sobreQuien(m);
                const cambios = m.cambios ? Object.entries(m.cambios) : [];
                const datos = m.datos
                  ? Object.entries(m.datos).filter(([k, v]) => !CAMPOS_TECNICOS.has(k) && v !== null && v !== "")
                  : [];
                const tieneDetalle = cambios.length > 0 || (m.accion !== "CUENTA" && datos.length > 0);

                return (
                  <li key={m.id} className="break-inside-avoid px-4 py-3 text-sm">
                    <details>
                      <summary className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${tieneDetalle ? "cursor-pointer" : "list-none"}`}>
                        <span className="w-[9.5rem] shrink-0 font-mono text-xs tabular-nums text-ink-soft">
                          {fechaHora(m.fecha)}
                        </span>
                        <span className="min-w-[10rem] font-medium text-ink">{quien(m)}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${accion.estilo}`}
                        >
                          {accion.texto}
                        </span>
                        <span className="text-ink">{modulo}</span>
                        {sobre && <span className="text-ink-soft">· {sobre}</span>}
                        {m.descripcion && <span className="text-ink-soft">· {m.descripcion}</span>}
                        {m.sucursal_id && (
                          <span className="ml-auto text-xs text-ink-soft">{nombreSede.get(m.sucursal_id) ?? ""}</span>
                        )}
                      </summary>

                      {tieneDetalle && (
                        <div className="mt-3 rounded-xl border border-edge bg-panel-deep p-3 text-xs">
                          {cambios.length > 0 ? (
                            <table className="w-full">
                              <thead>
                                <tr className="text-left text-ink-soft">
                                  <th className="pb-1 pr-3 font-semibold">Dato</th>
                                  <th className="pb-1 pr-3 font-semibold">Antes</th>
                                  <th className="pb-1 font-semibold">Después</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cambios.map(([campo, c]) => (
                                  <tr key={campo} className="align-top">
                                    <td className="py-0.5 pr-3 font-medium text-ink">{etiquetaCampo(campo)}</td>
                                    <td className="py-0.5 pr-3 text-red-700 line-through decoration-red-300">
                                      {valor(c.antes)}
                                    </td>
                                    <td className="py-0.5 text-emerald-800">{valor(c.despues)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2">
                              {datos.map(([campo, v]) => (
                                <div key={campo} className="flex gap-2">
                                  <dt className="font-medium text-ink">{etiquetaCampo(campo)}:</dt>
                                  <dd className="break-all text-ink-soft">{valor(v)}</dd>
                                </div>
                              ))}
                            </dl>
                          )}
                        </div>
                      )}
                    </details>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {paginas > 1 && (
          <div className="flex items-center justify-center gap-3 text-sm print:hidden">
            {pagina > 1 && (
              <Link href={enlacePagina(pagina - 1)} className="rounded-lg border border-edge px-3 py-1.5 hover:border-brass">
                ← Anteriores
              </Link>
            )}
            {pagina < paginas && (
              <Link href={enlacePagina(pagina + 1)} className="rounded-lg border border-edge px-3 py-1.5 hover:border-brass">
                Siguientes →
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
