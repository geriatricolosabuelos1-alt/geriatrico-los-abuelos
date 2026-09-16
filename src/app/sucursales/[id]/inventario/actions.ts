"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CategoriaInsumo } from "@/lib/types";

export type RegistrarMovimientoEstado = { error: string | null };

export async function registrarMovimiento(
  sucursalId: string,
  _estado: RegistrarMovimientoEstado,
  formData: FormData,
): Promise<RegistrarMovimientoEstado> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const insumo_id = String(formData.get("insumo_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const cantidad = Number(formData.get("cantidad") ?? 0);
  const precioRaw = String(formData.get("precio") ?? "");
  const precio = precioRaw ? Number(precioRaw) : null;
  const residente_id = String(formData.get("residente_id") ?? "") || null;
  const imputarResidente = formData.get("imputar_residente") === "on" && tipo === "salida";

  if (!insumo_id || (tipo !== "entrada" && tipo !== "salida") || !cantidad || cantidad <= 0) {
    return { error: "Completá insumo, tipo y una cantidad mayor a cero." };
  }

  const importe_total = precio ? precio * cantidad : null;

  if (imputarResidente && (!residente_id || !importe_total)) {
    return {
      error: "Para imputar el gasto a un residente, elegí el residente y completá un precio.",
    };
  }

  const { data: movimiento, error } = await supabase
    .from("movimientos_inventario")
    .insert({
      sucursal_id: sucursalId,
      insumo_id,
      tipo,
      cantidad,
      precio,
      importe_total,
      residente_id,
      registrado_por: user?.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    return { error: error.message };
  }

  if (imputarResidente && residente_id && importe_total) {
    const { data: insumo } = await supabase
      .from("insumos")
      .select("nombre, unidad")
      .eq("id", insumo_id)
      .single<{ nombre: string; unidad: string }>();

    const { error: errorCargo } = await supabase.from("cargos_extra_residente").insert({
      residente_id,
      sucursal_id: sucursalId,
      movimiento_inventario_id: movimiento?.id ?? null,
      concepto: `${insumo?.nombre ?? "Insumo"} — ${cantidad} ${insumo?.unidad ?? "unidades"}`,
      monto: importe_total,
      registrado_por: user?.id ?? null,
    });

    if (errorCargo) {
      return { error: `Movimiento guardado, pero no se pudo imputar el gasto: ${errorCargo.message}` };
    }

    revalidatePath(`/residentes/${residente_id}/cuenta-corriente`);
  }

  revalidatePath(`/sucursales/${sucursalId}/inventario`);
  return { error: null };
}

export type CargaInicialEstado = { error: string | null; guardado: boolean };

export async function cargarStockInicial(
  sucursalId: string,
  _estado: CargaInicialEstado,
  formData: FormData,
): Promise<CargaInicialEstado> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const itemsRaw = String(formData.get("items") ?? "[]");
  let items: { insumo_id: string; cantidad: number }[] = [];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    items = [];
  }

  const movimientos = items.filter((i) => i.insumo_id && Number(i.cantidad) > 0);

  if (movimientos.length === 0) {
    return { error: "Cargá una cantidad mayor a cero en al menos un insumo.", guardado: false };
  }

  const { error } = await supabase.from("movimientos_inventario").insert(
    movimientos.map((m) => ({
      sucursal_id: sucursalId,
      insumo_id: m.insumo_id,
      tipo: "entrada" as const,
      cantidad: m.cantidad,
      precio: null,
      importe_total: null,
      es_inicial: true,
      registrado_por: user?.id,
    })),
  );

  if (error) {
    return { error: error.message, guardado: false };
  }

  revalidatePath(`/sucursales/${sucursalId}/inventario`);
  return { error: null, guardado: true };
}

