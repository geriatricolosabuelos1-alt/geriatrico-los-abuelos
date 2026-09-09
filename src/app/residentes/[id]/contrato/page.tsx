import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotonImprimir } from "@/components/BotonImprimir";

type Params = { id: string };

type Residente = {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  dni: string | null;
  contacto_familiar: string | null;
  telefono_familiar: string | null;
  fecha_ingreso: string | null;
  sucursal_id: string;
};

type FichaAdministrativa = {
  obra_social: string | null;
  numero_afiliado: string | null;
};

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatearFechaLarga(fecha: string | null): string {
  if (!fecha) return "___________________";
  const d = new Date(fecha + "T00:00:00");
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatearFechaCorta(fecha: string | null): string {
  if (!fecha) return "__ / __ / ____";
  const d = new Date(fecha + "T00:00:00");
  return d.toLocaleDateString("es-AR");
}

export default async function ContratoResidentePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: residente } = await supabase
    .from("residentes")
    .select(
      "id, nombre, apellido, fecha_nacimiento, dni, contacto_familiar, telefono_familiar, fecha_ingreso, sucursal_id",
    )
    .eq("id", id)
    .single<Residente>();

  if (!residente) {
    notFound();
  }

  const [{ data: sucursal }, { data: fichaAdministrativa }] = await Promise.all([
    supabase
      .from("sucursales")
      .select("id, nombre, direccion")
      .eq("id", residente.sucursal_id)
      .single<{ id: string; nombre: string; direccion: string | null }>(),
    supabase
      .from("ficha_administrativa")
      .select("obra_social, numero_afiliado")
      .eq("residente_id", id)
      .maybeSingle<FichaAdministrativa>(),
  ]);

  const cobertura = [fichaAdministrativa?.obra_social, fichaAdministrativa?.numero_afiliado]
    .filter(Boolean)
    .join(" ");

  const ahora = new Date();

  return (
    <div className="flex min-h-screen w-full justify-center bg-panel px-4 py-10 print:block print:min-h-0 print:bg-white print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 20mm; }`}</style>

      <div className="w-full max-w-[720px] space-y-8 rounded-2xl border border-edge bg-card p-10 shadow-2xl print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none print:text-black">
        <div className="flex items-center justify-between print:hidden">
          <Link
            href={`/residentes/${id}/legajo`}
            className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
          >
            ← Volver al legajo
          </Link>
          <BotonImprimir />
        </div>

        <div className="space-y-1 text-center">
          <h1 className="font-display text-xl font-semibold text-ink print:text-black">
            Residencia de adultos mayores
          </h1>
          <p className="font-display text-2xl font-bold text-ink print:text-black">
            {sucursal?.nombre ?? ""}
          </p>
          {sucursal?.direccion && (
            <p className="text-xs text-ink-soft print:text-neutral-600">{sucursal.direccion}</p>
          )}
        </div>

        <div className="space-y-2 text-sm leading-relaxed text-ink print:text-black">
          <p>
            <span className="font-semibold">Paciente:</span> {residente.apellido}{" "}
            {residente.nombre}
          </p>
          <p>
            <span className="font-semibold">Fecha de nacimiento:</span>{" "}
            {formatearFechaLarga(residente.fecha_nacimiento)}
          </p>
          <p>
            <span className="font-semibold">DNI:</span> {residente.dni ?? "___________________"}
          </p>
          <p>
            <span className="font-semibold">Cobertura:</span>{" "}
            {cobertura || "___________________"}
          </p>
        </div>

        <p className="text-sm leading-relaxed text-ink print:text-black">
          En el día de la fecha {formatearFechaLarga(residente.fecha_ingreso) === "___________________" ? formatearFechaLarga(ahora.toISOString().slice(0, 10)) : formatearFechaLarga(residente.fecha_ingreso)} ingresa
          al hogar {sucursal?.nombre ?? ""} la/el paciente{" "}
          <span className="font-semibold">
            {residente.apellido} {residente.nombre}
          </span>
          , para cuidados permanentes en Residencia de Adultos Mayores.
        </p>

        <div className="space-y-2 text-sm leading-relaxed text-ink print:text-black">
          <p>
            <span className="font-semibold">Número de familiar de contacto:</span>{" "}
            {residente.contacto_familiar ?? "___________________"}
            {residente.telefono_familiar ? ` ${residente.telefono_familiar}` : ""}
          </p>
          <p>
            <span className="font-semibold">Fecha de ingreso:</span>{" "}
            {formatearFechaCorta(residente.fecha_ingreso)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 pt-16">
          <div className="text-center">
            <div className="mb-1 border-t border-edge print:border-black" />
            <p className="text-xs text-ink-soft print:text-neutral-600">
              Firma del familiar / responsable
            </p>
          </div>
          <div className="text-center">
            <div className="mb-1 border-t border-edge print:border-black" />
            <p className="text-xs text-ink-soft print:text-neutral-600">
              Firma del responsable de la residencia
            </p>
          </div>
        </div>

        <p className="pt-6 text-center text-[0.65rem] text-ink-soft print:text-neutral-500">
          Documento generado automáticamente el {ahora.toLocaleDateString("es-AR")} a partir de
          los datos cargados en el legajo del residente.
        </p>
      </div>
    </div>
  );
}
