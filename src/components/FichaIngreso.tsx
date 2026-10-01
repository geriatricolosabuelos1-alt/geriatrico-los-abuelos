import { createClient } from "@/lib/supabase/server";
import { calcularEdad } from "@/lib/residentes";
import type { FichaAdministrativa, FichaMedica, MedicamentoResidente, Residente } from "@/lib/types";

function fecha(valor: string | null | undefined): string | null {
  return valor ? new Date(valor + "T00:00:00").toLocaleDateString("es-AR") : null;
}

// Valor cargado, o un renglón en blanco para completar a mano.
function Dato({ etiqueta, valor, ancho = "flex-1" }: { etiqueta: string; valor: string | number | null | undefined; ancho?: string }) {
  const vacio = valor === null || valor === undefined || valor === "";
  return (
    <p className={`flex items-end gap-1.5 ${ancho}`}>
      <span className="whitespace-nowrap font-semibold">{etiqueta}:</span>
      {vacio ? (
        <span className="mb-0.5 min-w-[60px] flex-1 border-b border-neutral-500" />
      ) : (
        <span className="flex-1">{valor}</span>
      )}
    </p>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 break-inside-avoid">
      <h3 className="mb-2 border-b border-black pb-0.5 text-[0.75rem] font-bold uppercase tracking-wide">{titulo}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Fila({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-x-6 gap-y-2">{children}</div>;
}

// Ficha de ingreso del residente (una hoja), para imprimir junto con el contrato en el alta.
export async function FichaIngreso({ residenteId, sede }: { residenteId: string; sede: string }) {
  const supabase = await createClient();

  const [{ data: residente }, { data: adm }, { data: med }, { data: medicamentos }] = await Promise.all([
    supabase.from("residentes").select("*").eq("id", residenteId).single<Residente>(),
    supabase.from("ficha_administrativa").select("*").eq("residente_id", residenteId).maybeSingle<FichaAdministrativa>(),
    supabase.from("ficha_medica").select("*").eq("residente_id", residenteId).maybeSingle<FichaMedica>(),
    supabase
      .from("medicamentos_residente")
      .select("*")
      .eq("residente_id", residenteId)
      .eq("activo", true)
      .order("nombre")
      .returns<MedicamentoResidente[]>(),
  ]);

  if (!residente) return null;
  const edad = calcularEdad(residente.fecha_nacimiento);

  return (
    <article className="text-[0.78rem] leading-snug text-black">
      <header className="mb-3 flex items-start justify-between gap-4 border-b-2 border-black pb-2">
        <div>
          <p className="text-[0.65rem] uppercase tracking-widest text-neutral-600">{sede}</p>
          <h2 className="text-lg font-bold uppercase">Ficha de ingreso</h2>
          <p>
            Fecha de ingreso: <span className="font-semibold">{fecha(residente.fecha_ingreso) ?? "____/____/________"}</span>
          </p>
        </div>
        {residente.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={residente.foto_url} alt="" className="h-24 w-20 border border-black object-cover" />
        ) : (
          <div className="flex h-24 w-20 items-center justify-center border border-black text-[0.6rem] text-neutral-500">
            FOTO
          </div>
        )}
      </header>

      <Seccion titulo="1. Datos personales">
        <Fila>
          <Dato etiqueta="Apellido y nombre" valor={`${residente.apellido}, ${residente.nombre}`} />
        </Fila>
        <Fila>
          <Dato etiqueta="DNI" valor={residente.dni} />
          <Dato etiqueta="Fecha de nacimiento" valor={fecha(residente.fecha_nacimiento)} />
          <Dato etiqueta="Edad" valor={edad} ancho="w-24" />
        </Fila>
        <Fila>
          <Dato etiqueta="Nacionalidad" valor={residente.nacionalidad} />
          <Dato etiqueta="Habitación" valor={residente.habitacion} />
          <Dato etiqueta="Nivel de cuidado" valor={residente.nivel_cuidado} />
        </Fila>
      </Seccion>

      <Seccion titulo="2. Familiar / responsable">
        <Fila>
          <Dato etiqueta="Contacto familiar" valor={residente.contacto_familiar} />
          <Dato etiqueta="Teléfono" valor={residente.telefono_familiar} />
        </Fila>
        <Fila>
          <Dato etiqueta="Contratante" valor={adm?.contratante_nombre} />
          <Dato etiqueta="DNI" valor={adm?.contratante_dni} ancho="w-48" />
        </Fila>
        <Fila>
          <Dato etiqueta="Domicilio" valor={adm?.contratante_domicilio} />
        </Fila>
      </Seccion>

      <Seccion titulo="3. Cobertura">
        <Fila>
          <Dato etiqueta="Obra social / prepaga" valor={adm?.obra_social} />
          <Dato etiqueta="N° de afiliado" valor={adm?.numero_afiliado} />
        </Fila>
        <Fila>
          <Dato etiqueta="Tipo de cobertura" valor={adm?.tipo_cobertura} />
          <Dato etiqueta="Vencimiento CUD" valor={fecha(adm?.cud_vencimiento)} />
        </Fila>
      </Seccion>

      <Seccion titulo="4. Datos médicos">
        <Fila>
          <Dato etiqueta="Médico de cabecera" valor={med?.medico_cabecera} />
          <Dato etiqueta="Grupo sanguíneo" valor={med?.grupo_sanguineo} ancho="w-44" />
        </Fila>
        <Fila>
          <Dato etiqueta="Emergencias" valor={med?.medico_emergencia} />
          <Dato etiqueta="Teléfono" valor={med?.telefono_emergencia_medica} />
        </Fila>
        <Fila>
          <Dato etiqueta="Alergias" valor={med?.alergias} />
        </Fila>
        <Fila>
          <Dato etiqueta="Diagnósticos" valor={med?.diagnosticos} />
        </Fila>
        <Fila>
          <Dato etiqueta="Observaciones" valor={residente.observaciones_medicas} />
        </Fila>
      </Seccion>

      <Seccion titulo="5. Medicación al ingreso">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-neutral-100">
              {["Medicamento", "Dosis", "Frecuencia / horario", "Vía"].map((c) => (
                <th key={c} className="border border-neutral-500 px-1.5 py-1 text-left text-[0.62rem] uppercase">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(medicamentos ?? []).map((m) => (
              <tr key={m.id}>
                <td className="border border-neutral-500 px-1.5 py-1">{m.nombre}</td>
                <td className="border border-neutral-500 px-1.5 py-1">{m.dosis ?? ""}</td>
                <td className="border border-neutral-500 px-1.5 py-1">
                  {[m.frecuencia, m.horario].filter(Boolean).join(" · ")}
                </td>
                <td className="border border-neutral-500 px-1.5 py-1">{m.via_administracion ?? ""}</td>
              </tr>
            ))}
            {/* Renglones libres para completar a mano. */}
            {Array.from({ length: Math.max(3, 6 - (medicamentos ?? []).length) }, (_, i) => (
              <tr key={`vacio-${i}`}>
                {[0, 1, 2, 3].map((c) => (
                  <td key={c} className="h-6 border border-neutral-500" />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Seccion>

      <div className="mt-14 grid grid-cols-2 gap-10 break-inside-avoid">
        <div className="text-center">
          <div className="mb-1 border-t border-black" />
          <p className="text-[0.65rem] text-neutral-600">FAMILIAR / RESPONSABLE</p>
        </div>
        <div className="text-center">
          <div className="mb-1 border-t border-black" />
          <p className="text-[0.65rem] text-neutral-600">RECIBIÓ (RESIDENCIA)</p>
        </div>
      </div>
    </article>
  );
}
