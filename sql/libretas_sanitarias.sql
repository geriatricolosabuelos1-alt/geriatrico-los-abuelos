-- Libretas sanitarias de empleados (Legales)
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

create table if not exists public.libretas_sanitarias (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  sucursal_id uuid not null references public.sucursales(id) on delete cascade,
  numero text,
  fecha_emision date,
  fecha_vencimiento date not null,
  emisor text,
  archivo_path text,
  nombre_archivo text,
  created_at timestamptz not null default now()
);

create index if not exists idx_libretas_sanitarias_empleado on public.libretas_sanitarias(empleado_id);
create index if not exists idx_libretas_sanitarias_sucursal on public.libretas_sanitarias(sucursal_id);

alter table public.libretas_sanitarias enable row level security;

drop policy if exists "libretas_sanitarias_all_autenticados" on public.libretas_sanitarias;
create policy "libretas_sanitarias_all_autenticados" on public.libretas_sanitarias
  for all
  to authenticated
  using (true)
  with check (true);

-- Bucket privado para las fotos/PDF de las libretas
insert into storage.buckets (id, name, public)
values ('empleados-documentos', 'empleados-documentos', false)
on conflict (id) do nothing;

drop policy if exists "empleados_documentos_autenticados" on storage.objects;
create policy "empleados_documentos_autenticados" on storage.objects
  for all
  to authenticated
  using (bucket_id = 'empleados-documentos')
  with check (bucket_id = 'empleados-documentos');
