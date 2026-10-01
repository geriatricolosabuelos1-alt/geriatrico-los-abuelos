-- Baja de empleados: fecha, motivo (de una lista) y detalle opcional, como en residentes.
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

alter table public.empleados
  add column if not exists fecha_baja date,
  add column if not exists motivo_baja text,
  add column if not exists detalle_baja text;
