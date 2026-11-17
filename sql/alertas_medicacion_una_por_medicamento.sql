-- Alertas de stock de medicación: una sola alerta activa por medicamento, siempre con el nivel actual.
-- Antes, al pasar de "7 días" a "5 días" y a "sin stock" se creaban alertas nuevas sin cerrar las
-- anteriores, y el mismo medicamento figuraba a la vez "sin stock" y "con 5 días".
-- Aplicado en Supabase (proyecto ltgvplcrmmhgyfstrwpn).

create or replace function public.recalcular_alerta_medicamento(p_medicamento uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_med record;
  v_dias numeric;
  v_nivel text;
begin
  select id, residente_id, cantidad_stock, dosis_diaria, activo, coalesce(sin_seguimiento_stock, false) as sin_seguimiento
    into v_med
  from public.medicamentos_residente
  where id = p_medicamento;
  if not found then
    return;
  end if;

  if v_med.activo and not v_med.sin_seguimiento and v_med.dosis_diaria is not null and v_med.dosis_diaria > 0 then
    v_dias := round(greatest(v_med.cantidad_stock, 0) / v_med.dosis_diaria, 1);
    if v_med.cantidad_stock <= 0 then
      v_nivel := 'sin_stock';
    elsif v_dias <= 5 then
      v_nivel := 'aviso_5';
    elsif v_dias <= 10 then
      v_nivel := 'aviso_7';
    end if;
  end if;

  update public.alertas_medicacion
  set resuelta = true
  where medicamento_id = p_medicamento
    and resuelta = false
    and (v_nivel is null or nivel <> v_nivel);

  if v_nivel is not null then
    update public.alertas_medicacion
    set dias_restantes = v_dias
    where medicamento_id = p_medicamento
      and resuelta = false
      and nivel = v_nivel;
    if not found then
      insert into public.alertas_medicacion (medicamento_id, residente_id, dias_restantes, nivel)
      values (p_medicamento, v_med.residente_id, v_dias, v_nivel);
    end if;
  end if;
end;
$function$;

create or replace function public.fn_medicamento_recalcular_alerta()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.recalcular_alerta_medicamento(new.id);
  return new;
end;
$function$;

create trigger zz_recalcular_alerta
after insert or update of cantidad_stock, dosis_diaria, activo, sin_seguimiento_stock
on public.medicamentos_residente
for each row execute function public.fn_medicamento_recalcular_alerta();

-- Dar una dosis e ingresar stock solo mueven el stock; la alerta la recalcula el trigger de arriba.
create or replace function public.fn_dosis_administrada_efecto()
returns trigger
language plpgsql
as $function$
begin
  if new.estado = 'administrado' then
    update public.medicamentos_residente
    set cantidad_stock = greatest(cantidad_stock - new.cantidad, 0),
        updated_at = now()
    where id = new.medicamento_id;
  end if;
  return new;
end;
$function$;

create or replace function public.fn_ingreso_medicamento_stock()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.medicamentos_residente
  set cantidad_stock = cantidad_stock + new.cantidad,
      updated_at = now()
  where id = new.medicamento_id;
  return new;
end;
$function$;

-- Limpieza de las alertas duplicadas existentes.
select public.recalcular_alerta_medicamento(id)
from public.medicamentos_residente
where id in (select medicamento_id from public.alertas_medicacion where not resuelta);
