import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { PanelAccionesEmpleados } from "@/components/PanelAccionesEmpleados";
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
  fecha_baja: string | null;
  motivo_baja: string | null;
  detalle_baja: string | null;
};

export default async function EmpleadosPage({
  searchParams,
}: {
  searchParams: Promise<{ bajas?: string }>;
}) {
  const { bajas } = await searchParams;
  const vistaBajas = bajas === "1";
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
      "id, nombre_completo, dni, fecha_nacimiento, direccion, tipo_contratacion, forma_pago, turno, sueldo, activo, sucursal_id, sucursales(nombre), fecha_baja, motivo_baja, detalle_baja",
    )
    .eq("activo", !vistaBajas)
    .order(vistaBajas ? "fecha_baja" : "nombre_completo", { ascending: !vistaBajas })
    .returns<FilaEmpleado[]>();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar perfil={perfil!} activo={{ tipo: "empleados" }} />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[32px] font-semibold text-ink">
              {vistaBajas ? "Empleados dados de baja" : "Empleados"}
            </h1>
            {vistaBajas && (
              <p className="mt-1 text-sm text-ink-soft">
                Registro de bajas con fecha y motivo. Se conserva toda su información y se pueden reincorporar.
              </p>
            )}
          </div>
          <Link
            href={vistaBajas ? "/empleados" : "/empleados?bajas=1"}
            className="rounded-full border border-edge px-4 py-2 text-sm font-semibold text-ink-soft hover:border-brass hover:text-ink"
          >
            {vistaBajas ? "← Volver a empleados activos" : "Empleados dados de baja"}
          </Link>
        </div>

        {!vistaBajas && <PanelAccionesEmpleados sucursales={sucursales ?? []} />}

        <EmpleadosTable
          empleados={empleados ?? []}
          sucursales={sucursales ?? []}
          puedeBorrar={perfil?.rol === "admin"}
          vistaBajas={vistaBajas}
        />
      </main>
    </div>
  );
}
