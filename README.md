# Vademécum Farmacia — Hospital de Choele Choel

Aplicación web de consulta de medicamentos con control de stock para el sector **Farmacia** del Hospital de Choele Choel (Río Negro, Argentina).

- **Cualquier persona del hospital** puede buscar un medicamento, filtrarlo y ver si hay stock, sin iniciar sesión.
- **El personal de farmacia** ingresa con usuario y contraseña para gestionar el catálogo, los lotes y los movimientos de stock.

La interfaz está en español rioplatense y es responsive (mobile-first).

## Qué ofrece

**Vista pública (`/`)**
- Buscador tolerante a errores de tipeo (por ejemplo, "amoxicilna" encuentra amoxicilina).
- Filtros por laboratorio, forma, dosis, categoría y disponibilidad.
- Semáforo de stock: **Disponible**, **Stock bajo** o **Sin stock**. No se muestran cantidades exactas.
- Etiqueta visible "Controlado · Lista X" para psicotrópicos y estupefacientes.

**Panel de farmacia (`/panel`)**
- Alta, edición y archivado de medicamentos y laboratorios (baja lógica, no se borra nada).
- Lotes con vencimientos y movimientos de stock (ingreso, egreso, ajuste, vencido). El stock no se edita a mano: todo cambio queda registrado.
- Importación desde CSV/Excel con previsualización y validación por fila.
- Exportación del inventario a Excel.

**Administración (solo rol `admin`)**
- Gestión de usuarios y roles.
- Auditoría de las acciones realizadas.

## Roles

| Rol | Puede |
|---|---|
| Público (sin login) | Buscar y ver el estado de stock |
| `farmacia` | Gestionar medicamentos, laboratorios, lotes y movimientos; importar y exportar |
| `admin` | Todo lo anterior, más usuarios, roles, auditoría y eliminar laboratorios |

El rol se guarda en la tabla `perfiles` y se valida siempre en el servidor y con RLS en la base de datos.

## Tecnología

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth y RLS)
- Zod para la validación
- SheetJS para Excel/CSV
- Deploy previsto en Vercel

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env.example` a `.env.local` y completar las variables:

   | Variable | Uso |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor; se usa para crear usuarios. **Nunca exponerla al cliente.** |

3. Aplicar las migraciones de `supabase/migrations/` en orden en el proyecto de Supabase.

4. Crear el primer usuario administrador desde Supabase (Auth) y agregar su fila en `perfiles` con rol `admin`. No hay registro público.

5. Iniciar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abrir [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Servidor de producción |
| `npm run lint` | Linter |

## Estructura

```
app/            Rutas (público, login, panel, API)
components/     Componentes de UI
lib/            Clientes de Supabase, auth, validaciones (Zod), Excel
supabase/       Migraciones SQL (esquema, lógica, RLS)
types/          Tipos compartidos
```

## Avisos operativos

- El plan gratuito de Supabase pausa el proyecto tras unos 7 días sin actividad. El endpoint `/api/health` sirve para un ping programado.
- Vercel Hobby es solo para uso no comercial.
- Idealmente, las cuentas (Supabase, Vercel, dominio) van a nombre de un correo institucional del hospital.
