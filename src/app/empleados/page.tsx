import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { EmpleadoForm } from "@/components/EmpleadoForm";
import { EmpleadosTable } from "@/components/EmpleadosTable";
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
  sucursal_id: string;
  sucursales: { nombre: string } | null;
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
      "id, nombre_completo, dni, fecha_nacimiento, direccion, tipo_contratacion, forma_pago, turno, sueldo, activo, sucursal_id, sucursales(nombre)",
    )
    .order("nombre_completo")
    .returns<FilaEmpleado[]>();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar perfil={perfil!} activo={{ tipo: "empleados" }} />

      <main className="flex-1 space-y-6 px-9 py-8">
        <h1 className="font-display text-[32px] font-semibold text-ink">Empleados</h1>

        <EmpleadoForm sucursales={sucursales ?? []} />

        <EmpleadosTable
          empleados={empleados ?? []}
          sucursales={sucursales ?? []}
          puedeBorrar={perfil?.rol === "admin"}
        />
      </main>
    </div>
  );
}
