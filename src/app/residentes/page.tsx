import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { ResidenteForm } from "@/components/ResidenteForm";
import type { Perfil, Sucursal } from "@/lib/types";

type FilaResidente = {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  activo: boolean;
  sucursales: { nombre: string } | null;
  ficha_administrativa: { obra_social: string | null; cuota_mensual: number | null } | null;
};

export default async function ResidentesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol, sucursal_id, activo")
    .eq("id", user!.id)
    .single<Perfil>();

  const puedeCrear = ["admin", "administrativo", "enfermero", "cuidador"].includes(
    perfil?.rol ?? "",
  );

  const { data: sucursales } = await supabase
    .from("sucursales")
    .select("id, nombre, direccion, capacidad_camas")
    .order("nombre")
    .returns<Sucursal[]>();

  const { data: residentes } = await supabase
    .from("residentes")
    .select(
      "id, nombre, apellido, fecha_nacimiento, activo, sucursales(nombre), ficha_administrativa(obra_social, cuota_mensual)",
    )
    .order("apellido")
    .returns<FilaResidente[]>();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        nombre={perfil?.nombre_completo ?? user?.email ?? ""}
        rol={perfil?.rol ?? ""}
        activo="residentes"
      />

      <main className="flex-1 space-y-6 px-9 py-8">
        <h1 className="font-display text-2xl font-bold text-ink">Residentes</h1>

        {puedeCrear && <ResidenteForm sucursales={sucursales ?? []} />}

        <div className="overflow-hidden rounded-2xl border border-edge bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Sucursal</th>
                <th className="px-4 py-3">Obra social</th>
                <th className="px-4 py-3">Cuota</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(residentes ?? []).map((r) => (
                <tr key={r.id} className="border-b border-edge last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">
                    {r.apellido}, {r.nombre}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {r.sucursales?.nombre ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {r.ficha_administrativa?.obra_social ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {r.ficha_administrativa?.cuota_mensual != null
                      ? `$${r.ficha_administrativa.cuota_mensual}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.activo
                          ? "rounded-full bg-brass-soft px-2 py-0.5 text-xs font-medium text-brass"
                          : "rounded-full bg-edge px-2 py-0.5 text-xs font-medium text-ink-soft"
                      }
                    >
                      {r.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/residentes/${r.id}/evolucion`}
                      className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                    >
                      Evolución
                    </Link>
                  </td>
                </tr>
              ))}
              {(residentes ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink-soft">
                    Todavía no hay residentes cargados.
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
