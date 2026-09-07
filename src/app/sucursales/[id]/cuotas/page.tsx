import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { PagoForm } from "@/components/PagoForm";
import { marcarPagado } from "./actions";
import type { Perfil } from "@/lib/types";

type Params = { id: string };

type FilaPago = {
  id: string;
  monto: number;
  mes: number;
  anio: number;
  estado: string;
  fecha_pago: string | null;
  residentes: { nombre: string; apellido: string } | null;
};

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

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
    .select("id, nombre, apellido")
    .eq("sucursal_id", id)
    .eq("activo", true)
    .order("apellido")
    .returns<{ id: string; nombre: string; apellido: string }[]>();

  const { data: pagos } = await supabase
    .from("pagos")
    .select("id, monto, mes, anio, estado, fecha_pago, residentes(nombre, apellido)")
    .eq("sucursal_id", id)
    .order("anio", { ascending: false })
    .order("mes", { ascending: false })
    .returns<FilaPago[]>();

  const marcarPagadoConSucursal = marcarPagado.bind(null, id);

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

        <PagoForm sucursalId={id} residentes={residentes ?? []} />

        <div className="overflow-hidden rounded-2xl border border-edge bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-edge bg-panel-deep text-[0.65rem] font-semibold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Residente</th>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(pagos ?? []).map((p) => (
                <tr key={p.id} className="border-b border-edge last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">
                    {p.residentes ? `${p.residentes.apellido}, ${p.residentes.nombre}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {MESES[p.mes]} {p.anio}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">${p.monto}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        p.estado === "pagado"
                          ? "rounded-full bg-brass-soft px-2 py-0.5 text-xs font-medium text-brass"
                          : "rounded-full bg-edge px-2 py-0.5 text-xs font-medium text-ink-soft"
                      }
                    >
                      {p.estado === "pagado" ? "Pagado" : "Pendiente"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.estado === "pendiente" && (
                      <form action={marcarPagadoConSucursal.bind(null, p.id)}>
                        <button
                          type="submit"
                          className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
                        >
                          Marcar pagado
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {(pagos ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-soft">
                    Todavía no hay aranceles cargados.
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
