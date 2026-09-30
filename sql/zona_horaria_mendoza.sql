-- Alinear los valores por defecto y funciones que quedaron con
-- 'America/Argentina/Buenos_Aires' para que digan 'America/Argentina/Mendoza'.
--
-- IMPORTANTE: esto es puramente cosmetico. Argentina no tiene horario de
-- verano, asi que Buenos Aires y Mendoza son la MISMA zona horaria (UTC-3)
-- siempre. Este script no cambia ninguna fecha/hora calculada por el sistema,
-- solo el nombre de la zona horaria que aparece en el codigo de la base.
--
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn) -- opcional.

alter table public.cargos_extra_residente alter column fecha set default ((now() at time zone 'America/Argentina/Mendoza')::date);
alter table public.control_heladeras alter column fecha set default ((now() at time zone 'America/Argentina/Mendoza')::date);
alter table public.evaluaciones_mna alter column fecha set default ((now() at time zone 'America/Argentina/Mendoza')::date);
alter table public.gastos alter column fecha set default ((now() at time zone 'America/Argentina/Mendoza')::date);
alter table public.mediciones_antropometricas alter column fecha set default ((now() at time zone 'America/Argentina/Mendoza')::date);
alter table public.prescripcion_dietaria alter column vigente_desde set default ((now() at time zone 'America/Argentina/Mendoza')::date);
alter table public.registro_ingesta alter column fecha set default ((now() at time zone 'America/Argentina/Mendoza')::date);
alter table public.retiros_residuos_patogenicos alter column fecha set default ((now() at time zone 'America/Argentina/Mendoza')::date);
alter table public.vacunaciones_residente alter column fecha_aplicacion set default ((now() at time zone 'America/Argentina/Mendoza')::date);
alter table public.valoracion_deglucion alter column fecha set default ((now() at time zone 'America/Argentina/Mendoza')::date);
alter table public.interconsultas alter column fecha_pedido set default ((now() at time zone 'America/Argentina/Mendoza')::date);

-- Funcion de fichado (ingreso/egreso por DNI)
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
    (now() at time zone 'America/Argentina/Mendoza')::date,
    (now() at time zone 'America/Argentina/Mendoza')::time
  )
  returning fichadas.id, fichadas.tipo, fichadas.fecha, fichadas.hora
  into v_id, v_tipo, v_fecha, v_hora;

  return query select v_id, v_tipo, v_fecha, v_hora;
end;
$$;

revoke all on function public.registrar_fichada(uuid, text) from public;
grant execute on function public.registrar_fichada(uuid, text) to anon, authenticated;

-- Funcion que decide si el proximo fichado es ingreso o egreso
create or replace function public.proximo_tipo_fichada(p_empleado_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select case
    when f.tipo = 'ingreso'
      and (f.fecha + f.hora) > (now() at time zone 'America/Argentina/Mendoza') - interval '20 hours'
    then 'egreso'
    else 'ingreso'
  end
  from (select 1) x
  left join lateral (
    select tipo, fecha, hora
    from fichadas
    where empleado_id = p_empleado_id
    order by fecha desc, hora desc
    limit 1
  ) f on true;
$$;

revoke all on function public.proximo_tipo_fichada(uuid) from public;
grant execute on function public.proximo_tipo_fichada(uuid) to anon, authenticated;
