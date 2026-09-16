import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { NuevaCuentaForm } from "@/components/NuevaCuentaForm";
import { TablaCuentas } from "@/components/TablaCuentas";
import { listarCuentas } from "@/app/admin/claves/actions";
import type { Perfil, Sucursal } from "@/lib/types";

export default async function ClavesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol, sucursal_id, activo")
    .eq("id", user!.id)
    .single<Perfil>();

  if (!perfil || perfil.rol !== "admin") {
    redirect("/");
  }

  const { data: sucursales } = await supabase
    .from("sucursales")
    .select("id, nombre, direccion, capacidad_camas")
    .order("nombre")
    .returns<Sucursal[]>();

  const cuentas = await listarCuentas();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar perfil={perfil} activo={{ tipo: "claves" }} />

      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">
            Administración
          </p>
          <h1 className="font-display text-[32px] font-semibold text-ink">Claves y accesos</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Creá, editá o eliminá las cuentas de acceso al sistema: email, contraseña, rol y sede.
          </p>
        </div>

        <NuevaCuentaForm sucursales={sucursales ?? []} />

        <TablaCuentas cuentas={cuentas} sucursales={sucursales ?? []} propioId={perfil.id} />
      </main>
    </div>
  );
}
