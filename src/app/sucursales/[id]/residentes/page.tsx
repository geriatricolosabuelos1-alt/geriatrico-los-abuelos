import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { ResidenteForm } from "@/components/ResidenteForm";
import { ResidentesTable } from "@/components/ResidentesTable";
import type { Perfil } from "@/lib/types";

type Params = { id: string };

type FilaResidente = {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  fecha_ingreso: string | null;
  fecha_egreso: string | null;
  contacto_familiar: string | null;
  telefono_familiar: string | null;
  activo: boolean;
  ficha_administrativa: { obra_social: string | null; tipo_cobertura: string | null; cuota_mensual: number | null } | null;
};

export default async function ResidentesSucursalPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol, sucursal_id, activo")
    .eq("id", user!.id)
    .single<Perfil>();

  const { data: sucursal } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .eq("id", id)
    .single<{ id: string; nombre: string }>();

  if (!sucursal || !perfil) {
    notFound();
  }

  const puedeCrear = ["admin", "administrativo", "enfermero", "cuidador"].includes(
    perfil.rol,
  );

  const { data: residentes } = await supabase
    .from("residentes")
    .select(
      "id, nombre, apellido, fecha_nacimiento, fecha_ingreso, fecha_egreso, contacto_familiar, telefono_familiar, activo, ficha_administrativa(obra_social, tipo_cobertura, cuota_mensual)",
    )
    .eq("sucursal_id", id)
    .order("apellido")
    .returns<FilaResidente[]>();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "residentes" }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">
            {sucursal.nombre}
          </p>
          <h1 className="font-display text-2xl font-bold text-ink">Residentes</h1>
        </div>

        {puedeCrear && <ResidenteForm sucursalId={id} />}

        <ResidentesTable
          sucursalId={id}
          residentes={residentes ?? []}
          puedeEditar={puedeCrear}
          puedeBorrar={perfil.rol === "admin"}
        />
      </main>
    </div>
  );
}
