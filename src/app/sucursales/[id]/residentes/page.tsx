import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { ResidenteForm } from "@/components/ResidenteForm";
import type { Perfil } from "@/lib/types";

type Params = { id: string };

type FilaResidente = {
  id: string;
  nombre: string;
  apellido: string;
  activo: boolean;
  ficha_administrativa: { obra_social: string | null; cuota_mensual: number | null } | null;
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
      "id, nombre, apellido, activo, ficha_administrativa(obra_social, cuota_mensual)",
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

        <div className="overflow-hidden rounded-2xl border border-edge bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Nombre</th>
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
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-soft">
                    Todavía no hay residentes cargados en esta sucursal.
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
