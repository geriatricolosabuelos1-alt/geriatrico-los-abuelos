// Estilos de impresión con numeración de folio en cada hoja (margen inferior).
// La numeración es continua en todo el documento impreso.
export function EstiloFoliado({ pie, horizontal = false }: { pie: string; horizontal?: boolean }) {
  const pieSeguro = pie.replace(/["\\\n]/g, " ");
  return (
    <style>{`
      @page {
        size: A4 ${horizontal ? "landscape" : "portrait"};
        margin: 14mm 12mm 16mm 12mm;
        @bottom-left { content: "${pieSeguro}"; font-size: 8pt; color: #555; }
        @bottom-right { content: "Folio " counter(page); font-size: 9pt; font-weight: bold; }
      }
      @media print {
        .salto-folio { break-before: page; }
      }
    `}</style>
  );
}
