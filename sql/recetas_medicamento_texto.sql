-- Recetario: medicamento escrito a mano (cuando no es uno de la medicacion del residente)
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

alter table public.recetas_medicamento
  add column if not exists medicamento_texto text;

-- Cantidad pedida en la receta (ej: "2 cajas"); se completa al pedir desde una alerta de stock.
alter table public.recetas_medicamento add column if not exists cantidad text;
