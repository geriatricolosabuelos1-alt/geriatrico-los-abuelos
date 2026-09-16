import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { CertificacionesClient } from "@/components/CertificacionesClient";
import { listarContratosSalud, listarRetirosResiduos } from "@/app/sucursales/[id]/legales/sanitario-actions";
import type { Perfil } from "@/lib/types";

type Params = { id: string };

export default async function CertificacionesPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, contratos, residuos] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre_completo, rol, sucursal_id, activo")
      .eq("id", user!.id)
      .single<Perfil>(),
    supabase
      .from("sucursales")
      .select("id, nombre")
      .eq("id", id)
      .single<{ id: string; nombre: string }>(),
    listarContratosSalud(id),
    listarRetirosResiduos(id),
  ]);

  if (!sucursal || !perfil) notFound();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{
          tipo: "sucursal",
          sucursalId: id,
          seccion: "legales",
          subseccion: "certificaciones",
        }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal!.nombre}</p>
          <h1 className="font-display text-[32px] font-semibold text-ink">Certificaciones y proveedores</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Contratos de Área Protegida y retiro de residuos patogénicos con sus manifiestos de carga.
          </p>
        </div>

        <CertificacionesClient sucursalId={id} contratos={contratos} residuos={residuos} />
      </main>
    </div>
  );
}
