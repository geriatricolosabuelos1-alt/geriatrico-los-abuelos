-- Contrato editado por residente (texto modificado por administracion antes de imprimir)
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

create table if not exists public.contratos_editados (
  residente_id uuid primary key references public.residentes(id) on delete cascade,
  parrafos jsonb not null,
  editado_por uuid references public.perfiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.contratos_editados enable row level security;

drop policy if exists "contratos_editados_all_autenticados" on public.contratos_editados;
create policy "contratos_editados_all_autenticados" on public.contratos_editados
  for all
  to authenticated
  using (true)
  with check (true);
