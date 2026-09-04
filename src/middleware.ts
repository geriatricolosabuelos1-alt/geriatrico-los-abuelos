import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const RUTAS_PUBLICAS = ["/login", "/registro"];

// Acceso de desarrollo: si estan seteadas, inicia sesion automaticamente
// con una cuenta tecnica en vez de mostrar la pantalla de login.
// Para volver a exigir login, borrar estas dos variables de entorno.
const DEV_AUTOLOGIN_EMAIL = process.env.DEV_AUTOLOGIN_EMAIL;
const DEV_AUTOLOGIN_PASSWORD = process.env.DEV_AUTOLOGIN_PASSWORD;

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && DEV_AUTOLOGIN_EMAIL && DEV_AUTOLOGIN_PASSWORD) {
    const { data } = await supabase.auth.signInWithPassword({
      email: DEV_AUTOLOGIN_EMAIL,
      password: DEV_AUTOLOGIN_PASSWORD,
    });
    user = data.user;
  }

  const esRutaPublica = RUTAS_PUBLICAS.some((ruta) =>
    request.nextUrl.pathname.startsWith(ruta),
  );

  if (!user && !esRutaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && esRutaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
