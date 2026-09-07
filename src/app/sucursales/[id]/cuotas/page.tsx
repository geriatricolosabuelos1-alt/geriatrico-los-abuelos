import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { TarjetaArancel } from "@/components/TarjetaArancel";
import type { Perfil } from "@/lib/types";

type Params = { id: string };

type FilaResidenteArancel = {
  id: string;
  nombre: string;
  apellido: string;
  fecha_ingreso: string | null;
  ficha_administrativa: {
    obra_social: string | null;
    cuota_mensual: number | null;
    monto_cobertura_obra_social: number | null;
    porcentaje_recargo_mora: number | null;
  } | null;
};

export default async function CuotasSucursalPage({
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

  const { data: residentes } = await supabase
    .from("residentes")
    .select(
      "id, nombre, apellido, fecha_ingreso, ficha_administrativa(obra_social, cuota_mensual, monto_cobertura_obra_social, porcentaje_recargo_mora)",
    )
    .eq("sucursal_id", id)
    .eq("activo", true)
    .order("apellido")
    .returns<FilaResidenteArancel[]>();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "cuotas" }}
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">
            {sucursal.nombre}
          </p>
          <h1 className="font-display text-2xl font-bold text-ink">Aranceles</h1>
        </div>

        <div className="space-y-3">
          {(residentes ?? []).map((r) => (
            <TarjetaArancel
              key={r.id}
              residente={{
                id: r.id,
                nombre: r.nombre,
                apellido: r.apellido,
                fecha_ingreso: r.fecha_ingreso,
              }}
              sucursalId={id}
              obraSocial={r.ficha_administrativa?.obra_social ?? null}
              cuotaMensual={r.ficha_administrativa?.cuota_mensual ?? null}
              montoCobertura={r.ficha_administrativa?.monto_cobertura_obra_social ?? null}
              porcentajeRecargo={r.ficha_administrativa?.porcentaje_recargo_mora ?? null}
            />
          ))}
          {(residentes ?? []).length === 0 && (
            <p className="rounded-2xl border border-edge bg-card p-6 text-center text-ink-soft">
              No hay residentes activos en esta sucursal.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
