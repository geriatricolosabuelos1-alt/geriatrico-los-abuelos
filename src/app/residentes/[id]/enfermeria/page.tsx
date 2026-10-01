import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { BotonPdfSignos, FilaSignosVitales } from "@/components/SignosVitales";
import { ENCABEZADOS_SIGNOS } from "@/lib/signosVitales";
import { hoyArgentina, nombreMes } from "@/lib/fechas";
import { calcularEdad } from "@/lib/residentes";
import type { SignosVitales } from "@/app/sucursales/[id]/enfermeria/actions";
import type { Perfil } from "@/lib/types";

type Params = { id: string };
type SearchParams = { mes?: string };

function desplazarMes(mes: string, delta: number): string {
  const [anio, m] = mes.split("-").map(Number);
  const d = new Date(anio, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function EnfermeriaResidentePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { mes: mesParam } = await searchParams;
  const hoy = hoyArgentina();
  const mesActual = hoy.slice(0, 7);
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam) && mesParam <= mesActual ? mesParam : mesActual;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: residente }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre_completo, rol, sucursal_id, activo")
      .eq("id", user!.id)
      .single<Perfil>(),
    supabase
      .from("residentes")
      .select("id, nombre, apellido, fecha_nacimiento, sucursal_id, ficha_administrativa(obra_social)")
      .eq("id", id)
      .single<{
        id: string;
        nombre: string;
        apellido: string;
        fecha_nacimiento: string | null;
        sucursal_id: string;
        ficha_administrativa: { obra_social: string | null } | null;
      }>(),
  ]);

  if (!perfil || !residente) notFound();

  const [anio, numMes] = mes.split("-").map(Number);
  const ultimoDia = mes === mesActual ? Number(hoy.slice(8, 10)) : new Date(anio, numMes, 0).getDate();
  const { data: registros } = await supabase
    .from("signos_vitales")
    .select("residente_id, fecha, tension_arterial, frecuencia_cardiaca, frecuencia_respiratoria, saturacion_o2, temperatura")
    .eq("residente_id", id)
    .gte("fecha", `${mes}-01`)
    .lte("fecha", `${mes}-${String(ultimoDia).padStart(2, "0")}`)
    .returns<SignosVitales[]>();
  const porFecha = new Map((registros ?? []).map((r) => [r.fecha, r]));

  // Del día más reciente al primero del mes, para cargar rápido el de hoy.
  const fechas = Array.from({ length: ultimoDia }, (_, i) => `${mes}-${String(ultimoDia - i).padStart(2, "0")}`);
  const edad = calcularEdad(residente!.fecha_nacimiento);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{ tipo: "sucursal", sucursalId: residente!.sucursal_id, seccion: "enfermeria", area: "medicina" }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href={`/sucursales/${residente!.sucursal_id}/enfermeria`}
              className="text-xs font-semibold uppercase tracking-widest text-brass hover:text-ink"
            >
              ← Enfermería
            </Link>
            <h1 className="font-display text-[32px] font-semibold text-ink">Control de signos vitales</h1>
            <p className="mt-1 text-sm text-ink">
              {residente!.apellido}, {residente!.nombre}
              <span className="text-ink-soft">
                {" "}
                · Edad: {edad ?? "—"} · Obra social: {residente!.ficha_administrativa?.obra_social ?? "—"}
              </span>
            </p>
          </div>
          <BotonPdfSignos filtro={{ residenteId: id }} mesInicial={mes} etiqueta="Imprimir planilla (PDF)" />
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Link href={`?mes=${desplazarMes(mes, -1)}`} className="text-brass hover:text-ink">
            ‹ Mes anterior
          </Link>
          <span className="font-semibold capitalize text-ink">{nombreMes(mes)}</span>
          {mes < mesActual && (
            <Link href={`?mes=${desplazarMes(mes, 1)}`} className="text-brass hover:text-ink">
              Mes siguiente ›
            </Link>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                <th className="px-3 py-2">Fecha</th>
                {ENCABEZADOS_SIGNOS.map((e) => (
                  <th key={e} className="px-1.5 py-2">
                    {e}
                  </th>
                ))}
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {fechas.map((f) => (
                <FilaSignosVitales
                  key={f}
                  residenteId={id}
                  fecha={f}
                  registro={porFecha.get(f)}
                  etiqueta={
                    <span className={f === hoy ? "font-semibold text-brass" : ""}>
                      {f.slice(8, 10)}-{f.slice(5, 7)}
                      {f === hoy && " (hoy)"}
                    </span>
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
