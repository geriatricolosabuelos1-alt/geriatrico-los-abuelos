import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { HojaMenuEspecial } from "@/components/HojaMenuEspecial";
import { TarjetaMenuEspecial } from "@/components/EditorMenuEspecial";
import { obtenerMenusEspeciales } from "@/app/sucursales/[id]/nutricion/menu-especial/actions";
import type { Perfil, RolUsuario } from "@/lib/types";

type Params = { id: string };

const ROLES_EDITAN: RolUsuario[] = ["admin", "gerente_sede", "medico", "nutricionista"];

export default async function MenuEspecialPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: sucursal }, { data: residentes }, menus] = await Promise.all([
    supabase.from("perfiles").select("id, nombre_completo, rol, sucursal_id, activo").eq("id", user!.id).single<Perfil>(),
    supabase
      .from("sucursales")
      .select("id, nombre, direccion")
      .eq("id", id)
      .single<{ id: string; nombre: string; direccion: string | null }>(),
    supabase
      .from("residentes")
      .select("id, nombre, apellido")
      .eq("sucursal_id", id)
      .eq("activo", true)
      .order("apellido")
      .returns<{ id: string; nombre: string; apellido: string }[]>(),
    obtenerMenusEspeciales(id),
  ]);

  if (!sucursal || !perfil) notFound();
  const listaResidentes = (residentes ?? []).map((r) => ({ id: r.id, nombre: `${r.apellido}, ${r.nombre}` }));

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        perfil={perfil!}
        activo={{ tipo: "sucursal", sucursalId: id, seccion: "nutricion", subseccion: "menu-especial", area: "medicina" }}
      />
      <main className="flex-1 space-y-6 px-9 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brass">{sucursal!.nombre}</p>
          <h1 className="font-display text-[32px] font-semibold text-ink">Menú especial</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Adecuaciones del menú general para pacientes diabéticos y con sobrepeso/obesidad. Cada ficha se puede
            editar, asignar a los pacientes que la tienen indicada e imprimir.
          </p>
        </div>
        {menus.map((m) => (
          <TarjetaMenuEspecial
            key={m.tipo}
            sucursalId={id}
            menu={m}
            residentes={listaResidentes}
            puedeEditar={ROLES_EDITAN.includes(perfil!.rol)}
          >
            <HojaMenuEspecial menu={m} sedeNombre={sucursal!.nombre} sedeDireccion={sucursal!.direccion} />
          </TarjetaMenuEspecial>
        ))}
      </main>
    </div>
  );
}
