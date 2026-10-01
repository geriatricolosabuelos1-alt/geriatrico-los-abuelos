"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buscarEnSistema, type ResultadoBusqueda } from "@/app/buscador-actions";

export type DestinoBuscador = {
  titulo: string;
  detalle: string;
  href: string;
  palabras: string;
};

type Opcion = { titulo: string; detalle: string; href: string; grupo: string };

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Puntaje de un módulo: título que empieza igual > título que contiene > sinónimo.
function puntaje(destino: DestinoBuscador, palabras: string[]): number {
  const titulo = normalizar(destino.titulo);
  const todo = `${titulo} ${normalizar(destino.detalle)} ${normalizar(destino.palabras)}`;
  const terminos = todo.split(/[\s,/·()]+/);
  let total = 0;
  for (const palabra of palabras) {
    // "pastillas" también encuentra "pastilla"; "presiones", "presion".
    const variantes = [palabra, palabra.replace(/es$/, ""), palabra.replace(/s$/, "")].filter((v) => v.length >= 2);
    const mejor = Math.max(
      ...variantes.map((p) => {
        if (titulo.startsWith(p)) return 5;
        if (titulo.includes(p)) return 3;
        if (terminos.some((w) => w.startsWith(p))) return 2;
        if (todo.includes(p)) return 1;
        return 0;
      }),
      0,
    );
    if (mejor === 0) return 0;
    total += mejor;
  }
  return total;
}

const GRUPO_RESULTADO: Record<ResultadoBusqueda["tipo"], string> = {
  residente: "Residentes",
  empleado: "Empleados",
  medicamento: "Medicamentos",
};

// Buscador del menú lateral: sugiere módulos, residentes, empleados y medicamentos a medida que se escribe.
export function BuscadorGlobal({ destinos }: { destinos: DestinoBuscador[] }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [resultados, setResultados] = useState<{ consulta: string; items: ResultadoBusqueda[] }>({
    consulta: "",
    items: [],
  });
  const [marcado, setMarcado] = useState(0);
  const entrada = useRef<HTMLInputElement>(null);

  const palabras = normalizar(texto).split(/\s+/).filter(Boolean);
  const modulos: Opcion[] =
    palabras.length === 0
      ? []
      : destinos
          .map((d) => ({ d, p: puntaje(d, palabras) }))
          .filter((x) => x.p > 0)
          .sort((a, b) => b.p - a.p)
          .slice(0, 8)
          .map(({ d }) => ({ titulo: d.titulo, detalle: d.detalle, href: d.href, grupo: "Módulos" }));
  const encontrados: Opcion[] =
    resultados.consulta === texto.trim()
      ? resultados.items.map((r) => ({ ...r, grupo: GRUPO_RESULTADO[r.tipo] }))
      : [];
  const opciones = [...modulos, ...encontrados];
  const buscando = texto.trim().length >= 2 && resultados.consulta !== texto.trim();

  // Residentes, empleados y medicamentos se buscan en la base con una pausa corta al tipear.
  useEffect(() => {
    const consulta = texto.trim();
    if (consulta.length < 2) return;
    let vigente = true;
    const t = setTimeout(async () => {
      const items = await buscarEnSistema(consulta);
      if (vigente) setResultados({ consulta, items });
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [texto]);

  // Ctrl+K (o Cmd+K) abre el buscador desde cualquier pantalla.
  useEffect(() => {
    function atajo(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        entrada.current?.focus();
      }
    }
    window.addEventListener("keydown", atajo);
    return () => window.removeEventListener("keydown", atajo);
  }, []);

  function ir(opcion: Opcion | undefined) {
    if (!opcion) return;
    setAbierto(false);
    setTexto("");
    (document.activeElement as HTMLElement | null)?.blur();
    router.push(opcion.href);
  }

  const marcadoValido = Math.min(marcado, Math.max(opciones.length - 1, 0));

  return (
    <div className="mb-4">
      <input
        ref={entrada}
        type="search"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setMarcado(0);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setMarcado(Math.min(marcadoValido + 1, opciones.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setMarcado(Math.max(marcadoValido - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            ir(opciones[marcadoValido]);
          } else if (e.key === "Escape") {
            setAbierto(false);
            entrada.current?.blur();
          }
        }}
        placeholder="Buscar... (Ctrl+K)"
        aria-label="Buscar en el sistema"
        className="w-full rounded-lg border border-edge bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-soft/70 focus:border-brass focus:outline-none"
      />

      {abierto && texto.trim() && (
        <div className="fixed left-[15.5rem] top-4 z-50 max-h-[80vh] w-[min(28rem,calc(100vw-16.5rem))] overflow-y-auto rounded-xl border border-edge bg-card p-2 shadow-2xl">
          {opciones.length === 0 ? (
            <p className="px-3 py-4 text-sm text-ink-soft">
              {buscando ? "Buscando..." : "No encontré nada con eso. Probá con otra palabra."}
            </p>
          ) : (
            opciones.map((o, i) => (
              <div key={`${o.grupo}-${o.href}-${o.titulo}-${i}`}>
                {(i === 0 || opciones[i - 1].grupo !== o.grupo) && (
                  <p className="px-3 pb-1 pt-2 text-[0.6rem] font-bold uppercase tracking-wide text-ink-soft">
                    {o.grupo}
                  </p>
                )}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setMarcado(i)}
                  onClick={() => ir(o)}
                  className={`block w-full rounded-lg px-3 py-2 text-left ${
                    i === marcadoValido ? "bg-brass-soft" : "hover:bg-panel-deep"
                  }`}
                >
                  <span className="block text-sm font-semibold text-ink">{o.titulo}</span>
                  <span className="block text-xs text-ink-soft">{o.detalle}</span>
                </button>
              </div>
            ))
          )}
          {buscando && opciones.length > 0 && (
            <p className="px-3 py-1 text-[0.65rem] text-ink-soft">Buscando residentes y más...</p>
          )}
        </div>
      )}
    </div>
  );
}
