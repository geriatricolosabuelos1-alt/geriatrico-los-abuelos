-- Recibos de sueldo generados (uno por empleado y periodo)
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

create table if not exists public.recibos_sueldo (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  periodo text not null check (periodo ~ '^\d{4}-\d{2}$'),
  fecha_pago date,
  items jsonb not null,
  total_haberes numeric(14,2) not null,
  total_descuentos numeric(14,2) not null,
  neto numeric(14,2) not null,
  generado_por uuid references public.perfiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (empleado_id, periodo)
);

alter table public.recibos_sueldo enable row level security;

drop policy if exists "recibos_sueldo_all_autenticados" on public.recibos_sueldo;
create policy "recibos_sueldo_all_autenticados" on public.recibos_sueldo
  for all to authenticated using (true) with check (true);
