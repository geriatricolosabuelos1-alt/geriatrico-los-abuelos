import { diasHastaFecha } from "@/lib/fechas";
import type { VencimientoCertificado } from "@/lib/arca/certificado";

// Línea con el vencimiento del certificado de facturación de ARCA de una sede.
// Amarillo 60 días antes del vencimiento, rojo si ya venció.
export function AvisoCertificadoArca({
  certificado,
  sede,
}: {
  certificado: VencimientoCertificado;
  sede?: string;
}) {
  const dias = diasHastaFecha(certificado.vence);
  const fecha = new Date(certificado.vence + "T00:00:00").toLocaleDateString("es-AR");
  const estilo =
    dias < 0
      ? "alerta-pulso border-red-300 bg-red-50 text-red-800"
      : dias <= 60
        ? "border-amber-300 bg-amber-50 text-amber-900"
        : "border-edge bg-card text-ink-soft";

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-2xl border px-5 py-3 text-sm ${estilo}`}>
      <span className="font-semibold">
        Certificado de facturación ARCA{sede ? ` · ${sede}` : ""}:
      </span>
      <span>
        {dias < 0
          ? `VENCIDO el ${fecha} — no se puede facturar hasta renovarlo`
          : `vence el ${fecha} (faltan ${dias} días)`}
      </span>
      {dias >= 0 && dias <= 60 && <span className="font-semibold">— hay que renovarlo</span>}
      <span className="text-xs opacity-70">
        {certificado.razonSocial} · CUIT {certificado.cuit}
      </span>
    </div>
  );
}
