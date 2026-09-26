"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RolUsuario } from "@/lib/types";

export type CuentaUsuario = {
  id: string;
  usuario: string | null;
  nombre_completo: string;
  rol: RolUsuario;
  sucursal_id: string | null;
  activo: boolean;
};

const DOMINIO_INTERNO = "geriatrico-los-abuelos.internal";

// Usuario de ingreso: minúsculas, números, punto, guion y guion bajo (3 a 30).
function normalizarUsuario(valor: FormDataEntryValue | null): string {
  return String(valor ?? "").trim().toLowerCase();
}

function usuarioValido(usuario: string): boolean {
  return /^[a-z0-9._-]{3,30}$/.test(usuario);
}

async function verificarAdmin(): Promise<{ error: string | null; userId: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado.", userId: null };

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single<{ rol: RolUsuario }>();

  if (perfil?.rol !== "admin") return { error: "No autorizado.", userId: null };

  return { error: null, userId: user.id };
}

export async function listarCuentas(): Promise<CuentaUsuario[]> {
  const { error } = await verificarAdmin();
  if (error) return [];

  const supabase = await createClient();

  const { data: perfiles } = await supabase
    .from("perfiles")
    .select("id, usuario, nombre_completo, rol, sucursal_id, activo")
    .order("nombre_completo")
    .returns<
      {
        id: string;
        usuario: string | null;
        nombre_completo: string;
        rol: RolUsuario;
        sucursal_id: string | null;
        activo: boolean;
      }[]
    >();

  if (!perfiles || perfiles.length === 0) return [];

  return perfiles.map((p) => ({
    id: p.id,
    usuario: p.usuario,
    nombre_completo: p.nombre_completo,
    rol: p.rol,
    sucursal_id: p.sucursal_id,
    activo: p.activo,
  }));
}

export type CrearCuentaEstado = { error: string | null };

export async function crearCuenta(
  _estado: CrearCuentaEstado,
  formData: FormData,
): Promise<CrearCuentaEstado> {
  const { error: errorAuth } = await verificarAdmin();
  if (errorAuth) return { error: errorAuth };

  const usuario = normalizarUsuario(formData.get("usuario"));
  const password = String(formData.get("password") ?? "");
  const nombre_completo = String(formData.get("nombre_completo") ?? "").trim();
  const rol = String(formData.get("rol") ?? "") as RolUsuario;
  const sucursal_id = String(formData.get("sucursal_id") ?? "") || null;

  if (!usuario || !password || !nombre_completo || !rol) {
    return { error: "Completá usuario, contraseña, nombre y rol." };
  }
  if (!usuarioValido(usuario)) {
    return { error: "El usuario debe tener de 3 a 30 caracteres: letras minúsculas, números, punto o guion." };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const admin = createAdminClient();

  const { data: existente } = await admin.from("perfiles").select("id").eq("usuario", usuario).maybeSingle();
  if (existente) return { error: `El usuario "${usuario}" ya existe.` };

  // Supabase exige un mail por cuenta: se usa uno interno armado con el usuario.
  const { data: nuevoUsuario, error: errorCrear } = await admin.auth.admin.createUser({
    email: `${usuario}@${DOMINIO_INTERNO}`,
    password,
    email_confirm: true,
  });

  if (errorCrear || !nuevoUsuario.user) {
    return { error: errorCrear?.message ?? "No se pudo crear el usuario." };
  }

  // Un trigger en la base ya crea la fila en "perfiles" al insertarse el
  // usuario en auth.users (con valores por defecto) — acá la completamos.
  const { error: errorPerfil } = await admin
    .from("perfiles")
    .update({ usuario, nombre_completo, rol, sucursal_id, activo: true })
    .eq("id", nuevoUsuario.user.id);

  if (errorPerfil) {
    await admin.auth.admin.deleteUser(nuevoUsuario.user.id);
    return { error: errorPerfil.message };
  }

  revalidatePath("/admin/claves");
  return { error: null };
}

export type ActualizarCuentaEstado = { error: string | null };

export async function actualizarCuenta(
  id: string,
  formData: FormData,
): Promise<ActualizarCuentaEstado> {
  const { error: errorAuth, userId } = await verificarAdmin();
  if (errorAuth) return { error: errorAuth };

  const usuario = normalizarUsuario(formData.get("usuario"));
  const nombre_completo = String(formData.get("nombre_completo") ?? "").trim();
  const rol = String(formData.get("rol") ?? "") as RolUsuario;
  const sucursal_id = String(formData.get("sucursal_id") ?? "") || null;
  const activo = formData.get("activo") === "on";
  const nuevaPassword = String(formData.get("password") ?? "").trim();

  if (!usuario || !nombre_completo || !rol) {
    return { error: "Completá usuario, nombre y rol." };
  }
  if (!usuarioValido(usuario)) {
    return { error: "El usuario debe tener de 3 a 30 caracteres: letras minúsculas, números, punto o guion." };
  }
  if (id === userId && (rol !== "admin" || !activo)) {
    return { error: "No podés quitarte a vos mismo el rol de administrador ni desactivarte." };
  }

  const admin = createAdminClient();

  const { data: existente } = await admin
    .from("perfiles")
    .select("id")
    .eq("usuario", usuario)
    .neq("id", id)
    .maybeSingle();
  if (existente) return { error: `El usuario "${usuario}" ya lo tiene otra cuenta.` };

  const { error: errorPerfil } = await admin
    .from("perfiles")
    .update({ usuario, nombre_completo, rol, sucursal_id, activo })
    .eq("id", id);

  if (errorPerfil) return { error: errorPerfil.message };

  if (nuevaPassword) {
    if (nuevaPassword.length < 6) {
      return { error: "La contraseña debe tener al menos 6 caracteres." };
    }
    const { error: errorPass } = await admin.auth.admin.updateUserById(id, {
      password: nuevaPassword,
    });
    if (errorPass) return { error: errorPass.message };
  }

  revalidatePath("/admin/claves");
  return { error: null };
}

export type EliminarCuentaEstado = { error: string | null };

export async function eliminarCuenta(id: string): Promise<EliminarCuentaEstado> {
  const { error, userId } = await verificarAdmin();
  if (error) return { error };
  if (id === userId) return { error: "No podés eliminar tu propia cuenta." };

  const admin = createAdminClient();
  await admin.from("perfiles").delete().eq("id", id);
  await admin.auth.admin.deleteUser(id);

  revalidatePath("/admin/claves");
  return { error: null };
}
