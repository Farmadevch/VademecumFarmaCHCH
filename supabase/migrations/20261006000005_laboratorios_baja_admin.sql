-- Eliminar laboratorios queda reservado al admin (reemplaza la política de la migración anterior).
-- Se puede ejecutar más de una vez.
drop policy if exists staff_delete on public.laboratorios;
drop policy if exists admin_delete on public.laboratorios;

create policy admin_delete on public.laboratorios for delete to authenticated
  using (rol_actual() = 'admin');
