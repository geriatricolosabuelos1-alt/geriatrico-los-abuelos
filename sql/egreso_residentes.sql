-- Egreso de residentes: motivo (de una lista) y detalle opcional
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

alter table public.residentes
  add column if not exists motivo_egreso text,
  add column if not exists detalle_egreso text;
