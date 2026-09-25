-- Permisos por rol: que cada rol pueda guardar lo que el menu le muestra.
-- admin: todo. gerente_sede / administrativo: solo residentes de su sede.
-- Ejecutar en el SQL Editor de Supabase (proyecto ltgvplcrmmhgyfstrwpn)

-- ---------- Interconsultas ----------
-- Crear: admin, medico y gerente (de su sede)
drop policy if exists "interconsultas_crear" on public.interconsultas;
create policy "interconsultas_crear" on public.interconsultas
  for insert to authenticated
  with check (
    mi_rol() in ('admin', 'medico')
    or (mi_rol() = 'gerente_sede'
        and exists (select 1 from residentes r where r.id = interconsultas.residente_id and r.sucursal_id = mi_sucursal()))
  );

-- Cargar resultado / marcar resuelta: se suma el medico
drop policy if exists "interconsultas_editar" on public.interconsultas;
create policy "interconsultas_editar" on public.interconsultas
  for update to authenticated
  using (
    mi_rol() in ('admin', 'medico')
    or (mi_rol() in ('administrativo', 'gerente_sede')
        and exists (select 1 from residentes r where r.id = interconsultas.residente_id and r.sucursal_id = mi_sucursal()))
  );

-- Eliminar (no existia): admin, medico y gerente (de su sede)
drop policy if exists "interconsultas_borrar" on public.interconsultas;
create policy "interconsultas_borrar" on public.interconsultas
  for delete to authenticated
  using (
    mi_rol() in ('admin', 'medico')
    or (mi_rol() = 'gerente_sede'
        and exists (select 1 from residentes r where r.id = interconsultas.residente_id and r.sucursal_id = mi_sucursal()))
  );

-- ---------- Vacunacion ----------
-- Agregar: se suman gerente y administrativo (de su sede)
drop policy if exists "vacunacion_escribir" on public.vacunaciones_residente;
create policy "vacunacion_escribir" on public.vacunaciones_residente
  for insert to authenticated
  with check (
    mi_rol() in ('admin', 'medico', 'enfermero')
    or (mi_rol() in ('administrativo', 'gerente_sede')
        and exists (select 1 from residentes r where r.id = vacunaciones_residente.residente_id and r.sucursal_id = mi_sucursal()))
  );

-- Eliminar: se suma el medico
drop policy if exists "vacunacion_borrar" on public.vacunaciones_residente;
create policy "vacunacion_borrar" on public.vacunaciones_residente
  for delete to authenticated
  using (
    mi_rol() in ('admin', 'medico')
    or (mi_rol() in ('administrativo', 'gerente_sede')
        and exists (select 1 from residentes r where r.id = vacunaciones_residente.residente_id and r.sucursal_id = mi_sucursal()))
  );

-- ---------- Menu semanal ----------
-- Crear: se suman medico, gerente y administrativo (de su sede)
drop policy if exists "menu_semanal_escribir" on public.menu_semanal;
create policy "menu_semanal_escribir" on public.menu_semanal
  for insert to authenticated
  with check (
    mi_rol() in ('admin', 'nutricionista', 'medico')
    or (mi_rol() in ('administrativo', 'gerente_sede') and sucursal_id = mi_sucursal())
  );

-- Editar: se suman nutricionista y medico
drop policy if exists "menu_semanal_editar" on public.menu_semanal;
create policy "menu_semanal_editar" on public.menu_semanal
  for update to authenticated
  using (
    mi_rol() in ('admin', 'nutricionista', 'medico')
    or (mi_rol() in ('administrativo', 'gerente_sede') and sucursal_id = mi_sucursal())
  );

-- Eliminar (no existia)
drop policy if exists "menu_semanal_borrar" on public.menu_semanal;
create policy "menu_semanal_borrar" on public.menu_semanal
  for delete to authenticated
  using (
    mi_rol() in ('admin', 'nutricionista', 'medico')
    or (mi_rol() in ('administrativo', 'gerente_sede') and sucursal_id = mi_sucursal())
  );

-- ---------- Ficha medica ----------
-- Crear: se suman gerente y administrativo (de su sede); el legajo la guarda con upsert
drop policy if exists "ficha_medica_escribir" on public.ficha_medica;
create policy "ficha_medica_escribir" on public.ficha_medica
  for insert to authenticated
  with check (
    mi_rol() in ('admin', 'medico', 'enfermero', 'cuidador')
    or (mi_rol() in ('administrativo', 'gerente_sede')
        and exists (select 1 from residentes r where r.id = ficha_medica.residente_id and r.sucursal_id = mi_sucursal()))
  );

-- Editar: se suman medico y enfermero
drop policy if exists "ficha_medica_editar" on public.ficha_medica;
create policy "ficha_medica_editar" on public.ficha_medica
  for update to authenticated
  using (
    mi_rol() in ('admin', 'medico', 'enfermero')
    or (mi_rol() in ('administrativo', 'gerente_sede')
        and exists (select 1 from residentes r where r.id = ficha_medica.residente_id and r.sucursal_id = mi_sucursal()))
  );
