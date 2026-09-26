import forge from "node-forge";
import { clienteArca } from "./cliente";
import { ZONA_ARGENTINA } from "@/lib/fechas";

export type VencimientoCertificado = {
  cuit: string;
  razonSocial: string;
  vence: string; // AAAA-MM-DD (hora argentina)
};

// Fecha de vencimiento del certificado de ARCA de la sede, leída del propio certificado.
// Devuelve null si la sede no tiene facturación configurada o el certificado no se puede leer.
export async function vencimientoCertificadoArca(sucursalId: string): Promise<VencimientoCertificado | null> {
  const supabase = await clienteArca();
  const { data } = await supabase
    .from("arca_config")
    .select("cuit, razon_social, cert, activo")
    .eq("sucursal_id", sucursalId)
    .maybeSingle<{ cuit: string; razon_social: string; cert: string; activo: boolean }>();

  if (!data?.cert || !data.activo) return null;

  try {
    const certificado = forge.pki.certificateFromPem(data.cert);
    const vence = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_ARGENTINA }).format(
      certificado.validity.notAfter,
    );
    return { cuit: data.cuit, razonSocial: data.razon_social, vence };
  } catch {
    return null;
  }
}
