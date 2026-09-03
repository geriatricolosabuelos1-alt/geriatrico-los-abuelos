"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CategoriaInsumo } from "@/lib/types";

export type CrearRendicionEstado = { error: string | null };

type ItemExistente = { insumo_id: string; cantidad: number };
type ItemNuevo = { nombre: string; categoria: CategoriaInsumo; cantidad: number };
type ItemAEnviar = ItemExistente | ItemNuevo;

export type ItemLeido = {
  insumo_id: string | null;
  nombre: string;
  cantidad: number;
  categoriaSugerida: CategoriaInsumo;
};

export type ResultadoLecturaTicket = {
  total: number | null;
  items: ItemLeido[];
  error: string | null;
};

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export async function leerTicketConIA(formData: FormData): Promise<ResultadoLecturaTicket> {
  const archivo = formData.get("foto");

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { total: null, items: [], error: "Subí una foto o PDF del ticket." };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { total: null, items: [], error: "Falta configurar la lectura automática (GEMINI_API_KEY)." };
  }

  const supabase = await createClient();
  const { data: insumos } = await supabase
    .from("insumos")
    .select("id, nombre, categoria")
    .eq("activo", true);

  const catalogo = insumos ?? [];

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const base64 = buffer.toString("base64");

  const prompt = `Sos un asistente que lee tickets y facturas de compra de mercadería para un geriátrico.
Analizá la imagen y devolvé SOLO un objeto JSON, sin texto adicional ni markdown, con este formato exacto:
{"total": <número o null>, "items": [{"nombre": "<nombre del producto tal como lo entendiste, normalizado y corto>", "categoria": "<general|carnes|verduras>", "cantidad": <número>}]}

Reglas:
- Transcribí TODOS los productos/mercadería que reconozcas en el ticket, no solo algunos.
- Usá nombres cortos y genéricos (ej: "Arroz" en vez de "ARROZ GALLO 1KG OFERTA").
- "categoria": clasificá cada producto en general (limpieza, almacén, higiene), carnes, o verduras (incluye frutas).
- Si no podés determinar la cantidad, poné 1.
- "total" es el importe TOTAL a pagar del ticket (no el subtotal). Si no lo encontrás, poné null.
- No incluyas renglones que no sean productos (descuentos, impuestos, vuelto, etc.).`;

  const cuerpoSolicitud = JSON.stringify({
    contents: [
      {
        parts: [{ text: prompt }, { inline_data: { mime_type: archivo.type, data: base64 } }],
      },
    ],
    generationConfig: { responseMimeType: "application/json" },
  });

  let respuesta: Response | null = null;
  for (let intento = 0; intento < 2; intento++) {
    try {
      respuesta = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: cuerpoSolicitud },
      );
    } catch {
      return { total: null, items: [], error: "No se pudo conectar con el lector de tickets." };
    }

    if (respuesta.ok) break;
    if (respuesta.status !== 503 || intento === 1) break;
    await new Promise((r) => setTimeout(r, 1500));
  }

  if (!respuesta || !respuesta.ok) {
    const status = respuesta?.status ?? "sin respuesta";
    return { total: null, items: [], error: `El lector de tickets devolvió un error (${status}).` };
  }

  const cuerpo = await respuesta.json();
  const texto: string = cuerpo?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  let parseado: {
    total?: unknown;
    items?: { nombre?: unknown; categoria?: unknown; cantidad?: unknown }[];
  };
  try {
    parseado = JSON.parse(texto);
  } catch {
    return { total: null, items: [], error: "No se pudo interpretar la lectura del ticket." };
  }

  const categoriasValidas: CategoriaInsumo[] = ["general", "carnes", "verduras"];
  const catalogoNormalizado = catalogo.map((i) => ({ ...i, norm: normalizar(i.nombre) }));

  const items: ItemLeido[] = (parseado.items ?? [])
    .filter((it): it is { nombre: string; categoria?: unknown; cantidad?: unknown } => typeof it?.nombre === "string")
    .map((it) => {
      const norm = normalizar(it.nombre);
      const coincidencia = catalogoNormalizado.find(
        (c) => c.norm === norm || c.norm.includes(norm) || norm.includes(c.norm),
      );
      const categoria = categoriasValidas.includes(it.categoria as CategoriaInsumo)
        ? (it.categoria as CategoriaInsumo)
        : "general";

      return {
        insumo_id: coincidencia?.id ?? null,
        nombre: coincidencia?.nombre ?? it.nombre,
        cantidad: Number(it.cantidad) > 0 ? Number(it.cantidad) : 1,
        categoriaSugerida: (coincidencia?.categoria as CategoriaInsumo) ?? categoria,
      };
    });

  const total = typeof parseado.total === "number" && parseado.total > 0 ? parseado.total : null;

  return { total, items, error: null };
}

export async function crearRendicion(
  sucursalId: string,
  _estado: CrearRendicionEstado,
  formData: FormData,
): Promise<CrearRendicionEstado> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const archivo = formData.get("foto");
  const montoRaw = String(formData.get("monto") ?? "");
  const descripcion = String(formData.get("descripcion") ?? "") || null;
  const monto = montoRaw ? Number(montoRaw) : null;
  const itemsRaw = String(formData.get("items") ?? "[]");

  let items: ItemAEnviar[] = [];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    items = [];
  }

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Subí una foto del ticket." };
  }

  const extension = archivo.name.split(".").pop() ?? "jpg";
  const rutaArchivo = `${sucursalId}/${crypto.randomUUID()}.${extension}`;

  const { error: errorSubida } = await supabase.storage
    .from("rendiciones")
    .upload(rutaArchivo, archivo, { contentType: archivo.type });

  if (errorSubida) {
    return { error: errorSubida.message };
  }

  const { error: errorInsert } = await supabase.from("rendiciones").insert({
    sucursal_id: sucursalId,
    monto,
    descripcion,
    imagen_path: rutaArchivo,
    registrado_por: user?.id,
  });

  if (errorInsert) {
    return { error: errorInsert.message };
  }

  const movimientos: { insumo_id: string; cantidad: number }[] = [];

  for (const item of items) {
    if (Number(item.cantidad) <= 0) continue;

    if ("insumo_id" in item) {
      movimientos.push({ insumo_id: item.insumo_id, cantidad: item.cantidad });
      continue;
    }

    const nombre = item.nombre.trim();
    if (!nombre) continue;

    const { data: insumoCreado, error: errorInsumo } = await supabase
      .from("insumos")
      .upsert({ nombre, categoria: item.categoria }, { onConflict: "nombre" })
      .select("id")
      .single();

    if (errorInsumo || !insumoCreado) {
      return {
        error: `Rendición guardada, pero no se pudo agregar "${nombre}" al catálogo: ${errorInsumo?.message ?? "error desconocido"}`,
      };
    }

    movimientos.push({ insumo_id: insumoCreado.id, cantidad: item.cantidad });
  }

  if (movimientos.length > 0) {
    const { error: errorMovimientos } = await supabase.from("movimientos_inventario").insert(
      movimientos.map((m) => ({
        sucursal_id: sucursalId,
        insumo_id: m.insumo_id,
        tipo: "entrada" as const,
        cantidad: m.cantidad,
        registrado_por: user?.id,
      })),
    );

    if (errorMovimientos) {
      return { error: `Rendición guardada, pero falló actualizar el stock: ${errorMovimientos.message}` };
    }
  }

  revalidatePath(`/sucursales/${sucursalId}/rendiciones`);
  revalidatePath(`/sucursales/${sucursalId}/inventario`);
  return { error: null };
}