export async function actualizarInsumo(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const insumoId = String(formData.get("insumo_id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const unidad = String(formData.get("unidad") ?? "").trim();
  const stockMinimoRaw = String(formData.get("stock_minimo") ?? "");
  const stockMinimo = stockMinimoRaw ? Number(stockMinimoRaw) : 0;
  const precioReferenciaRaw = String(formData.get("precio_referencia") ?? "").trim();
  const precio_referencia = precioReferenciaRaw ? Number(precioReferenciaRaw) : null;
  if (!insumoId || !nombre || !unidad) return;

  await supabase
    .from("insumos")
    .update({ nombre, unidad, stock_minimo: stockMinimo, precio_referencia })
    .eq("id", insumoId);

  revalidatePath("/sucursales/[id]/inventario", "page");
}

export type CrearInsumoEstado = { error: string | null };

export async function crearInsumo(
  _estado: CrearInsumoEstado,
  formData: FormData,
): Promise<CrearInsumoEstado> {
  const supabase = await createClient();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "");
  const unidad = String(formData.get("unidad") ?? "").trim() || "unidades";

  if (!nombre || !["medicos", "varios"].includes(categoria)) {
    return { error: "Completá nombre y categoría." };
  }

  const { error } = await supabase
    .from("insumos")
    .insert({ nombre, categoria, unidad, activo: true });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/sucursales/[id]/inventario", "page");
  return { error: null };
}

export async function eliminarInsumo(insumoId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("insumos").update({ activo: false }).eq("id", insumoId);
  revalidatePath("/sucursales/[id]/inventario", "page");
}

// --- Carga por foto de ticket: lee el ticket con IA y despues sigue el mismo
// proceso de "registrar movimiento" de arriba (movimientos_inventario, entrada).

type ItemExistente = { insumo_id: string; cantidad: number; precio: number | null };
type ItemNuevo = {
  nombre: string;
  categoria: CategoriaInsumo;
  cantidad: number;
  precio: number | null;
};
type ItemAEnviar = ItemExistente | ItemNuevo;

export type ItemLeido = {
  insumo_id: string | null;
  nombre: string;
  cantidad: number;
  categoriaSugerida: CategoriaInsumo;
  precioUnitario: number | null;
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
{"total": <número o null>, "items": [{"nombre": "<nombre del producto tal como lo entendiste, normalizado y corto>", "categoria": "<medicos|varios>", "cantidad": <número>, "precio_unitario": <número o null>}]}

Reglas:
- Transcribí TODOS los productos/mercadería que reconozcas en el ticket, no solo algunos.
- Usá nombres cortos y genéricos (ej: "Arroz" en vez de "ARROZ GALLO 1KG OFERTA").
- "categoria": clasificá cada producto en medicos (medicamentos, insumos médicos, higiene sanitaria) o varios (todo lo demás: almacén, limpieza, mercadería general).
- Si no podés determinar la cantidad, poné 1.
- "precio_unitario" es el precio por unidad de ESE producto (si el ticket muestra un subtotal por renglón, dividilo por la cantidad). Si no podés determinarlo con confianza, poné null — no inventes un precio.
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
    items?: { nombre?: unknown; categoria?: unknown; cantidad?: unknown; precio_unitario?: unknown }[];
  };
  try {
    parseado = JSON.parse(texto);
  } catch {
    return { total: null, items: [], error: "No se pudo interpretar la lectura del ticket." };
  }

  const categoriasValidas: CategoriaInsumo[] = ["medicos", "varios"];
  const catalogoNormalizado = catalogo.map((i) => ({ ...i, norm: normalizar(i.nombre) }));

  const items: ItemLeido[] = (parseado.items ?? [])
    .filter((it): it is { nombre: string; categoria?: unknown; cantidad?: unknown; precio_unitario?: unknown } => typeof it?.nombre === "string")
    .map((it) => {
      const norm = normalizar(it.nombre);
      const coincidencia = catalogoNormalizado.find(
        (c) => c.norm === norm || c.norm.includes(norm) || norm.includes(c.norm),
      );
      const categoria = categoriasValidas.includes(it.categoria as CategoriaInsumo)
        ? (it.categoria as CategoriaInsumo)
        : "varios";

      return {
        insumo_id: coincidencia?.id ?? null,
        nombre: coincidencia?.nombre ?? it.nombre,
        cantidad: Number(it.cantidad) > 0 ? Number(it.cantidad) : 1,
        categoriaSugerida: (coincidencia?.categoria as CategoriaInsumo) ?? categoria,
        precioUnitario:
          typeof it.precio_unitario === "number" && it.precio_unitario > 0
            ? it.precio_unitario
            : null,
      };
    });

  const total = typeof parseado.total === "number" && parseado.total > 0 ? parseado.total : null;

  return { total, items, error: null };
}

export type RegistrarPorTicketEstado = { error: string | null };

export async function registrarMovimientosPorTicket(
  sucursalId: string,
  _estado: RegistrarPorTicketEstado,
  formData: FormData,
): Promise<RegistrarPorTicketEstado> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const itemsRaw = String(formData.get("items") ?? "[]");
  let items: ItemAEnviar[] = [];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    items = [];
  }

  if (items.length === 0) {
    return { error: "No hay ningún producto para cargar." };
  }

  const movimientos: { insumo_id: string; cantidad: number; precio: number | null }[] = [];

  for (const item of items) {
    if (Number(item.cantidad) <= 0) continue;
    const precio = item.precio && item.precio > 0 ? item.precio : null;

    if ("insumo_id" in item) {
      movimientos.push({ insumo_id: item.insumo_id, cantidad: item.cantidad, precio });
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
        error: `No se pudo agregar "${nombre}" al catálogo: ${errorInsumo?.message ?? "error desconocido"}`,
      };
    }

    movimientos.push({ insumo_id: insumoCreado.id, cantidad: item.cantidad, precio });
  }

  if (movimientos.length === 0) {
    return { error: "No hay ningún producto para cargar." };
  }

  const { error: errorMovimientos } = await supabase.from("movimientos_inventario").insert(
    movimientos.map((m) => ({
      sucursal_id: sucursalId,
      insumo_id: m.insumo_id,
      tipo: "entrada" as const,
      cantidad: m.cantidad,
      precio: m.precio,
      importe_total: m.precio ? m.precio * m.cantidad : null,
      registrado_por: user?.id,
    })),
  );

  if (errorMovimientos) {
    return { error: errorMovimientos.message };
  }

  revalidatePath(`/sucursales/${sucursalId}/inventario`);
  return { error: null };
}
