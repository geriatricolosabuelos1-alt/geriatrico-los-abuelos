-- Interconsultas: pedido (fecha, motivo) y resultado (fecha, informe, archivo)
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

alter table public.interconsultas
  add column if not exists fecha_pedido date default ((now() at time zone 'America/Argentina/Buenos_Aires')::date),
  add column if not exists motivo text,
  add column if not exists profesional text,
  add column if not exists fecha_resultado date,
  add column if not exists resultado text,
  add column if not exists archivo_path text,
  add column if not exists nombre_archivo text;

-- Las interconsultas viejas toman como fecha de pedido la de creacion
update public.interconsultas
set fecha_pedido = (created_at at time zone 'America/Argentina/Buenos_Aires')::date
where fecha_pedido is null;
