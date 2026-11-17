-- Evaluación + indicaciones médicas: si las carga administración quedan "pendientes de firma médica"
-- (firmado_por null). La médica las revisa, corrige y firma con su PIN. Firmadas, no se pueden modificar.
-- cargado_por es solo registro interno: no se imprime.
-- Aplicado en Supabase (proyecto ltgvplcrmmhgyfstrwpn).

alter table public.evaluaciones_medicas add column if not exists cargado_por uuid references public.perfiles(id) on delete set null;
alter table public.indicaciones_medicas add column if not exists cargado_por uuid references public.perfiles(id) on delete set null;
alter table public.evaluaciones_medicas alter column firmado_at drop not null;
alter table public.indicaciones_medicas alter column firmado_at drop not null;

create or replace function public.fn_bloquear_documento_medico_firmado()
returns trigger
language plpgsql
as $function$
begin
  if old.firmado_por is not null then
    raise exception 'Este documento ya está firmado por la médica y no se puede modificar.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

create trigger trg_evaluacion_firmada_inmutable before update or delete on public.evaluaciones_medicas
  for each row execute function public.fn_bloquear_documento_medico_firmado();
create trigger trg_indicacion_firmada_inmutable before update or delete on public.indicaciones_medicas
  for each row execute function public.fn_bloquear_documento_medico_firmado();
create trigger zz_auditar after insert or delete or update on public.evaluaciones_medicas
  for each row execute function public.fn_auditar();
create trigger zz_auditar after insert or delete or update on public.indicaciones_medicas
  for each row execute function public.fn_auditar();

-- Lo que había firmado alguien que no es médico pasa a pendiente (queda registrado quién lo cargó).
alter table public.evaluaciones_medicas disable trigger trg_evaluacion_firmada_inmutable;
alter table public.indicaciones_medicas disable trigger trg_indicacion_firmada_inmutable;
update public.evaluaciones_medicas e set cargado_por = e.firmado_por, firmado_por = null, firmado_at = null
  from public.perfiles p where p.id = e.firmado_por and p.rol <> 'medico';
update public.indicaciones_medicas e set cargado_por = e.firmado_por, firmado_por = null, firmado_at = null
  from public.perfiles p where p.id = e.firmado_por and p.rol <> 'medico';
alter table public.evaluaciones_medicas enable trigger trg_evaluacion_firmada_inmutable;
alter table public.indicaciones_medicas enable trigger trg_indicacion_firmada_inmutable;
