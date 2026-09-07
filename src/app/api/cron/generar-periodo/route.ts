import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generarPeriodoParaSucursal } from "@/lib/generarPeriodo";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: process.env.DEV_AUTOLOGIN_EMAIL!,
    password: process.env.DEV_AUTOLOGIN_PASSWORD!,
  });

  if (loginError) {
    return NextResponse.json({ error: loginError.message }, { status: 500 });
  }

  const { data: sucursales, error: errorSucursales } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .returns<{ id: string; nombre: string }[]>();

  if (errorSucursales || !sucursales) {
    return NextResponse.json({ error: errorSucursales?.message }, { status: 500 });
  }

  const hoy = new Date();
  const mes = hoy.getMonth() + 1;
  const anio = hoy.getFullYear();

  const resultados = [];
  for (const sucursal of sucursales) {
    const resultado = await generarPeriodoParaSucursal(supabase, sucursal.id, mes, anio);
    resultados.push({ sucursal: sucursal.nombre, ...resultado });
  }

  return NextResponse.json({ mes, anio, resultados });
}
