-- Registro de llamadas a emergencias (Area Protegida / prestador)
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

create table if not exists public.emergencias (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references public.sucursales(id) on delete cascade,
  residente_id uuid references public.residentes(id) on delete set null,
  fecha date not null,
  hora time,
  prestador text not null,
  motivo text,
  demora_minutos integer,
  traslado boolean not null default false,
  satisfactoria boolean,
  observaciones text,
  registrado_por uuid references public.perfiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_emergencias_sucursal_fecha on public.emergencias(sucursal_id, fecha);

alter table public.emergencias enable row level security;

drop policy if exists "emergencias_all_autenticados" on public.emergencias;
create policy "emergencias_all_autenticados" on public.emergencias
  for all
  to authenticated
  using (true)
  with check (true);
