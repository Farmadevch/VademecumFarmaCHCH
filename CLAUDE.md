# Vademécum Farmacia — Hospital de Choele Choel

App web tipo vademécum con control de stock para el sector **Farmacia** del Hospital de Choele Choel (Río Negro, Argentina).

- **Cualquier personal del hospital** puede buscar un medicamento, filtrarlo y ver si hay stock.
- **El personal de farmacia**, con login y roles, gestiona el catálogo, los lotes y los movimientos de stock.

La interfaz va **en español rioplatense** (vos, "buscá", "ingresá") y **siempre responsive / mobile-first**.

---

## 1. Stack (decidido)

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Server Components para la búsqueda; Server Actions para el ABM |
| Estilos | **Tailwind CSS** | Tokens del punto 7 en `tailwind.config` |
| Backend / DB | **Supabase** (Postgres + Auth + RLS) | Región **São Paulo (sa-east-1)** |
| Auth | Supabase Auth (email + contraseña) | Usuarios creados por el admin; sin registro público |
| Validación | **Zod** | Mismo esquema en el cliente y en las Server Actions |
| Deploy | **Vercel** | Subdominio del hospital, por ejemplo `farmacia.<dominio>` |
| Cliente Supabase | `@supabase/ssr` | Clientes separados: server, browser y middleware |

### Avisos operativos (no olvidar)
- **Supabase Free pausa el proyecto tras unos 7 días sin actividad.** Usar el plan Pro o, como mínimo, un ping programado (cron de Vercel a un endpoint `/api/health` que haga un `select 1`).
- **Vercel Hobby es solo para uso no comercial.** Si el proyecto es remunerado, usar el plan Pro o desplegar en una cuenta del hospital.
- Las cuentas (Supabase, Vercel, dominio) idealmente van a nombre de un **mail institucional** del hospital.
- Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` al cliente. Solo se usa en el servidor, para crear usuarios desde el panel de admin.

---

## 2. Decisiones de producto

- **No se oculta ningún medicamento.** Psicotrópicos y estupefacientes aparecen en la búsqueda libre como cualquier otro, con una **etiqueta visible** "Controlado · Lista X".
- **Vista pública con semáforo, sin cantidades exactas:**
  - 🟢 **Disponible**: stock > mínimo
  - 🟡 **Stock bajo**: 0 < stock ≤ mínimo
  - 🔴 **Sin stock**: stock = 0
- Las cantidades exactas, los lotes y los vencimientos solo los ve farmacia.
- **El stock no se edita a mano.** Todo cambio es un **movimiento** (ingreso, egreso, ajuste o vencido) que queda auditado.
- **Baja lógica:** "Archivar" pone `activo = false`; no se borra nada físicamente.
- **Decisión pendiente:** definir si la vista pública es abierta (anon) o pide login con correo institucional (magic link). Por ahora se implementa como **anon con lectura**, y debe poder cambiarse fácil.

---

## 3. Roles y permisos

| Rol | Puede |
|---|---|
| `anon` / personal del hospital | Buscar y filtrar; ver nombre, presentación, laboratorio, estado (semáforo) y la marca de controlado |
| `farmacia` | Todo lo anterior, más el CRUD de medicamentos y laboratorios, registrar movimientos, gestionar lotes, importar CSV/Excel y exportar reportes |
| `admin` | Todo lo anterior, más la gestión de usuarios y roles y la vista de auditoría |

- El rol vive en la tabla `perfiles`, **nunca** en el cliente ni en `user_metadata`.
- Helper SQL: `public.rol_actual()` devuelve el rol del `auth.uid()`.

---

## 4. Modelo de datos (Postgres / Supabase)

```sql
create extension if not exists pg_trgm;
create extension if not exists unaccent;

