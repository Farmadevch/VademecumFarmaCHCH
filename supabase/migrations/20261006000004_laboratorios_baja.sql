-- Habilita eliminar laboratorios (la política queda reservada al admin en la migración siguiente).
-- Un laboratorio con medicamentos asociados (aunque estén archivados) no se puede borrar:
-- lo impide la clave foránea medicamentos.laboratorio_id (error 23503).
-- Se puede ejecutar más de una vez.

grant delete on public.laboratorios to authenticated;

drop policy if exists staff_delete on public.laboratorios;
create policy staff_delete on public.laboratorios for delete to authenticated
  using (rol_actual() in ('farmacia', 'admin'));

-- Quién eliminó o renombró un laboratorio queda registrado.
drop trigger if exists trg_auditar_laboratorios on public.laboratorios;
create trigger trg_auditar_laboratorios after insert or update or delete on public.laboratorios
  for each row execute function public.auditar();
