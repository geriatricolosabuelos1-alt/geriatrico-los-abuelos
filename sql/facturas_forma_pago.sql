-- Facturas ARCA: condicion de venta (Contado / Cuenta corriente) y medio de pago
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

alter table public.facturas_arca
  add column if not exists condicion_venta text,
  add column if not exists medio_pago text;
