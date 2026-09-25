-- Datos del personal solo para administracion: admin (todas las sedes) y
-- gerente_sede / administrativo (solo su sede).
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

-- ---------- Recibos de sueldo ----------
drop policy if exists "recibos_sueldo_all_autenticados" on public.recibos_sueldo;
drop policy if exists "recibos_sueldo_administracion" on public.recibos_sueldo;
create policy "recibos_sueldo_administracion" on public.recibos_sueldo
  for all to authenticated
  using (
    mi_rol() = 'admin'
    or (mi_rol() in ('administrativo', 'gerente_sede')
        and exists (select 1 from empleados e where e.id = recibos_sueldo.empleado_id and e.sucursal_id = mi_sucursal()))
  )
  with check (
    mi_rol() = 'admin'
    or (mi_rol() in ('administrativo', 'gerente_sede')
        and exists (select 1 from empleados e where e.id = recibos_sueldo.empleado_id and e.sucursal_id = mi_sucursal()))
  );

-- ---------- Libretas sanitarias ----------
drop policy if exists "libretas_sanitarias_all_autenticados" on public.libretas_sanitarias;
drop policy if exists "libretas_sanitarias_administracion" on public.libretas_sanitarias;
create policy "libretas_sanitarias_administracion" on public.libretas_sanitarias
  for all to authenticated
  using (mi_rol() = 'admin' or (mi_rol() in ('administrativo', 'gerente_sede') and sucursal_id = mi_sucursal()))
  with check (mi_rol() = 'admin' or (mi_rol() in ('administrativo', 'gerente_sede') and sucursal_id = mi_sucursal()));

-- Archivos de las libretas (carpeta empleados-documentos)
drop policy if exists "empleados_documentos_autenticados" on storage.objects;
drop policy if exists "empleados_documentos_administracion" on storage.objects;
create policy "empleados_documentos_administracion" on storage.objects
  for all to authenticated
  using (bucket_id = 'empleados-documentos' and mi_rol() in ('admin', 'administrativo', 'gerente_sede'))
  with check (bucket_id = 'empleados-documentos' and mi_rol() in ('admin', 'administrativo', 'gerente_sede'));

-- ---------- Turnos semanales ----------
-- Ya existen politicas por rol (ver/crear/editar/borrar); se quita la abierta que las anulaba.
drop policy if exists "turnos_programados_all_autenticados" on public.turnos_programados;

-- ---------- Fichadas ----------
-- Ya existe la politica de lectura para administracion; se quita la abierta.
-- El fichado con DNI sigue funcionando: usa funciones propias (registrar_fichada, etc.).
drop policy if exists "fichadas_select_autenticados" on public.fichadas;
