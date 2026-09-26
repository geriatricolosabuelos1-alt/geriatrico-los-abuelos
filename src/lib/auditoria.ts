import { createAdminClient } from "@/lib/supabase/admin";

// Únicos usuarios que ven el módulo de Seguridad. La base lo controla también
// (función puede_ver_auditoria): si se cambia acá, cambiarlo allá.
export const USUARIOS_SEGURIDAD = ["ozalazar", "rtimoner", "gcaballero"];

export function puedeVerSeguridad(usuario: string | null | undefined): boolean {
  return !!usuario && USUARIOS_SEGURIDAD.includes(usuario);
}

type Evento = {
  accion: "INGRESO" | "INGRESO_FALLIDO" | "CUENTA";
  usuarioId?: string | null;
  usuario?: string | null;
  descripcion: string;
  registroId?: string | null;
  datos?: Record<string, unknown> | null;
};

// Eventos que no son cambios en una tabla (ingresos al sistema, administración de
// cuentas). Los cambios en las tablas los registra la base sola con un trigger.
export async function registrarEvento(evento: Evento): Promise<void> {
  try {
    const admin = createAdminClient();
    let nombre: string | null = null;
    let usuario = evento.usuario ?? null;

    if (evento.usuarioId) {
      const { data } = await admin
        .from("perfiles")
        .select("usuario, nombre_completo")
        .eq("id", evento.usuarioId)
        .maybeSingle<{ usuario: string | null; nombre_completo: string }>();
      nombre = data?.nombre_completo ?? null;
      usuario = data?.usuario ?? usuario;
    }

    await admin.from("auditoria").insert({
      usuario_id: evento.usuarioId ?? null,
      usuario,
      nombre,
      accion: evento.accion,
      tabla: evento.accion === "CUENTA" ? "perfiles" : null,
      registro_id: evento.registroId ?? null,
      descripcion: evento.descripcion,
      datos: evento.datos ?? null,
    });
  } catch {
    // El registro de seguridad nunca debe impedir que el sistema funcione.
  }
}
