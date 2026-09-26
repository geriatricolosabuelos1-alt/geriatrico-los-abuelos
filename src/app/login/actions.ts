"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

  if (!perfil) return { error: ERROR_GENERICO };
  if (!perfil.activo) return { error: "Tu cuenta está desactivada. Consultá con administración." };

  const { data: cuenta } = await admin.auth.admin.getUserById(perfil.id);
  const email = cuenta?.user?.email;
  if (!email) return { error: ERROR_GENERICO };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: ERROR_GENERICO };

  return { error: null };
}
