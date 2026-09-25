import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { ReciboSueldoEditor } from "@/components/ReciboSueldoEditor";
import type { ItemRecibo } from "@/app/empleados/[id]/recibo/actions";
import type { Empleado, Perfil } from "@/lib/types";

type Params = { id: string };
type Busqueda = { periodo?: string };

const ETIQUETA_CONTRATACION: Record<string, string> = {
  monotributo: "Monotributo",
  relacion_dependencia: "Relación de dependencia",
};

const ETIQUETA_PAGO: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
};

// Aportes del trabajador en relación de dependencia (editables en el recibo).
const APORTES_DEPENDENCIA: { concepto: string; porcentaje: number }[] = [
  { concepto: "Jubilación (11%)", porcentaje: 0.11 },
  { concepto: "Ley 19.032 - PAMI (3%)", porcentaje: 0.03 },
  { concepto: "Obra social (3%)", porcentaje: 0.03 },
];

function periodoActual(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    .format(new Date())
    .slice(0, 7);
}

function itemsAutomaticos(empleado: Empleado): ItemRecibo[] {
  const basico = Number(empleado.sueldo ?? 0);
  const items: ItemRecibo[] = [{ concepto: "Sueldo básico", tipo: "haber", monto: basico }];
  if (empleado.tipo_contratacion === "relacion_dependencia") {
    for (const a of APORTES_DEPENDENCIA) {
      items.push({ concepto: a.concepto, tipo: "descuento", monto: Math.round(basico * a.porcentaje * 100) / 100 });
    }
  }
  return items;
}

export default async function ReciboSueldoPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Busqueda>;
}) {
  const { id } = await params;
  const { periodo: periodoParam } = await searchParams;
  const periodo = periodoParam && /^\d{4}-\d{2}$/.test(periodoParam) ? periodoParam : periodoActual();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: empleado }, { data: reciboGuardado }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre_completo, rol, sucursal_id, activo")
      .eq("id", user!.id)
      .single<Perfil>(),
    supabase
      .from("empleados")
      .select(
        "id, sucursal_id, perfil_id, nombre_completo, dni, fecha_nacimiento, direccion, tipo_contratacion, forma_pago, turno, sueldo, activo",
      )
      .eq("id", id)
      .single<Empleado>(),
    supabase
      .from("recibos_sueldo")
      .select("items, fecha_pago")
      .eq("empleado_id", id)
      .eq("periodo", periodo)
      .maybeSingle<{ items: ItemRecibo[]; fecha_pago: string | null }>(),
  ]);

  if (!empleado || !perfil) notFound();

  const { data: sucursal } = await supabase
    .from("sucursales")
    .select("nombre, direccion")
    .eq("id", empleado.sucursal_id)
    .single<{ nombre: string; direccion: string | null }>();

  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

  return (
    <div className="flex min-h-screen w-full print:block">
      <div className="print:hidden">
        <Sidebar perfil={perfil!} activo={{ tipo: "empleados" }} />
      </div>

      <main className="flex-1 space-y-6 px-9 py-8 print:p-0">
        <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
          <div>
            <Link
              href="/empleados"
              className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
            >
              ← Empleados
            </Link>
            <h1 className="font-display text-[32px] font-semibold text-ink">Recibo de sueldo</h1>
            <p className="text-sm text-ink-soft">{empleado.nombre_completo}</p>
          </div>
          <form className="flex items-end gap-2">
            <div>
              <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-ink-soft">
                Período
              </label>
              <input
                type="month"
                name="periodo"
                defaultValue={periodo}
                className="rounded-lg border border-edge bg-panel-deep px-3 py-2 text-sm text-ink"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg border border-edge px-3 py-2 text-sm text-ink hover:border-brass"
            >
              Cambiar
            </button>
          </form>
        </div>

        <ReciboSueldoEditor
          key={periodo}
          empleadoId={id}
          periodo={periodo}
          fechaPagoInicial={reciboGuardado?.fecha_pago ?? hoy}
          itemsIniciales={reciboGuardado?.items ?? itemsAutomaticos(empleado)}
          guardadoPreviamente={!!reciboGuardado}
          empleador={{ nombre: sucursal?.nombre ? `Residencia ${sucursal.nombre}` : "Los Abuelos", direccion: sucursal?.direccion ?? null }}
          empleado={{
            nombre: empleado.nombre_completo,
            dni: empleado.dni,
            contratacion: empleado.tipo_contratacion
              ? (ETIQUETA_CONTRATACION[empleado.tipo_contratacion] ?? empleado.tipo_contratacion)
              : "—",
            formaPago: empleado.forma_pago ? (ETIQUETA_PAGO[empleado.forma_pago] ?? empleado.forma_pago) : "—",
            turno: empleado.turno,
          }}
        />
      </main>
    </div>
  );
}
