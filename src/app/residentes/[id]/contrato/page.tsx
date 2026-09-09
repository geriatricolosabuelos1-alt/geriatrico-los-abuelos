import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotonImprimir } from "@/components/BotonImprimir";

type Params = { id: string };

type Residente = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  fecha_ingreso: string | null;
  sucursal_id: string;
};

type FichaAdministrativa = {
  cuota_mensual: number | null;
  contratante_nombre: string | null;
  contratante_dni: string | null;
  contratante_domicilio: string | null;
};

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "____/____/________";
  const d = new Date(fecha + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatearMonto(monto: number | null): string {
  if (!monto) return "................................";
  return new Intl.NumberFormat("es-AR").format(monto);
}

function Blanco({ valor, ancho = 24 }: { valor: string | null; ancho?: number }) {
  if (valor) return <span className="font-semibold">{valor}</span>;
  return <span className="inline-block border-b border-ink/60 print:border-black">{" ".repeat(ancho)}</span>;
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
    .select("id, nombre, apellido, dni, fecha_ingreso, sucursal_id")
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
      .select("cuota_mensual, contratante_nombre, contratante_dni, contratante_domicilio")
      .eq("residente_id", id)
      .maybeSingle<FichaAdministrativa>(),
  ]);

  const ahora = new Date();
  const nombreSucursal = sucursal?.nombre ?? "";
  const direccionSucursal = sucursal?.direccion ?? "";
  const nombreResidente = `${residente.apellido} ${residente.nombre}`;

  return (
    <div className="flex min-h-screen w-full justify-center bg-panel px-4 py-10 print:block print:min-h-0 print:bg-white print:px-0 print:py-0">
      <style>{`@page { size: A4; margin: 18mm; }`}</style>

      <div className="w-full max-w-[760px] space-y-5 rounded-2xl border border-edge bg-card p-10 text-sm leading-relaxed text-ink shadow-2xl print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none">
        <div className="flex items-center justify-between print:hidden">
          <Link
            href={`/residentes/${id}/legajo`}
            className="text-sm text-brass underline decoration-brass/40 underline-offset-2 hover:text-ink"
          >
            ← Volver al legajo
          </Link>
          <BotonImprimir />
        </div>

        <h1 className="text-center font-display text-lg font-bold uppercase text-ink print:text-black">
          Contrato de locación de servicios
        </h1>

        <p>
          Entre la Residencia {nombreSucursal} domicilio en calle {direccionSucursal} quien
          actúa en representación de la PRESTADORA, por una parte, y por la otra la Sr/Sra.{" "}
          <Blanco valor={fichaAdministrativa?.contratante_nombre ?? null} /> DNI{" "}
          <Blanco valor={fichaAdministrativa?.contratante_dni ?? null} ancho={14} />, domiciliado:{" "}
          <Blanco valor={fichaAdministrativa?.contratante_domicilio ?? null} ancho={40} /> en calidad de
          CONTRATANTE, se conviene celebrar el presente contrato sujeto a las siguientes
          cláusulas y condiciones.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA PRIMERA:</span> La PRESTADORA del
          CONTRATANTE, acepta brindar el servicio para el RESIDENTE{" "}
          <Blanco valor={nombreResidente} ancho={30} /> DNI <Blanco valor={residente.dni} ancho={14} />{" "}
          en su internación en la residencia {nombreSucursal} ubicada en {direccionSucursal} a
          partir de la fecha {formatearFecha(residente.fecha_ingreso)} con los antecedentes y
          diagnósticos médicos detallados en el ANEXO I. La PRESTADORA verá oportuno la
          realización de nuevos estudios para terminar de definir si las condiciones del
          RESIDENTE son aptas para ser incluido en el programa. Cualquier otro estudio que el
          CONTRATANTE vea necesario hacerse será abonado fuera del canon y entrará en el rubro
          &quot;gastos generales&quot; que se cobran a parte el servicio prestado. Tales pedidos
          deberán quedar documentados mediante cotizaciones adicionales y comprobantes firmados
          por ambas partes, las cuales son partes que integran este contrato.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA SEGUNDA:</span> Las Partes convienen que la
          internación y cuidado implica la asistencia geriátrica del RESIDENTE, alojamiento
          permanente y continuo cuidado e higiene personal, alimentación programada por
          nutricionistas, atención médica permanente por profesionales titulados, atención de
          enfermería por parte de personal especializado o capacitado, labor terapista, lavado y
          planchado de ropa. Quedando a voluntad y criterio de la PRESTADORA la ampliación o
          modificación de los servicios prestados, como así también la incorporación de nuevos
          servicios y sin que estos impliquen contraer nuevas obligaciones por parte de esta
          última.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA TERCERA:</span> Las partes acuerdan que el
          CONTRATANTE se obliga a pagar la suma de PESOS{" "}
          <Blanco valor={formatearMonto(fichaAdministrativa?.cuota_mensual ?? null)} ancho={20} />{" "}
          ($ {formatearMonto(fichaAdministrativa?.cuota_mensual ?? null)}) en concepto de canon
          mensual por los servicios detallados precedentemente. El pago se realiza en la fecha
          pactada, por adelantado del 1 al 10 de cada mes, correspondiendo siempre al mes que se
          va a consumir y no al mes ya consumido, excepto aquellas situaciones que se hablaron
          con anticipación.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA CUARTA:</span> Las PARTES convienen que el
          monto especificado en la cláusula anterior ha sido establecido en virtud de la
          evaluación psicofísica efectuada al RESIDENTE y que consta en el mencionado ANEXO I,
          por lo que cualquier modificación en el estado de salud de aquel, dará derecho a la
          PRESTADORA a incrementar unilateralmente el canon mensual acordado, previa
          notificación al CONTRATANTE por cualquier medio.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA QUINTA:</span> Las PARTES pactan que la demora
          en el pago del canon mensual ocasionará un incremento de este en un diez por ciento
          (10%), si se abona después de cinco (05) días de la fecha acordada, si se llegase
          abonar después de diez (10) días en adelante se cobrará un incremento del veinte por
          ciento (20%) por todo el mes. Además, el canon mensual cada dos (02) meses tendrá un
          incremento ajustado al costo de vida, este compromiso acordado entre ambas partes será
          con el solo objeto de que ninguna de las partes se vean perjudicadas.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA SEXTA:</span> Las PARTES dejan expresamente
          establecido que el canon mensual se abona por adelantado y corresponde al mes a
          consumir, no al mes ya consumido. En consecuencia, en caso de retiro del RESIDENTE de
          la institución antes de completar el mes en curso, así como en caso de fallecimiento
          del RESIDENTE, el CONTRATANTE deberá abonar igualmente la totalidad del canon mensual
          correspondiente a dicho mes, sin derecho a reintegro ni a descuento proporcional
          alguno por los días no utilizados. El retiro del RESIDENTE por parte del CONTRATANTE o
          familiar autorizado se tomará como definitivo y este pasa a ser responsable absoluto
          del EXRESIDENTE. Quedando la institución y las personas que la componen o que prestan
          servicios en ella totalmente libres de responsabilidad, culpa o reclamos, ya sean
          clínicos o legales.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA SÉPTIMA:</span> Las PARTES convienen que, a la
          falta de pago del canon mensual durante un mes, faculta a la PRESTADORA a considerar
          rescindido de pleno derecho y sin necesidad de requerimiento o notificación alguna el
          presente contrato. Quedando autorizado a trasladar al RESIDENTE al domicilio del
          CONTRATANTE denunciado en este acuerdo, siendo los gastos y costos a cargo de este
          último, habilitando además a iniciar reclamo judicial por la deuda existente por la
          vía ejecutiva.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA OCTAVA:</span> Las PARTES convienen que la
          obligación de abonar el canon mensual completo por parte del CONTRATANTE comienza a
          partir de las cero horas (00:00 Hs.) del primer día de cada mes, aunque, por cualquier
          causa que fuere, incluidas las de fuerza mayor, cesare la internación del RESIDENTE.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA NOVENA:</span> Las PARTES acuerdan que la
          adquisición de pañales descartables, en caso de uso necesario por parte del RESIDENTE,
          correrán a cargo del CONTRATANTE. Cuando los mismos no sean previstos por este, la
          PRESTADORA se reserva el derecho de proveerlos del stock con el que cuenta o
          adquirirlos y cobrar su reposición y/o valor en dinero al momento del pago del canon
          mensual, teniendo en cuenta que serán cobrados los gastos de transporte y el tiempo
          usado para tal asunto.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA DÉCIMA:</span> También corren a cargo del
          CONTRATANTE el pago de las prácticas complementarias, las interconsultas con
          profesionales distintos a los de la Residencia, la adquisición de los medicamentos
          necesarios para el RESIDENTE, y cualquier otro servicio no detallado en este contrato.
          Por lo que la falta de medicamentos exime de responsabilidad a la PRESTADORA sobre las
          consecuencias que tal situación ocasione en la salud del RESIDENTE otorgando el
          derecho a la PRESTADORA a rescindir el presente contrato y/o a realizar las denuncias
          correspondientes.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA UNDÉCIMA:</span> El CONTRATANTE se obliga a
          reparar los daños materiales y/o de otra naturaleza ocasionados a las personas, a los
          objetos o instalaciones existentes en la RESIDENCIA ya sea por el RESIDENTE, por sus
          familiares y/o visitas, quedando facultada la PRESTADORA para elegir la forma de
          efectuar la reparación cuando se trate de bienes materiales, debiendo el primero
          reembolsar los gastos efectuados a tal efecto.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA DUODÉCIMA:</span> La PRESTADORA no se hace
          responsable de accidentes de ninguna naturaleza ni reconocerá indemnización alguna por
          daños físicos o materiales producidos al RESIDENTE, causados por el inmueble, sus
          instalaciones, servicios o desprendimientos, filtraciones, incendios, movimientos
          sísmicos, inundaciones, huelgas, aluviones, atentados o cualquier tipo de accidentes.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA DÉCIMO TERCERA:</span> El CONTRATANTE,
          familiares y visitas del RESIDENTE deberán cumplir con el reglamento y horarios
          existentes en la &quot;RESIDENCIA PARA MAYORES&quot; estando autorizados para
          visitarlo y/o retirarlo de dicha RESIDENCIA si la condición psicofísica del mismo lo
          permite, en los horarios y días específicamente acordados con la PRESTADORA, firmando
          los registros existentes a tal fin y bajo la exclusiva responsabilidad de los primeros
          durante el tiempo que aquel se encuentre fuera de la institución, especialmente en lo
          referente a comidas, medicamentos y demás cuidados necesarios para su salud.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA DÉCIMO CUARTA:</span> Cuando por razones de
          salud, el profesional médico de la PRESTADORA aconseje la internación del RESIDENTE el
          CONTRATANTE deberá hacerse presente, para autorizar y acompañar el traslado del
          residente hacia el nosocomio que se determine.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA DÉCIMO QUINTA:</span> La PRESTADORA se reserva
          expresamente el derecho de alojar al RESIDENTE en cualquiera de las instalaciones
          habilitadas a tal fin, ya sea de forma individual o compartida.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA DÉCIMO SEXTA:</span> Corresponde única y
          exclusivamente a la PRESTADORA, a través de su personal profesional, la elección y
          programación de la alimentación del RESIDENTE.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA DÉCIMO SÉPTIMA:</span> La PRESTADORA se
          reserva, además, el derecho de rescindir el presente contrato en cualquier tiempo y
          sin invocación de causa, debiendo notificar al CONTRATANTE con una anticipación de 48
          horas. Cumpliendo ese término sin que el CONTRATANTE haya retirado al RESIDENTE de la
          &quot;RESIDENCIA&quot;, la PRESTADORA quedará habilitada a trasladar al mismo al
          domicilio denunciado precedentemente.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA DÉCIMO OCTAVA:</span> Las PARTES acuerdan que
          la enumeración de los servicios y obligaciones emergentes de la internación y cuidado
          del paciente es taxativa, no existiendo ningún otro tipo de obligación por la cual la
          PRESTADORA deba responder o hacerse cargo.
        </p>

        <p>
          <span className="font-semibold">CLÁUSULA DÉCIMO NOVENA:</span> domicilio y
          jurisdicción: Para cualquier reclamo extrajudicial o acción judicial resultante de
          este contrato, todas las partes eligen y aceptan dirimirlo por ante los tribunales
          ordinarios de la Provincia de Mendoza renunciando a cualquier otro fuero o
          jurisdicción que correspondiere, incluso el federal. Tanto la PRESTADORA como el
          CONTRATANTE desde ahora renuncian al derecho de recusar sin causa al magistrado.
          Igualmente, los domicilios consignados en el encabezado del presente contrato se
          consideran como domicilios especiales donde serán válidas todas las notificaciones
          y/o emplazamientos que se efectúen en los mismos con independencia de si el domicilio
          ha variado o no, si no se ha comunicado a la otra parte de su modificación.
        </p>

        <p>
          En prueba de conformidad a todo lo expuesto en el presente contrato se firma el mismo
          en dos ejemplares del mismo tenor y a un solo efecto en la ciudad de Mendoza a los{" "}
          {ahora.getDate()} días del mes de {MESES[ahora.getMonth()]} del año {ahora.getFullYear()}.
        </p>

        <div className="grid grid-cols-2 gap-10 pt-16 print:break-inside-avoid">
          <div className="text-center">
            <div className="mb-1 border-t border-ink/60 print:border-black" />
            <p className="text-xs text-ink-soft print:text-neutral-600">CONTRATANTE</p>
          </div>
          <div className="text-center">
            <div className="mb-1 border-t border-ink/60 print:border-black" />
            <p className="text-xs text-ink-soft print:text-neutral-600">PRESTADORA</p>
          </div>
        </div>

        <p className="pt-6 text-center text-[0.65rem] text-ink-soft print:text-neutral-500">
          Documento generado automáticamente el {ahora.toLocaleDateString("es-AR")} a partir de
          los datos cargados en el legajo del residente. Sujeto a revisión y completamiento del
          ANEXO I (evaluación médica) antes de su firma.
        </p>
      </div>
    </div>
  );
}
