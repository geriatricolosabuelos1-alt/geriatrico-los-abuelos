-- Menús especiales (diabéticos, sobrepeso/obesidad): una ficha editable por sede y tipo,
-- con los pacientes que la tienen indicada y desde qué fecha.
create table if not exists public.menus_especiales (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references public.sucursales(id) on delete cascade,
  tipo text not null check (tipo in ('diabetes', 'obesidad')),
  contenido jsonb not null,
  pacientes jsonb not null default '[]',
  actualizado_por uuid references public.perfiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (sucursal_id, tipo)
);

alter table public.menus_especiales enable row level security;

drop policy if exists menus_especiales_ver on public.menus_especiales;
create policy menus_especiales_ver on public.menus_especiales
  for select to authenticated
  using (
    mi_rol() in ('admin', 'medico', 'nutricionista')
    or (mi_rol() in ('gerente_sede', 'administrativo', 'enfermero', 'cuidador') and sucursal_id = mi_sucursal())
  );

drop policy if exists menus_especiales_escribir on public.menus_especiales;
create policy menus_especiales_escribir on public.menus_especiales
  for all to authenticated
  using (mi_rol() in ('admin', 'medico', 'nutricionista') or (mi_rol() = 'gerente_sede' and sucursal_id = mi_sucursal()))
  with check (mi_rol() in ('admin', 'medico', 'nutricionista') or (mi_rol() = 'gerente_sede' and sucursal_id = mi_sucursal()));

drop trigger if exists zz_auditar on public.menus_especiales;
create trigger zz_auditar after insert or update or delete on public.menus_especiales
  for each row execute function public.fn_auditar();
