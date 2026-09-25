import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// La configuración de ARCA (certificado y clave privada) y el token de acceso se leen
// y guardan con la llave de servicio, sin depender de los permisos del usuario:
// así la clave nunca queda expuesta a los usuarios y cualquier rol que pueda facturar
// reutiliza el mismo token (ARCA no entrega uno nuevo mientras el anterior siga vigente).
// Si la llave de servicio no está configurada, se usa la sesión del usuario como antes.
export async function clienteArca() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return createAdminClient();
  return createClient();
}
