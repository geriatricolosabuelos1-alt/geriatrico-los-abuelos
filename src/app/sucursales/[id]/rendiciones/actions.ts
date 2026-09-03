"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CrearRendicionEstado = { error: string | null };

type ItemConfirmado = { insumo_id: string; cantidad: number };

export type ItemLeido = { insumo_id: string; nombre: string; cantidad: number };

export type ResultadoLecturaTicket = {
  total: number | null;
  items: ItemLeido[];
  error: string | null;
};

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
    .select("id, nombre")
    .eq("activo", true);

  const catalogo = insumos ?? [];
  if (catalogo.length === 0) {
    return { total: null, items: [], error: null };
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const base64 = buffer.toString("base64");

  const prompt = `Sos un asistente que lee tickets y facturas de compra de mercadería para un geriátrico.
Analizá la imagen y devolvé SOLO un objeto JSON, sin texto adicional ni markdown, con este formato exacto:
{"total": <número o null>, "items": [{"nombre": "<nombre EXACTO tomado de la lista de productos válidos>", "cantidad": <número>}]}

Lista de productos válidos (usá el nombre EXACTO tal cual aparece acá, nunca inventes variantes):
${catalogo.map((i) => i.nombre).join(", ")}

Reglas:
- Incluí en "items" solo los productos de la lista que reconozcas con claridad en el ticket.
- Si no podés determinar la cantidad de un producto, poné 1.
- "total" es el importe TOTAL a pagar del ticket (no el subtotal). Si no lo encontrás, poné null.`;

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

  let parseado: { total?: unknown; items?: { nombre?: unknown; cantidad?: unknown }[] };
  try {
    parseado = JSON.parse(texto);
  } catch {
    return { total: null, items: [], error: "No se pudo interpretar la lectura del ticket." };
  }

  const nombreAId = new Map(catalogo.map((i) => [i.nombre, i.id]));
  const items: ItemLeido[] = (parseado.items ?? [])
    .filter((it): it is { nombre: string; cantidad: unknown } => typeof it?.nombre === "string" && nombreAId.has(it.nombre))
    .map((it) => ({
      insumo_id: nombreAId.get(it.nombre)!,
      nombre: it.nombre,
      cantidad: Number(it.cantidad) > 0 ? Number(it.cantidad) : 1,
    }));

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

  let items: ItemConfirmado[] = [];
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

  const movimientosValidos = items.filter(
    (i) => i.insumo_id && Number(i.cantidad) > 0,
  );

  if (movimientosValidos.length > 0) {
    const { error: errorMovimientos } = await supabase.from("movimientos_inventario").insert(
      movimientosValidos.map((i) => ({
        sucursal_id: sucursalId,
        insumo_id: i.insumo_id,
        tipo: "entrada" as const,
        cantidad: i.cantidad,
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
