-- Módulo de Seguridad: registro de todos los movimientos (altas, cambios y bajas)
-- de cada usuario, con fecha y hora y el detalle de qué cambió.
-- Solo lo pueden ver ozalazar, rtimoner y gcaballero. Los registros no se pueden
-- modificar ni borrar (se guardan para siempre).

create table if not exists public.auditoria (
  id bigserial primary key,
  fecha timestamptz not null default now(),
  usuario_id uuid,
  usuario text,
  nombre text,
  accion text not null,        -- ALTA / MODIFICACION / BAJA / INGRESO / INGRESO_FALLIDO / CUENTA
  tabla text,
  registro_id text,
  sucursal_id uuid,
  descripcion text,
  cambios jsonb,               -- {campo: {antes, despues}} en las modificaciones
  datos jsonb                  -- la fila completa (antes de borrar / después de crear o modificar)
);

create index if not exists auditoria_fecha_idx on public.auditoria (fecha desc);
create index if not exists auditoria_usuario_idx on public.auditoria (usuario_id, fecha desc);
create index if not exists auditoria_tabla_idx on public.auditoria (tabla, fecha desc);

-- Facturas emitidas con la llave de servicio: se guarda quién la emitió.
alter table public.facturas_arca add column if not exists emitido_por uuid;

-- ¿Puede ver el módulo de Seguridad el usuario actual?
create or replace function public.puede_ver_auditoria()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and usuario in ('ozalazar', 'rtimoner', 'gcaballero') and activo
  );
$$;

alter table public.auditoria enable row level security;

drop policy if exists auditoria_select on public.auditoria;
create policy auditoria_select on public.auditoria
  for select to authenticated
  using (public.puede_ver_auditoria());
-- Sin políticas de insert/update/delete: solo escriben los triggers y el servidor.

-- Nadie (ni la llave de servicio) puede modificar ni borrar registros.
create or replace function public.fn_auditoria_inmutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Los registros de seguridad no se pueden modificar ni borrar.';
end;
$$;

drop trigger if exists auditoria_inmutable on public.auditoria;
create trigger auditoria_inmutable
  before update or delete on public.auditoria
  for each row execute function public.fn_auditoria_inmutable();

drop trigger if exists auditoria_sin_truncate on public.auditoria;
create trigger auditoria_sin_truncate
  before truncate on public.auditoria
  for each statement execute function public.fn_auditoria_inmutable();

-- Trigger genérico que registra cada alta, modificación o baja.
create or replace function public.fn_auditar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nuevo jsonb;
  v_viejo jsonb;
  v_fila jsonb;
  v_cambios jsonb := null;
  v_uid uuid;
  v_usuario text;
  v_nombre text;
  v_sucursal uuid;
  v_accion text;
  v_clave text;
  v_ocultos text[] := array['pin_seguridad_hash', 'cert', 'private_key', 'token', 'sign'];
begin
  if tg_op in ('INSERT', 'UPDATE') then v_nuevo := to_jsonb(new) - v_ocultos; end if;
  if tg_op in ('UPDATE', 'DELETE') then v_viejo := to_jsonb(old) - v_ocultos; end if;

  if tg_op = 'UPDATE' then
    select jsonb_object_agg(k, jsonb_build_object('antes', v_viejo -> k, 'despues', v_nuevo -> k))
      into v_cambios
      from jsonb_object_keys(v_nuevo) as k
      where k not in ('updated_at')
        and (v_viejo -> k) is distinct from (v_nuevo -> k);
    -- Datos ocultos (claves, certificados): se registra que cambiaron, sin el valor.
    foreach v_clave in array v_ocultos loop
      if (to_jsonb(old) -> v_clave) is distinct from (to_jsonb(new) -> v_clave) then
        v_cambios := coalesce(v_cambios, '{}'::jsonb)
          || jsonb_build_object(v_clave, jsonb_build_object('antes', '(oculto)', 'despues', '(oculto, cambiado)'));
      end if;
    end loop;
    if v_cambios is null then return null; end if;
  end if;

  v_fila := coalesce(v_nuevo, v_viejo);
  v_accion := case tg_op when 'INSERT' then 'ALTA' when 'UPDATE' then 'MODIFICACION' else 'BAJA' end;

  -- Quién: el usuario de la sesión, o el que quedó guardado en la fila
  -- (para lo que el servidor graba con la llave de servicio).
  v_uid := auth.uid();
  if v_uid is null then
    begin
      v_uid := coalesce(
        nullif(v_fila ->> 'emitido_por', '')::uuid,
        nullif(v_fila ->> 'registrado_por', '')::uuid,
        nullif(v_fila ->> 'creado_por', '')::uuid
      );
    exception when others then
      v_uid := null;
    end;
  end if;
  if v_uid is not null then
    select usuario, nombre_completo into v_usuario, v_nombre from perfiles where id = v_uid;
  end if;

  -- Sede: la de la fila, o la del residente / empleado al que pertenece.
  begin
    v_sucursal := nullif(v_fila ->> 'sucursal_id', '')::uuid;
    if v_sucursal is null and v_fila ? 'residente_id' then
      select sucursal_id into v_sucursal from residentes where id = nullif(v_fila ->> 'residente_id', '')::uuid;
    end if;
    if v_sucursal is null and v_fila ? 'empleado_id' then
      select sucursal_id into v_sucursal from empleados where id = nullif(v_fila ->> 'empleado_id', '')::uuid;
    end if;
  exception when others then
    v_sucursal := null;
  end;

  insert into auditoria (usuario_id, usuario, nombre, accion, tabla, registro_id, sucursal_id, cambios, datos)
  values (v_uid, v_usuario, v_nombre, v_accion, tg_table_name, v_fila ->> 'id', v_sucursal, v_cambios, v_fila);

  return null;
end;
$$;

revoke all on function public.fn_auditar() from public, anon, authenticated;

-- Se activa en todas las tablas del sistema (menos la propia auditoría y el token de ARCA,
-- que se renueva solo y no es un movimiento de usuario).
do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and tablename not in ('auditoria', 'arca_tokens')
  loop
    execute format('drop trigger if exists zz_auditar on public.%I', t);
    execute format(
      'create trigger zz_auditar after insert or update or delete on public.%I for each row execute function public.fn_auditar()',
      t
    );
  end loop;
end;
$$;

alter function public.fn_auditoria_inmutable() set search_path = public;
revoke execute on function public.puede_ver_auditoria() from public, anon;
grant execute on function public.puede_ver_auditoria() to authenticated;