create type rol_usuario     as enum ('farmacia','admin');
create type tipo_movimiento as enum ('ingreso','egreso','ajuste','vencido');
create type forma_farm      as enum ('comprimido','capsula','suspension','jarabe','ampolla','frasco_ampolla','crema','gotas','supositorio','inhalador','otro');

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
  nombre_generico text not null,          -- principio activo
  nombre_comercial text,
  laboratorio_id bigint references laboratorios,
  concentracion text not null,            -- "500 mg", "250 mg/5 ml"
  forma forma_farm not null,
  via text not null,                      -- oral, IM, EV, IM/EV, tópica…
  categoria text,                         -- categoría terapéutica
  codigo_barras text unique,
  stock_minimo int not null default 0,
  controlado boolean not null default false,
  lista_controlado text,                  -- I, II, III, IV…
  activo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
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
  motivo text,
  usuario_id uuid not null references auth.users default auth.uid(),
  created_at timestamptz default now()
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
```

### Lógica en la base
- **Trigger en `movimientos`**: actualiza `lotes.cantidad` (ingreso suma; egreso y vencido restan; ajuste usa signo vía `motivo` o una columna `delta`, a definir). Rechaza si queda negativo.
- **Triggers de auditoría** en `medicamentos`, `lotes` y `perfiles`.
- **Vista `v_stock`**: `medicamento_id`, `stock_total` (suma de lotes no vencidos), `proximo_vencimiento`.
- **Vista `medicamentos_publicos`**: expone solo genérico, comercial, laboratorio, concentración, forma, vía, categoría, controlado, lista, `estado` (`disponible` / `bajo` / `sin_stock`) y `updated_at`. **Sin cantidades ni lotes.**
- **Búsqueda**: índice GIN trigram sobre `unaccent(nombre_generico || ' ' || nombre_comercial || ' ' || laboratorio)`, y una función RPC `buscar_medicamentos(q, filtros…)` que ordena por `similarity`. Debe tolerar errores de tipeo (por ejemplo, "amoxicilna" encuentra amoxicilina).

### RLS (resumen)
- RLS **activado en todas las tablas**.
- `anon` y `authenticated`: `select` **solo** sobre `medicamentos_publicos` (vista con `security_invoker = false` o función `security definer`). Sin acceso directo a las tablas.
- `rol_actual() in ('farmacia','admin')`: `select`, `insert` y `update` en `medicamentos`, `laboratorios`, `lotes` y `movimientos`. Sin `delete` (baja lógica).
- `rol_actual() = 'admin'`: gestión de `perfiles` y `select` en `auditoria`.
- `movimientos`: solo `insert` y `select`; nunca `update` ni `delete` (es un libro contable).

---

## 5. Pantallas y rutas

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/` | Buscador público: header, buscador grande, filtros (laboratorio, forma, dosis, categoría, disponibilidad), grilla de tarjetas con semáforo y marca de controlado | Público |
| `/login` | Ingreso de farmacia (correo institucional + contraseña, "¿La olvidaste?") | Público |
| `/panel` | Inicio: indicadores (ítems activos, stock bajo, sin stock, lotes que vencen en ≤ 30 días) | farmacia/admin |
| `/panel/medicamentos` | Tabla de inventario con búsqueda, acciones Editar / Movimiento / Archivar, exportar Excel/PDF y panel lateral de próximos vencimientos | farmacia/admin |
| `/panel/medicamentos/nuevo` y `/[id]` | Alta y edición: identificación, presentación, stock mínimo, controlado + lista, primer lote | farmacia/admin |
| `/panel/movimientos` | Historial y formulario de movimiento | farmacia/admin |
| `/panel/lotes` | Lotes y vencimientos (alertas a 30, 60 y 90 días) | farmacia/admin |
| `/panel/importar` | Importación CSV/Excel con previsualización y validación por fila | farmacia/admin |
| `/panel/reportes` | Faltantes, vencimientos y consumo; exportación | farmacia/admin |
| `/panel/usuarios` | Usuarios y roles | admin |
| `/panel/auditoria` | Log de acciones | admin |

