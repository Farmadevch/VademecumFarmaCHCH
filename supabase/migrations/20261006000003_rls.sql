-- RLS y permisos. Supabase otorga privilegios amplios a anon/authenticated por defecto:
-- los quitamos y damos solo lo necesario.

alter table perfiles      enable row level security;
alter table laboratorios  enable row level security;
alter table medicamentos  enable row level security;
alter table lotes         enable row level security;
alter table movimientos   enable row level security;
alter table auditoria     enable row level security;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- Público (anon y authenticated): solo la vista pública y las RPC de búsqueda.
grant select on public.medicamentos_publicos to anon, authenticated;
grant execute on function public.buscar_medicamentos(text, bigint, forma_farm, text, text, text, int, int)
  to anon, authenticated;
grant execute on function public.opciones_filtros() to anon, authenticated;

-- Personal (la RLS decide quién entra de verdad).
grant select, insert, update on laboratorios, medicamentos, lotes to authenticated;
grant select, insert on movimientos to authenticated;
grant select on v_stock, auditoria to authenticated;
grant select, insert, update on perfiles to authenticated;
grant execute on function public.rol_actual() to authenticated;
grant execute on function public.f_unaccent(text) to authenticated;  -- lo usa el trigger de búsqueda
grant execute on function public.crear_lote(bigint, text, date, int, text) to authenticated;

-- Farmacia y admin
create policy staff_select on laboratorios for select to authenticated
  using (rol_actual() in ('farmacia', 'admin'));
create policy staff_insert on laboratorios for insert to authenticated
  with check (rol_actual() in ('farmacia', 'admin'));
create policy staff_update on laboratorios for update to authenticated
  using (rol_actual() in ('farmacia', 'admin')) with check (rol_actual() in ('farmacia', 'admin'));

create policy staff_select on medicamentos for select to authenticated
  using (rol_actual() in ('farmacia', 'admin'));
create policy staff_insert on medicamentos for insert to authenticated
  with check (rol_actual() in ('farmacia', 'admin'));
create policy staff_update on medicamentos for update to authenticated
  using (rol_actual() in ('farmacia', 'admin')) with check (rol_actual() in ('farmacia', 'admin'));

create policy staff_select on lotes for select to authenticated
  using (rol_actual() in ('farmacia', 'admin'));
create policy staff_insert on lotes for insert to authenticated
  with check (rol_actual() in ('farmacia', 'admin'));
create policy staff_update on lotes for update to authenticated
  using (rol_actual() in ('farmacia', 'admin')) with check (rol_actual() in ('farmacia', 'admin'));

-- Movimientos: libro contable, solo insert y select.
create policy staff_select on movimientos for select to authenticated
  using (rol_actual() in ('farmacia', 'admin'));
create policy staff_insert on movimientos for insert to authenticated
  with check (rol_actual() in ('farmacia', 'admin') and usuario_id = auth.uid());

-- Perfiles: cada uno ve el suyo; el admin gestiona todos.
create policy perfil_propio on perfiles for select to authenticated
  using (id = auth.uid());
create policy admin_select on perfiles for select to authenticated
  using (rol_actual() = 'admin');
create policy admin_insert on perfiles for insert to authenticated
  with check (rol_actual() = 'admin');
create policy admin_update on perfiles for update to authenticated
  using (rol_actual() = 'admin') with check (rol_actual() = 'admin');

-- Auditoría: solo la lee el admin (la escriben los triggers).
create policy admin_select on auditoria for select to authenticated
  using (rol_actual() = 'admin');
