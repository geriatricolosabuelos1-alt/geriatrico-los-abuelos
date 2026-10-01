-- Turnos semanales recurrentes (reemplaza el registro manual de "turnos cubiertos")
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

create table if not exists public.turnos_programados (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  sucursal_id uuid not null references public.sucursales(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 1 and 7), -- 1=Lunes ... 7=Domingo
  hora_inicio time not null,
  hora_fin time not null,
  vigente_desde date not null,
  vigente_hasta date not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_turnos_programados_empleado on public.turnos_programados(empleado_id);
create index if not exists idx_turnos_programados_sucursal on public.turnos_programados(sucursal_id);

alter table public.turnos_programados enable row level security;

drop policy if exists "turnos_programados_all_autenticados" on public.turnos_programados;
create policy "turnos_programados_all_autenticados" on public.turnos_programados
  for all
  to authenticated
  using (true)
  with check (true);

-- Turnos rotativos (ej. 2×2): trabaja dias_trabajo seguidos y descansa dias_franco, a partir de
-- vigente_desde (primer día de trabajo). Si son nulos, es un turno semanal por dia_semana.
alter table public.turnos_programados add column if not exists dias_trabajo smallint check (dias_trabajo between 1 and 14);
alter table public.turnos_programados add column if not exists dias_franco smallint check (dias_franco between 1 and 14);
