"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { registrarEvento } from "@/lib/auditoria";

const ERROR_GENERICO = "Usuario o contraseña incorrectos.";

// Ingreso con nombre de usuario: se busca la cuenta por usuario en el servidor
// (el mail nunca llega al navegador) y se inicia sesión con la sesión en cookies.
export async function iniciarSesion(usuarioIngresado: string, password: string): Promise<{ error: string | null }> {
  const usuario = usuarioIngresado.trim().toLowerCase();

  if (usuario.includes("@")) {
    return { error: "Ingresá con tu nombre de usuario (por ejemplo gcaballero), no con el mail." };
  }
  if (!usuario || !password) return { error: ERROR_GENERICO };

  const admin = createAdminClient();
  const { data: perfil } = await admin
    .from("perfiles")
    .select("id, activo")
    .eq("usuario", usuario)
    .maybeSingle<{ id: string; activo: boolean }>();

  if (!perfil) {
    await registrarEvento({ accion: "INGRESO_FALLIDO", usuario, descripcion: "Usuario inexistente" });
    return { error: ERROR_GENERICO };
  }
  if (!perfil.activo) {
    await registrarEvento({ accion: "INGRESO_FALLIDO", usuarioId: perfil.id, usuario, descripcion: "Cuenta desactivada" });
    return { error: "Tu cuenta está desactivada. Consultá con administración." };
  }

  const { data: cuenta } = await admin.auth.admin.getUserById(perfil.id);
  const email = cuenta?.user?.email;
  if (!email) return { error: ERROR_GENERICO };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    await registrarEvento({ accion: "INGRESO_FALLIDO", usuarioId: perfil.id, usuario, descripcion: "Contraseña incorrecta" });
    return { error: ERROR_GENERICO };
  }

  await registrarEvento({ accion: "INGRESO", usuarioId: perfil.id, usuario, descripcion: "Ingresó al sistema" });
  return { error: null };
}
