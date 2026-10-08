-- Datos de ejemplo (re-ejecutable: limpia antes de cargar) (se ejecuta como postgres: auth.uid() es nulo, por eso puede cargar lotes con cantidad).

-- Parche: reemplaza auditar() por la versión corregida (por si la base tiene la anterior).
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

truncate movimientos, lotes, medicamentos, laboratorios, auditoria restart identity cascade;

insert into laboratorios (nombre) values
  ('Roemmers'), ('Bagó'), ('Gador'), ('Elea'), ('Richmond'), ('Baliarda')
;

insert into medicamentos
  (nombre_generico, nombre_comercial, laboratorio_id, concentracion, forma, via, categoria, stock_minimo, controlado, lista_controlado)
select v.gen, v.com, (select id from laboratorios where nombre = v.lab), v.conc, v.forma::forma_farm, v.via, v.cat, v.minimo::int, v.ctrl::boolean, v.lista::text
from (values
  ('Amoxicilina',  'Amoxidal',   'Roemmers', '500 mg',      'capsula',    'oral', 'Antibióticos',   50, false, null),
  ('Amoxicilina',  'Amoxidal',   'Roemmers', '250 mg/5 ml', 'suspension', 'oral', 'Antibióticos',   10, false, null),
  ('Paracetamol',  'Tafirol',    'Bagó',     '500 mg',      'comprimido', 'oral', 'Analgésicos',    100, false, null),
  ('Ibuprofeno',   'Ibupirac',   'Elea',     '400 mg',      'comprimido', 'oral', 'Antiinflamatorios', 60, false, null),
  ('Diclofenac',   'Cataflam',   'Gador',    '75 mg/3 ml',  'ampolla',    'IM',   'Antiinflamatorios', 20, false, null),
  ('Ceftriaxona',  'Rocephin',   'Richmond', '1 g',         'frasco_ampolla', 'IM/EV', 'Antibióticos', 15, false, null),
  ('Omeprazol',    'Ulcozol',    'Baliarda', '20 mg',       'capsula',    'oral', 'Gastroenterología', 40, false, null),
  ('Diazepam',     'Valium',     'Roemmers', '10 mg',       'comprimido', 'oral', 'Psicofármacos',  20, true,  'IV'),
  ('Morfina',      null,         'Gador',    '10 mg/ml',    'ampolla',    'IM/EV','Analgésicos',    10, true,  'II'),
  ('Salbutamol',   'Ventolin',   'Elea',     '100 mcg',     'inhalador',  'inhalatoria', 'Respiratorio', 10, false, null)
) as v(gen, com, lab, conc, forma, via, cat, minimo, ctrl, lista);

-- Lotes: algunos con stock, uno bajo el mínimo, uno en cero y uno próximo a vencer.
insert into lotes (medicamento_id, nro_lote, vencimiento, cantidad)
select m.id, v.lote::text, current_date + v.dias::int, v.cant::int
from (values
  ('Amoxicilina',  '500 mg',      'A-2401', 400, 300),
  ('Amoxicilina',  '250 mg/5 ml', 'A-2402', 200, 4),
  ('Paracetamol',  '500 mg',      'P-1188', 500, 800),
  ('Ibuprofeno',   '400 mg',      'I-0932', 25,  120),
  ('Diclofenac',   '75 mg/3 ml',  'D-7710', 300, 0),
  ('Ceftriaxona',  '1 g',         'C-5521', 60,  40),
  ('Omeprazol',    '20 mg',       'O-3310', 500, 200),
  ('Diazepam',     '10 mg',       'V-0021', 700, 60),
  ('Morfina',      '10 mg/ml',    'M-0007', 45,  8),
  ('Salbutamol',   '100 mcg',     'S-9981', 90,  35)
) as v(gen, conc, lote, dias, cant)
join medicamentos m on m.nombre_generico = v.gen and m.concentracion = v.conc;
