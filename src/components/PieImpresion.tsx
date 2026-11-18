// Fecha de impresión: abajo y chica, para que no se confunda con las fechas del documento.
export function PieImpresion({ detalle, soloImpresion }: { detalle?: string; soloImpresion?: boolean }) {
  const hoy = new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Mendoza" });
  return (
    <p
      className={`mt-8 text-right text-[0.6rem] text-ink-soft/70 print:text-neutral-500 ${soloImpresion ? "hidden print:block" : ""}`}
    >
      Impreso el {hoy}
      {detalle ? ` · ${detalle}` : ""}
    </p>
  );
}