- El `middleware.ts` protege `/panel/*` y redirige a `/login`.
- El chequeo de rol se hace **en el servidor** (layout de `/panel` y Server Actions), no solo en la UI.
- En móvil, el buscador público usa una barra inferior (Buscar, Escanear, Farmacia) y filtros en chips deslizables.

---

## 6. Fases

**Fase 1 — MVP**
- [x] Proyecto Next.js + Tailwind + Supabase SSR
- [x] Migraciones SQL: tablas, enums, triggers, vistas, RLS y seed de ejemplo
- [x] Buscador público con filtros y semáforo
- [x] Login y protección de `/panel`
- [x] CRUD de medicamentos y laboratorios + archivar
- [x] Movimientos y lotes (trigger de stock)
- [ ] Deploy en Vercel con subdominio

**Fase 2**
- [x] Importación CSV/Excel (SheetJS)
- [ ] Indicadores y alertas de vencimiento
- [ ] Exportar Excel/PDF (Excel hecho: inventario y plantilla; falta PDF y reportes)
- [x] Usuarios y roles (admin) + auditoría
- [ ] PWA instalable
- [ ] Escaneo de código de barras con la cámara
- [x] Ping anti-pausa de Supabase (si se queda en el plan Free)

---

## 7. Diseño

**Referencia visual:** lienzo de diseño en Claude con 5 pantallas (Público escritorio, Público móvil, Login, Panel, Alta de medicamento):
https://claude.ai/artifact/1P5yQaNzdiaXzjGuzoJE3h

**Dirección:** "clínico institucional" en la vista pública y "panel operativo" (denso, tabla) en farmacia.

### Tokens
| Token | Valor | Uso |
|---|---|---|
| `primary` | `#0B4F8A` | Header público, botones principales |
| `primary-dark` | `#083B68` | Hover |
| `sidebar` | `#0E2238` | Menú lateral del panel |
| `ink` | `#10233A` | Texto principal |
| `muted` | `#4A5B6E` | Texto secundario |
| `line` | `#DCE3EA` | Bordes |
| `input-border` | `#C6D1DC` | Bordes de inputs |
| `ground` | `#F5F8FB` | Fondo público |
| `ground-panel` | `#F2F5F8` | Fondo del panel |
| `chip` | `#EEF3F8` | Etiquetas de presentación |
| Disponible | bg `#E2F2EE` / texto `#0B5E52` / punto `#0F7B6C` | Semáforo |
| Stock bajo | bg `#FCEFD9` / texto `#7F3F00` / punto `#C26A00` | Semáforo |
| Sin stock | bg `#FBE3E8` / texto `#8E1230` / anillo `#9F1239` | Semáforo |
| Controlado | bg `#EDE7F6` / texto `#4B2A86` | Etiqueta |

- **Tipografía:** Public Sans (400/500/600/700) para todo; IBM Plex Mono (500) para dosis, cantidades y lotes.
- **Bordes redondeados:** 8 px en inputs y botones, 10–12 px en tarjetas, 999 px en badges.
- **Accesibilidad:** áreas táctiles ≥ 44 px, `<label>` en todos los inputs, contraste ≥ 4.5:1. El semáforo **siempre lleva texto**, además del color, y los estados se distinguen por forma (punto lleno vs. anillo).
- **Íconos:** SVG de trazo (por ejemplo, `lucide-react`). Sin emojis en la UI.

---

## 8. Convenciones de código

- TypeScript estricto; nada de `any` sin justificar.
- Estructura: `app/`, `components/`, `lib/supabase/{server,client,middleware}.ts`, `lib/validations/`, `supabase/migrations/`.
- Tipos de la DB generados con `supabase gen types typescript` en `types/database.ts`.
- Las mutaciones van por **Server Actions** con validación Zod y chequeo de rol.
- Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` (solo servidor). Documentarlas en `.env.example`.
- Commits chicos y descriptivos, en español.
