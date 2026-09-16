-- Modulo de Fichado (ingreso/egreso) por DNI
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

create table if not exists public.fichadas (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  fecha date not null,
  hora time not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_fichadas_empleado_fecha on public.fichadas(empleado_id, fecha);

alter table public.fichadas enable row level security;

-- Solo el personal logueado del sistema puede leer las fichadas (reportes).
-- Nadie puede insertar/editar/borrar directo sobre la tabla: todo pasa por
-- las funciones de abajo, que validan el DNI y el estado del empleado.
drop policy if exists "fichadas_select_autenticados" on public.fichadas;
create policy "fichadas_select_autenticados" on public.fichadas
  for select
  to authenticated
  using (true);

-- Busca un empleado activo por DNI. Devuelve solo id + nombre (nada mas).
-- Compara solo los digitos: el DNI puede estar guardado con puntos (45.144.752)
-- y el kiosco lo manda sin formato (45144752).
create or replace function public.buscar_empleado_fichado(p_dni text)
returns table(id uuid, nombre_completo text)
language sql
security definer
set search_path = public
as $$
  select id, nombre_completo
  from empleados
  where regexp_replace(dni, '\D', '', 'g') = regexp_replace(p_dni, '\D', '', 'g')
    and dni is not null
    and activo = true
  limit 1;
$$;

revoke all on function public.buscar_empleado_fichado(text) from public;
grant execute on function public.buscar_empleado_fichado(text) to anon, authenticated;

-- Registra una fichada de ingreso/egreso para un empleado activo.
create or replace function public.registrar_fichada(p_empleado_id uuid, p_tipo text)
returns table(id uuid, tipo text, fecha date, hora time)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activo boolean;
  v_id uuid;
  v_tipo text;
  v_fecha date;
  v_hora time;
begin
  if p_tipo not in ('ingreso', 'egreso') then
    raise exception 'tipo invalido';
  end if;

  select e.activo into v_activo from empleados e where e.id = p_empleado_id;
  if v_activo is not true then
    raise exception 'empleado no encontrado o inactivo';
  end if;

  insert into fichadas (empleado_id, tipo, fecha, hora)
  values (
    p_empleado_id,
    p_tipo,
    (now() at time zone 'America/Argentina/Buenos_Aires')::date,
    (now() at time zone 'America/Argentina/Buenos_Aires')::time
  )
  returning fichadas.id, fichadas.tipo, fichadas.fecha, fichadas.hora
  into v_id, v_tipo, v_fecha, v_hora;

  return query select v_id, v_tipo, v_fecha, v_hora;
end;
$$;

revoke all on function public.registrar_fichada(uuid, text) from public;
grant execute on function public.registrar_fichada(uuid, text) to anon, authenticated;
