import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { ResidentesTable } from "@/components/ResidentesTable";
import type { Perfil } from "@/lib/types";

type Params = { id: string };
type SearchParams = { vista?: string };

type FilaResidente = {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  fecha_ingreso: string | null;
  fecha_egreso: string | null;
  contacto_familiar: string | null;
  telefono_familiar: string | null;
  foto_url: string | null;
  activo: boolean;
  ficha_administrativa: { obra_social: string | null; tipo_cobertura: string | null; cuota_mensual: number | null } | null;
};

export default async function ResidentesSucursalPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { vista } = await searchParams;
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
      "id, nombre, apellido, fecha_nacimiento, fecha_ingreso, fecha_egreso, contacto_familiar, telefono_familiar, foto_url, activo, ficha_administrativa(obra_social, tipo_cobertura, cuota_mensual)",
    )
    .eq("sucursal_id", id)
    .order("apellido")
    .returns<FilaResidente[]>();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil}
        activo={{
          tipo: "sucursal",
          sucursalId: id,
          seccion: "residentes",
          area: vista === "medicina" ? "medicina" : "administrativa",
        }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">
            {sucursal.nombre}
          </p>
          <h1 className="font-display text-[32px] font-bold text-ink">Residentes</h1>
        </div>

        {puedeCrear && (
          <Link
            href={`/sucursales/${id}/residentes/nuevo`}
            className="inline-block rounded-full bg-brass px-4 py-2 text-sm font-semibold text-btn-ink hover:bg-brass/90"
          >
            + Nuevo residente
          </Link>
        )}

        <ResidentesTable
          sucursalId={id}
          residentes={residentes ?? []}
          puedeBorrar={perfil.rol === "admin"}
          esAdministrativo={["admin", "administrativo"].includes(perfil.rol)}
        />
      </main>
    </div>
  );
}
