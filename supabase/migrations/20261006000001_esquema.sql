-- Esquema base: extensiones, enums y tablas.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create type rol_usuario     as enum ('farmacia', 'admin');
create type tipo_movimiento as enum ('ingreso', 'egreso', 'ajuste', 'vencido');
create type forma_farm      as enum (
  'comprimido', 'capsula', 'suspension', 'jarabe', 'ampolla',
  'frasco_ampolla', 'crema', 'gotas', 'supositorio', 'inhalador', 'otro'
);

create table perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null,
  rol rol_usuario not null default 'farmacia',
  activo boolean not null default true,
  created_at timestamptz default now()
);

create table laboratorios (
  id bigint generated always as identity primary key,
  nombre text not null unique
);

create table medicamentos (
  id bigint generated always as identity primary key,
  nombre_generico text not null,
  nombre_comercial text,
  laboratorio_id bigint references laboratorios,
  concentracion text not null,
  forma forma_farm not null,
  via text not null,
  categoria text,
  codigo_barras text unique,
  stock_minimo int not null default 0 check (stock_minimo >= 0),
  controlado boolean not null default false,
  lista_controlado text,
  activo boolean not null default true,
  busqueda text not null default '',      -- texto normalizado para buscar (lo mantiene un trigger)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint lista_si_controlado check (controlado or lista_controlado is null)
);

create table lotes (
  id bigint generated always as identity primary key,
  medicamento_id bigint not null references medicamentos,
  nro_lote text not null,
  vencimiento date not null,
  cantidad int not null default 0 check (cantidad >= 0),
  unique (medicamento_id, nro_lote)
);

create table movimientos (
  id bigint generated always as identity primary key,
  lote_id bigint not null references lotes,
  tipo tipo_movimiento not null,
  cantidad int not null check (cantidad > 0),
  -- Solo se usa en 'ajuste': +1 suma, -1 resta. En los demás tipos lo define el tipo.
  sentido smallint not null default 1 check (sentido in (-1, 1)),
  motivo text,
  usuario_id uuid not null references auth.users default auth.uid(),
  created_at timestamptz default now(),
  constraint ajuste_con_motivo check (tipo <> 'ajuste' or coalesce(btrim(motivo), '') <> '')
);

create table auditoria (
  id bigint generated always as identity primary key,
  tabla text not null,
  registro_id text not null,
  accion text not null,                   -- insert / update / delete / archive
  datos_antes jsonb,
  datos_despues jsonb,
  usuario_id uuid default auth.uid(),
  created_at timestamptz default now()
);

create index on medicamentos (laboratorio_id);
create index on medicamentos (forma);
create index on medicamentos (categoria);
create index on lotes (medicamento_id);
create index on lotes (vencimiento);
create index on movimientos (lote_id);
create index on movimientos (created_at desc);
create index on auditoria (created_at desc);
