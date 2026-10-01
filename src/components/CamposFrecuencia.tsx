"use client";

import { useState } from "react";

const CADA_HORAS = [24, 12, 8, 6, 4] as const;

function sumarHoras(hora: string, horas: number): string {
  const [h, m] = hora.split(":").map(Number);
  const total = (((h + horas) % 24) + 24) % 24;
  return `${String(total).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
}

function horariosCada(primera: string, horas: number): string[] {
  const lista: string[] = [];
  for (let i = 0; i < 24 / horas; i++) lista.push(sumarHoras(primera, i * horas));
  return lista.sort();
}

function frecuenciaInicial(frecuencia: string | null, horarios: string[] | null): string {
  const n = frecuencia?.match(/cada\s*(\d+)/i)?.[1];
  if (n && CADA_HORAS.includes(Number(n) as (typeof CADA_HORAS)[number])) return n;
  return horarios && horarios.length > 0 ? "manual" : "";
}

// Frecuencia → horarios del día y dosis diaria. Con horarios, la toma se registra sola
// cada día a esa hora y descuenta del stock (si no se dio, se marca en la planilla MAR).
export function CamposFrecuencia({
  inicial,
  etiqueta,
  campo,
}: {
  inicial?: { frecuencia: string | null; horarios: string[] | null; dosis_diaria: number | null };
  etiqueta: string;
  campo: string;
}) {
  const horariosIniciales = inicial?.horarios ?? [];
  const [cada, setCada] = useState(() => frecuenciaInicial(inicial?.frecuencia ?? null, inicial?.horarios ?? null));
  const [primera, setPrimera] = useState(horariosIniciales[0] ?? "08:00");
  const [manual, setManual] = useState(horariosIniciales.join(", "));
  const [porToma, setPorToma] = useState(() => {
    const n = horariosIniciales.length;
    const diaria = inicial?.dosis_diaria;
    return diaria && n > 0 ? String(Math.round((diaria / n) * 100) / 100) : "1";
  });

  const horarios =
    cada === "manual"
      ? manual
          .split(",")
          .map((h) => h.trim())
          .filter(Boolean)
      : cada
        ? horariosCada(primera, Number(cada))
        : [];
  const unidades = Number(porToma) > 0 ? Number(porToma) : 0;
  const dosisDiaria = horarios.length > 0 && unidades > 0 ? Math.round(horarios.length * unidades * 100) / 100 : "";
  const frecuencia =
    cada === "manual"
      ? horarios.length > 0
        ? `${horarios.length} ${horarios.length === 1 ? "vez" : "veces"} por día`
        : ""
      : cada
        ? `Cada ${cada} hs`
        : (inicial?.frecuencia ?? "");

  return (
    <>
      <input type="hidden" name="frecuencia" value={frecuencia} />
      <input type="hidden" name="horario" value={horarios.join(", ")} />
      <input type="hidden" name="horarios" value={horarios.join(", ")} />
      {horarios.length > 0 && <input type="hidden" name="dosis_diaria" value={dosisDiaria} />}
      <div>
        <label className={etiqueta}>Frecuencia</label>
        <select value={cada} onChange={(e) => setCada(e.target.value)} className={campo}>
          <option value="">Sin horario fijo</option>
          {CADA_HORAS.map((h) => (
            <option key={h} value={h}>
              {h === 24 ? "1 vez por día (cada 24 hs)" : `Cada ${h} hs`}
            </option>
          ))}
          <option value="manual">Horarios a mano</option>
        </select>
      </div>
      {cada === "manual" ? (
        <div>
          <label className={etiqueta}>Horarios (separados por coma)</label>
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="08:00, 13:00, 20:00"
            className={`${campo} w-44`}
          />
        </div>
      ) : (
        cada && (
          <div>
            <label className={etiqueta}>Primera toma</label>
            <input type="time" value={primera} onChange={(e) => setPrimera(e.target.value || "08:00")} className={campo} />
          </div>
        )
      )}
      {cada && (
        <div>
          <label className={etiqueta}>Unid. por toma</label>
          <input
            type="number"
            min={0}
            step="0.25"
            value={porToma}
            onChange={(e) => setPorToma(e.target.value)}
            className={`${campo} w-24`}
          />
        </div>
      )}
      {horarios.length === 0 && (
        <div>
          <label className={etiqueta} title="Unidades consumidas por día, para calcular días de stock restante">
            Dosis diaria (unid./día)
          </label>
          <input
            type="number"
            name="dosis_diaria"
            min={0}
            step="0.5"
            defaultValue={inicial?.dosis_diaria ?? ""}
            className={`${campo} w-28`}
          />
        </div>
      )}
      {horarios.length > 0 && (
        <p className="w-full text-[0.7rem] text-ink-soft">
          Todos los días a las <span className="font-semibold text-ink">{horarios.join(" · ")}</span>
          {dosisDiaria !== "" && <> — {dosisDiaria} unid./día</>}. Si es continua, cada toma se registra sola a
          su hora y descuenta del stock; si no se dio, marcala en la planilla MAR con el motivo.
        </p>
      )}
    </>
  );
}
