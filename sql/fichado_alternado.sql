-- Fichado alternado: despues de un ingreso, lo proximo es la salida (y viceversa)
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

-- Devuelve que le toca marcar al empleado: 'egreso' si su ultima fichada fue un
-- ingreso de las ultimas 20 horas (cubre turnos noche), si no 'ingreso'.
create or replace function public.proximo_tipo_fichada(p_empleado_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select case
    when f.tipo = 'ingreso'
      and (f.fecha + f.hora) > (now() at time zone 'America/Argentina/Buenos_Aires') - interval '20 hours'
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
