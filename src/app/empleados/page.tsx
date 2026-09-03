import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { EmpleadoForm } from "@/components/EmpleadoForm";
import type { Perfil, Sucursal } from "@/lib/types";

type FilaEmpleado = {
  id: string;
  nombre_completo: string;
  tipo_contratacion: string;
  forma_pago: string;
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
      "id, nombre_completo, tipo_contratacion, forma_pago, turno, sueldo, activo, sucursales(nombre)",
    )
    .order("nombre_completo")
    .returns<FilaEmpleado[]>();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar perfil={perfil!} activo={{ tipo: "empleados" }} />

      <main className="flex-1 space-y-6 px-9 py-8">
        <h1 className="font-display text-2xl font-bold text-ink">Empleados</h1>

        <EmpleadoForm sucursales={sucursales ?? []} />

        <div className="overflow-hidden rounded-2xl border border-edge bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Sucursal</th>
                <th className="px-4 py-3">Contratación</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3">Turno</th>
                <th className="px-4 py-3">Sueldo</th>
              </tr>
            </thead>
            <tbody>
              {(empleados ?? []).map((e) => (
                <tr key={e.id} className="border-b border-edge last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">
                    {e.nombre_completo}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {e.sucursales?.nombre ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {ETIQUETA_CONTRATACION[e.tipo_contratacion] ?? e.tipo_contratacion}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {ETIQUETA_PAGO[e.forma_pago] ?? e.forma_pago}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{e.turno ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {e.sueldo != null ? `$${e.sueldo}` : "—"}
                  </td>
                </tr>
              ))}
              {(empleados ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink-soft">
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
