-- Lógica en la base: helpers, búsqueda, triggers de stock y auditoría, vistas y RPC.

-- ---------- Helpers ----------

create or replace function public.rol_actual()
returns rol_usuario
language sql stable security definer
set search_path = public
as $$
  select rol from perfiles where id = auth.uid() and activo
$$;

-- unaccent no es IMMUTABLE; este wrapper permite usarlo en índices.
create or replace function public.f_unaccent(text)
returns text
language sql immutable parallel safe strict
set search_path = public, extensions
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

-- ---------- Búsqueda ----------

create or replace function public.medicamentos_set_busqueda()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  new.busqueda := f_unaccent(lower(
    new.nombre_generico || ' ' || coalesce(new.nombre_comercial, '') || ' ' ||
    coalesce((select nombre from laboratorios where id = new.laboratorio_id), '')
  ));
  new.updated_at := now();
  return new;
end $$;

create trigger trg_medicamentos_busqueda
  before insert or update on medicamentos
  for each row execute function medicamentos_set_busqueda();

create or replace function public.laboratorios_refrescar_busqueda()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  update medicamentos set laboratorio_id = laboratorio_id where laboratorio_id = new.id;
  return new;
end $$;

create trigger trg_laboratorios_busqueda
  after update of nombre on laboratorios
  for each row execute function laboratorios_refrescar_busqueda();

create index medicamentos_busqueda_trgm
  on medicamentos using gin (busqueda extensions.gin_trgm_ops);

-- ---------- Updated_at y auditoría ----------

create or replace function public.auditar()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_accion text := lower(tg_op);
  v_antes jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_despues jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  -- Se lee desde el JSON porque old/new.activo no existe en lotes ni perfiles.
  if tg_table_name = 'medicamentos' and tg_op = 'UPDATE'
     and (v_antes ->> 'activo')::boolean and not (v_despues ->> 'activo')::boolean then
    v_accion := 'archive';
  end if;

  insert into auditoria (tabla, registro_id, accion, datos_antes, datos_despues)
  values (
    tg_table_name,
    coalesce(v_despues ->> 'id', v_antes ->> 'id'),
    v_accion, v_antes, v_despues
  );
  return coalesce(new, old);
end $$;

create trigger trg_auditar_medicamentos after insert or update or delete on medicamentos
  for each row execute function auditar();
create trigger trg_auditar_lotes after insert or update or delete on lotes
  for each row execute function auditar();
create trigger trg_auditar_perfiles after insert or update or delete on perfiles
  for each row execute function auditar();

-- ---------- Stock: solo cambia por movimientos ----------

-- Impide editar a mano lotes.cantidad desde la API. Los movimientos (trigger, nivel 2)
-- y los scripts de servidor/migración (auth.uid() nulo) sí pueden.
create or replace function public.lotes_proteger_cantidad()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and pg_trigger_depth() < 2 then
    if tg_op = 'INSERT' and new.cantidad <> 0 then
      raise exception 'El stock no se carga a mano: usá crear_lote() o registrá un ingreso.';
    elsif tg_op = 'UPDATE' and new.cantidad <> old.cantidad then
      raise exception 'El stock no se edita a mano: registrá un movimiento.';
    end if;
  end if;
  return new;
end $$;

create trigger trg_lotes_proteger_cantidad
  before insert or update on lotes
  for each row execute function lotes_proteger_cantidad();

create or replace function public.movimientos_aplicar()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_delta int;
  v_actual int;
begin
  v_delta := case new.tipo
    when 'ingreso' then new.cantidad
    when 'egreso'  then -new.cantidad
    when 'vencido' then -new.cantidad
    when 'ajuste'  then new.cantidad * new.sentido
  end;

  select cantidad into v_actual from lotes where id = new.lote_id for update;
  if not found then
    raise exception 'El lote % no existe.', new.lote_id;
  end if;
  if v_actual + v_delta < 0 then
    raise exception 'Stock insuficiente en el lote (hay %, se piden %).', v_actual, -v_delta;
  end if;

  update lotes set cantidad = v_actual + v_delta where id = new.lote_id;
  return new;
end $$;

create trigger trg_movimientos_aplicar
  before insert on movimientos
  for each row execute function movimientos_aplicar();

-- Libro contable: nunca se modifica ni se borra.
create or replace function public.movimientos_inmutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Los movimientos no se modifican ni se borran.';
end $$;

