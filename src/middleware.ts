import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas accesibles sin sesion iniciada.
const RUTAS_PUBLICAS = ["/login", "/registro", "/fichado"];

// De estas rutas se saca a un usuario que YA tiene sesion iniciada
// (no aplica a /fichado: el personal logueado tambien puede fichar).
const RUTAS_SOLO_SIN_SESION = ["/login", "/registro"];

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const esRutaPublica = RUTAS_PUBLICAS.some((ruta) =>
    request.nextUrl.pathname.startsWith(ruta),
  );

  if (!user && !esRutaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const esRutaSoloSinSesion = RUTAS_SOLO_SIN_SESION.some((ruta) =>
    request.nextUrl.pathname.startsWith(ruta),
  );

  if (user && esRutaSoloSinSesion) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
