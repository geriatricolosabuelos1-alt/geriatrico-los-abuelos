import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { EmpleadoForm } from "@/components/EmpleadoForm";
import type { Perfil, Sucursal } from "@/lib/types";

type FilaEmpleado = {
  id: string;
  nombre_completo: string;
  dni: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  tipo_contratacion: string | null;
  forma_pago: string | null;
  turno: string | null;
  sueldo: number | null;
  activo: boolean;
  sucursales: { nombre: string } | null;
};

const ETIQUETA_CONTRATACION: Record<string, string> = {
  monotributo: "Monotributo",
  relacion_dependencia: "Relación de dependencia",
};

const ETIQUETA_PAGO: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
};

export default async function EmpleadosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol, sucursal_id, activo")
    .eq("id", user!.id)
    .single<Perfil>();

  const { data: sucursales } = await supabase
    .from("sucursales")
    .select("id, nombre, direccion, capacidad_camas")
    .order("nombre")
    .returns<Sucursal[]>();

  const { data: empleados } = await supabase
    .from("empleados")
    .select(
      "id, nombre_completo, dni, fecha_nacimiento, direccion, tipo_contratacion, forma_pago, turno, sueldo, activo, sucursales(nombre)",
    )
    .order("nombre_completo")
    .returns<FilaEmpleado[]>();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar perfil={perfil!} activo={{ tipo: "empleados" }} />

      <main className="flex-1 space-y-6 px-9 py-8">
        <h1 className="font-display text-2xl font-bold text-ink">Empleados</h1>

        <EmpleadoForm sucursales={sucursales ?? []} />

        <div className="overflow-x-auto rounded-2xl border border-edge bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Sucursal</th>
                <th className="px-4 py-3">DNI</th>
                <th className="px-4 py-3">Nacimiento</th>
                <th className="px-4 py-3">Domicilio</th>
                <th className="px-4 py-3">Contratación</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3">Turno</th>
                <th className="px-4 py-3">Sueldo</th>
              </tr>
            </thead>
            <tbody>
              {(empleados ?? []).map((e) => (
                <tr key={e.id} className="border-b border-edge last:border-0">
                  <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                    {e.nombre_completo}
                  </td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                    {e.sucursales?.nombre ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{e.dni ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                    {e.fecha_nacimiento
                      ? new Date(e.fecha_nacimiento + "T00:00:00").toLocaleDateString("es-AR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{e.direccion ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                    {e.tipo_contratacion
                      ? (ETIQUETA_CONTRATACION[e.tipo_contratacion] ?? e.tipo_contratacion)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                    {e.forma_pago ? (ETIQUETA_PAGO[e.forma_pago] ?? e.forma_pago) : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{e.turno ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                    {e.sueldo != null ? `$${e.sueldo}` : "—"}
                  </td>
                </tr>
              ))}
              {(empleados ?? []).length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-ink-soft">
                    Todavía no hay empleados cargados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