create trigger trg_movimientos_inmutable
  before update or delete on movimientos
  for each row execute function movimientos_inmutable();

-- Alta de lote con stock inicial: lote en 0 + movimiento de ingreso.
create or replace function public.crear_lote(
  p_medicamento_id bigint,
  p_nro_lote text,
  p_vencimiento date,
  p_cantidad int,
  p_motivo text default 'Ingreso inicial'
)
returns bigint
language plpgsql security definer
set search_path = public
as $$
declare
  v_lote_id bigint;
begin
  if rol_actual() is null then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  insert into lotes (medicamento_id, nro_lote, vencimiento, cantidad)
  values (p_medicamento_id, p_nro_lote, p_vencimiento, 0)
  returning id into v_lote_id;

  if p_cantidad > 0 then
    insert into movimientos (lote_id, tipo, cantidad, motivo)
    values (v_lote_id, 'ingreso', p_cantidad, p_motivo);
  end if;
  return v_lote_id;
end $$;

-- ---------- Vistas ----------

create or replace view public.v_stock
with (security_invoker = true) as
select
  m.id as medicamento_id,
  coalesce(sum(l.cantidad) filter (where l.vencimiento >= current_date), 0)::int as stock_total,
  min(l.vencimiento) filter (where l.vencimiento >= current_date and l.cantidad > 0) as proximo_vencimiento
from medicamentos m
left join lotes l on l.medicamento_id = m.id
group by m.id;

-- Vista pública: sin cantidades ni lotes. Se ejecuta con los permisos del dueño
-- (security_invoker = false) para que anon no necesite acceso a las tablas.
create or replace view public.medicamentos_publicos
with (security_invoker = false) as
select
  m.id,
  m.nombre_generico,
  m.nombre_comercial,
  lab.nombre as laboratorio,
  m.laboratorio_id,
  m.concentracion,
  m.forma,
  m.via,
  m.categoria,
  m.controlado,
  m.lista_controlado,
  case
    when s.stock_total = 0 then 'sin_stock'
    when s.stock_total <= m.stock_minimo then 'bajo'
    else 'disponible'
  end as estado,
  m.updated_at
from medicamentos m
left join laboratorios lab on lab.id = m.laboratorio_id
join v_stock s on s.medicamento_id = m.id
where m.activo;

-- ---------- RPC de búsqueda (tolera errores de tipeo) ----------

create or replace function public.buscar_medicamentos(
  q text default null,
  p_laboratorio bigint default null,
  p_forma forma_farm default null,
  p_categoria text default null,
  p_concentracion text default null,
  p_estado text default null,           -- 'disponible' | 'bajo' | 'sin_stock'
  p_limit int default 60,
  p_offset int default 0
)
returns setof public.medicamentos_publicos
language sql stable security definer
set search_path = public, extensions
as $$
  with consulta as (
    select nullif(btrim(f_unaccent(lower(coalesce(q, '')))), '') as t
  )
  select p.*
  from medicamentos_publicos p
  join medicamentos m on m.id = p.id
  cross join consulta c
  where (c.t is null
         or m.busqueda like '%' || c.t || '%'
         or word_similarity(c.t, m.busqueda) >= 0.4)
    and (p_laboratorio is null or p.laboratorio_id = p_laboratorio)
    and (p_forma is null or p.forma = p_forma)
    and (p_categoria is null or p.categoria = p_categoria)
    and (p_concentracion is null or p.concentracion = p_concentracion)
    and (p_estado is null or p.estado = p_estado)
  order by
    case when c.t is null then 0
         else greatest(similarity(c.t, m.busqueda), word_similarity(c.t, m.busqueda)) end desc,
    p.nombre_generico, p.concentracion
  limit least(p_limit, 200) offset greatest(p_offset, 0)
$$;

-- Opciones para los filtros públicos.
create or replace function public.opciones_filtros()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'laboratorios', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'nombre', nombre) order by nombre)
      from laboratorios where id in (select laboratorio_id from medicamentos where activo)), '[]'),
    'categorias', coalesce((
      select jsonb_agg(distinct categoria) from medicamentos where activo and categoria is not null), '[]'),
    'concentraciones', coalesce((
      select jsonb_agg(distinct concentracion) from medicamentos where activo), '[]')
  )
$$;
