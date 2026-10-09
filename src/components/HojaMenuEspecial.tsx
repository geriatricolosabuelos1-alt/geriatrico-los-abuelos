import { DIAS_MENU, ETIQUETA_INDICACIONES, type MenuEspecial } from "@/lib/menuEspecial";
import { ENCABEZADO_NUTRICIONISTA } from "@/lib/nutricion";

function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split("-");
  return d ? `${d}/${m}/${a}` : fecha;
}

// "EDITH 1" → "Edith 1"
function nombreSede(nombre: string): string {
  return nombre.toLowerCase().replace(/(^|\s)\p{L}/gu, (l) => l.toUpperCase());
}

const CELDA = "border border-neutral-500 px-2 py-1 align-top";

// Ficha de menú especial tal cual el papel de la nutricionista (pantalla e impresión).
export function HojaMenuEspecial({
  menu,
  sedeNombre,
  sedeDireccion,
  renglonesLibres = 0,
}: {
  menu: MenuEspecial;
  sedeNombre: string;
  sedeDireccion: string | null;
  renglonesLibres?: number;
}) {
  const c = menu.contenido;
  return (
    <article className="hoja-menu-especial break-after-page text-[0.78rem] leading-snug text-black">
      <header className="mb-3 border-b-2 border-black pb-2">
        <p className="font-bold">{nombreSede(sedeNombre)} - Residencia de Adultos Mayores</p>
        {sedeDireccion && <p className="text-neutral-700">Domicilio: {sedeDireccion}</p>}
      </header>

      <h2 className="mb-2 text-center text-base font-bold uppercase">{c.titulo}</h2>
      {c.descripcion.split("\n").map((p, i) => (
        <p key={i} className="mb-1.5">
          {p}
        </p>
      ))}
      {c.nota && <p className="mb-2 font-semibold">{c.nota}</p>}

      <h3 className="mt-3 font-bold uppercase">Indicaciones nutricionales:</h3>
      <table className="mt-1 w-full border-collapse">
        <thead>
          <tr className="bg-neutral-100">
            <th className={`${CELDA} text-left`}>Pacientes</th>
            <th className={`${CELDA} w-40 text-left`}>Fecha indicación</th>
          </tr>
        </thead>
        <tbody>
          {menu.pacientes.map((p) => (
            <tr key={p.residente_id}>
              <td className={CELDA}>{p.nombre}</td>
              <td className={CELDA}>{fechaCorta(p.fecha)}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(renglonesLibres, menu.pacientes.length === 0 ? 1 : 0) }, (_, i) => (
            <tr key={`libre-${i}`}>
              <td className={`${CELDA} h-6`} />
              <td className={CELDA} />
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-4 font-bold uppercase">Desayunos y meriendas</h3>
      <table className="mt-1 w-full table-fixed border-collapse text-[0.7rem]">
        <thead>
          <tr className="bg-neutral-100">
            <th className={`${CELDA} w-24`} />
            {DIAS_MENU.map((d) => (
              <th key={d.valor} className={`${CELDA} uppercase`}>
                {d.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(
            [
              ["Desayunos", c.desayunos],
              ["Meriendas", c.meriendas],
            ] as const
          ).map(([etiqueta, fila]) => (
            <tr key={etiqueta}>
              <td className={`${CELDA} font-semibold uppercase`}>{etiqueta}</td>
              {DIAS_MENU.map((d) => (
                <td key={d.valor} className={CELDA}>
                  {fila[d.valor] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-4 font-bold uppercase">Colaciones</h3>
      <ul className="mt-1 list-disc pl-6">
        {c.colaciones.map((x, i) => (
          <li key={i} className="uppercase">
            {x}
          </li>
        ))}
      </ul>

      <h3 className="mt-4 break-after-avoid font-bold uppercase">Almuerzos y cenas</h3>
      <table className="mt-1 w-full border-collapse">
        <thead>
          <tr className="bg-neutral-100">
            <th className={`${CELDA} w-48 text-left`}>Si el menú general contiene…</th>
            <th className={`${CELDA} text-left`}>{ETIQUETA_INDICACIONES[menu.tipo]}</th>
          </tr>
        </thead>
        <tbody>
          {c.reglas.map((r, i) => (
            <tr key={i} className="break-inside-avoid">
              <td className={`${CELDA} font-semibold uppercase`}>{r.contiene}</td>
              <td className={CELDA}>
                <ul className="list-disc pl-5">
                  {r.indicaciones.map((x, j) => (
                    <li key={j}>{x}</li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-12 flex justify-end break-inside-avoid">
        <div className="w-60 text-center">
          <div className="mb-1 border-t border-black" />
          <p className="text-[0.65rem]">
            {ENCABEZADO_NUTRICIONISTA.nombre} · {ENCABEZADO_NUTRICIONISTA.cargo} · {ENCABEZADO_NUTRICIONISTA.matricula}
          </p>
        </div>
      </div>
    </article>
  );
}
