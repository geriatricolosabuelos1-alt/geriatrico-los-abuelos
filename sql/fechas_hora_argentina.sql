-- Las columnas de fecha que se completan solas usan el dia de Argentina, no el de UTC
-- (la base corre en UTC: desde las 21 hs CURRENT_DATE ya es el dia siguiente).
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

alter table public.cargos_extra_residente alter column fecha set default ((now() at time zone 'America/Argentina/Buenos_Aires')::date);
alter table public.control_heladeras alter column fecha set default ((now() at time zone 'America/Argentina/Buenos_Aires')::date);
alter table public.evaluaciones_mna alter column fecha set default ((now() at time zone 'America/Argentina/Buenos_Aires')::date);
alter table public.gastos alter column fecha set default ((now() at time zone 'America/Argentina/Buenos_Aires')::date);
alter table public.mediciones_antropometricas alter column fecha set default ((now() at time zone 'America/Argentina/Buenos_Aires')::date);
alter table public.prescripcion_dietaria alter column vigente_desde set default ((now() at time zone 'America/Argentina/Buenos_Aires')::date);
alter table public.registro_ingesta alter column fecha set default ((now() at time zone 'America/Argentina/Buenos_Aires')::date);
alter table public.retiros_residuos_patogenicos alter column fecha set default ((now() at time zone 'America/Argentina/Buenos_Aires')::date);
alter table public.vacunaciones_residente alter column fecha_aplicacion set default ((now() at time zone 'America/Argentina/Buenos_Aires')::date);
alter table public.valoracion_deglucion alter column fecha set default ((now() at time zone 'America/Argentina/Buenos_Aires')::date);
