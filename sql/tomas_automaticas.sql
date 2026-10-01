-- Tomas automáticas de medicación continua.
-- A cada horario indicado la toma se registra sola como "administrada" y descuenta stock
-- (trigger trg_dosis_administrada_efecto). Si no se dio, enfermería la marca rechazada /
-- suspendida con motivo desde la planilla MAR y el stock vuelve.

alter table public.medicamentos_residente
  add column if not exists tomas_auto_desde timestamptz;

alter table public.dosis_administradas
  add column if not exists automatica boolean not null default false;

create or replace function public.registrar_tomas_automaticas()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz constant text := 'America/Argentina/Mendoza';
  v_ahora timestamptz := now();
  v_total integer := 0;
  m record;
  v_dia date;
  v_hora text;
  v_momento timestamptz;
  v_cantidad numeric;
begin
  -- Evita que dos ejecuciones simultáneas (cron + página) dupliquen tomas.
  perform pg_advisory_xact_lock(hashtext('registrar_tomas_automaticas'));

  for m in
    select id, residente_id, horarios, dosis_diaria,
           greatest(tomas_auto_desde, v_ahora - interval '31 days') as desde
    from public.medicamentos_residente
    where activo
      and tipo_administracion = 'continua'
      and tomas_auto_desde is not null
      and coalesce(array_length(horarios, 1), 0) > 0
  loop
    v_cantidad := case
      when m.dosis_diaria is not null and m.dosis_diaria > 0
        then round(m.dosis_diaria / array_length(m.horarios, 1), 2)
      else 1
    end;

    for v_dia in
      select generate_series((m.desde at time zone v_tz)::date, (v_ahora at time zone v_tz)::date, interval '1 day')::date
    loop
      foreach v_hora in array m.horarios loop
        continue when v_hora !~ '^\d{1,2}:\d{2}$';
        v_momento := (v_dia + v_hora::time) at time zone v_tz;
        continue when v_momento < m.desde or v_momento > v_ahora;
        continue when exists (
          select 1 from public.dosis_administradas d
          where d.medicamento_id = m.id
            and d.horario_previsto = v_hora
            and (d.fecha at time zone v_tz)::date = v_dia
        );

        insert into public.dosis_administradas
          (medicamento_id, residente_id, cantidad, estado, horario_previsto, fecha, automatica)
        values
          (m.id, m.residente_id, v_cantidad, 'administrado', v_hora, v_momento, true);
        v_total := v_total + 1;
      end loop;
    end loop;
  end loop;

  return v_total;
end;
$$;

revoke all on function public.registrar_tomas_automaticas() from public, anon;
grant execute on function public.registrar_tomas_automaticas() to authenticated;

-- Corre cada 15 minutos aunque nadie tenga la app abierta.
create extension if not exists pg_cron;
select cron.schedule('tomas-automaticas', '*/15 * * * *', $$select public.registrar_tomas_automaticas()$$);
