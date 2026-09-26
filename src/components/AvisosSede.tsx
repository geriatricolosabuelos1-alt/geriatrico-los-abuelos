import Link from "next/link";
import { resumenLibretas } from "@/app/sucursales/[id]/legales/libretas-actions";
import { alertasRecetasSucursal } from "@/app/sucursales/[id]/medicacion/recetario/actions";
import { vencimientoCertificadoArca } from "@/lib/arca/certificado";
import { AvisoCertificadoArca } from "@/components/AvisoCertificadoArca";

const ESTILO_ALERTA =
  "alerta-pulso flex flex-wrap items-center gap-2 rounded-2xl border border-red-300 bg-red-50 px-5 py-3 text-sm text-red-800 transition-colors hover:border-brass";

// Avisos de una sede (recetas, certificado de ARCA, libretas sanitarias).
// Se usa en el dashboard de la sede y en el dashboard general (con el nombre de la sede):
// todo aviso nuevo agregado acá aparece en los dos.
export async function AvisosSede({ sucursalId, sede }: { sucursalId: string; sede?: string }) {
  const [recetas, certificado, libretas] = await Promise.all([
    alertasRecetasSucursal(sucursalId),
    vencimientoCertificadoArca(sucursalId),
    resumenLibretas(sucursalId),
  ]);

  const libretasConAlerta = libretas.vencidas + libretas.porVencer + libretas.sinLibreta;
  const prefijo = sede ? `${sede} · ` : "";

  if (recetas.total === 0 && !certificado && libretasConAlerta === 0) return null;

  return (
    <div className="space-y-2">
      {recetas.total > 0 && (
        <Link href={`/sucursales/${sucursalId}/medicacion/recetario`} className={ESTILO_ALERTA}>
          <span className="alerta-punto h-2 w-2 flex-shrink-0 rounded-full bg-red-600" />
          <span className="font-semibold">{prefijo}Recetas:</span>
          {[
            recetas.paraPedir > 0 && `${recetas.paraPedir} para pedir`,
            recetas.pedidasDemoradas > 0 && `${recetas.pedidasDemoradas} pedidas sin recibir`,
            recetas.porVencer > 0 && `${recetas.porVencer} por vencer`,
          ]
            .filter(Boolean)
            .join(" · ")}
          <span className="text-xs underline decoration-red-400 underline-offset-2">ver</span>
        </Link>
      )}

      {certificado && <AvisoCertificadoArca certificado={certificado} sede={sede} />}

      {libretasConAlerta > 0 && (
        <Link href={`/sucursales/${sucursalId}/legales/libretas`} className={ESTILO_ALERTA}>
          <span className="alerta-punto h-2 w-2 flex-shrink-0 rounded-full bg-red-600" />
          <span className="font-semibold">{prefijo}Libretas sanitarias:</span>
          {[
            libretas.vencidas > 0 && `${libretas.vencidas} vencida${libretas.vencidas === 1 ? "" : "s"}`,
            libretas.porVencer > 0 && `${libretas.porVencer} por vencer`,
            libretas.sinLibreta > 0 && `${libretas.sinLibreta} sin cargar`,
          ]
            .filter(Boolean)
            .join(" · ")}
          <span className="text-xs underline decoration-red-400 underline-offset-2">ver</span>
        </Link>
      )}
    </div>
  );
}
