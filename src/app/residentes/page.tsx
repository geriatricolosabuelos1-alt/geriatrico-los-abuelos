import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
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
    <>
      <NavBar
        nombre={perfil?.nombre_completo ?? user?.email ?? ""}
        rol={perfil?.rol ?? ""}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Residentes</h1>

        {puedeCrear && <ResidenteForm sucursales={sucursales ?? []} />}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
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
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {r.apellido}, {r.nombre}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.sucursales?.nombre ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.ficha_administrativa?.obra_social ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.ficha_administrativa?.cuota_mensual != null
                      ? `$${r.ficha_administrativa.cuota_mensual}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.activo
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                          : "rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
                      }
                    >
                      {r.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/residentes/${r.id}/evolucion`}
                      className="text-sm text-slate-600 underline hover:text-slate-900"
                    >
                      Evolución
                    </Link>
                  </td>
                </tr>
              ))}
              {(residentes ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    Todavía no hay residentes cargados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
