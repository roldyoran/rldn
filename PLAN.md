# Canvas App - Plan de Implementación

## Descripción del Proyecto

Aplicación web profesional con lienzo infinito (infinite canvas) para gestionar imágenes, hacer anotaciones, dibujar y crear diagramas. Incluye autenticación, múltiples lienzos, y preparación para extensión de navegador.

## Estado: FASE 1-10 COMPLETADAS

## Tecnologías

| Categoría | Tecnología | Versión |
|---|---|---|
| Runtime/PM | Bun | 1.3.14 |
| Monorepo | Turborepo | 2.10.6 |
| Framework | TanStack Start | Latest |
| Canvas | tldraw | 5.2.5 (hobby license) |
| ORM | Drizzle | 0.45 |
| DB | SQLite (local) | better-sqlite3 |
| Auth | Better Auth | 1.5 |
| UI | shadcn/ui | 4.x |
| Lint | Biome | 2.4.5 |
| Language | TypeScript | 6.x |

## Licencia de tldraw

Se utiliza la **hobby license** (gratuita para proyectos no comerciales). Requiere mostrar "made with tldraw" watermark en el canvas. Solicitar en: https://tldraw.dev/get-a-license/hobby

## Estructura del Monorepo

```
rldn/
├── apps/
│   └── web/                          # TanStack Start (frontend + API)
│       ├── src/
│       │   ├── routes/
│       │   │   ├── __root.tsx         # Root layout
│       │   │   ├── index.tsx          # Landing page
│       │   │   ├── login.tsx          # Login/Register page
│       │   │   ├── dashboard.tsx      # Canvas list (CRUD)
│       │   │   ├── canvas.$id.tsx     # Canvas editor (tldraw)
│       │   │   └── api/
│       │   │       └── auth/$.ts      # Better Auth handler
│       │   │   api.canvases.ts        # Canvas list API
│       │   │   api.canvases.$id.ts    # Canvas CRUD API
│       │   │   api.images.ts          # Images API
│       │   │   api.images.$id.ts      # Image delete API
│       │   ├── components/
│       │   │   ├── Header.tsx
│       │   │   └── ui/                # shadcn/ui (re-exports from @repo/ui)
│       │   ├── lib/
│       │   │   ├── auth.ts            # Re-export from @repo/auth
│       │   │   ├── auth-client.ts     # Re-export from @repo/auth/client
│       │   │   ├── utils.ts           # Re-export from @repo/ui
│       │   │   └── utils-db.ts        # ID generation helpers
│       │   └── integrations/
│       │       └── tanstack-query/
│       └── package.json
├── packages/
│   ├── db/                            # @repo/db - Drizzle schema + migrations
│   │   ├── src/
│   │   │   ├── index.ts               # DB client (getDb, createDb)
│   │   │   ├── schema.ts              # Tables: canvases, canvas_documents, images
│   │   │   └── migrations/            # Generated SQL migrations
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   ├── auth/                          # @repo/auth - Better Auth
│   │   ├── src/
│   │   │   ├── index.ts               # Server-side auth config
│   │   │   └── client.ts              # Client-side auth helpers
│   │   └── package.json
│   └── ui/                            # @repo/ui - shadcn/ui components
│       ├── src/
│       │   ├── index.ts               # Exports all components
│       │   ├── components/            # badge, button, card, checkbox, hover-card, separator
│       │   └── lib/utils.ts           # cn() utility
│       └── package.json
├── package.json                       # Root (workspaces + scripts)
├── turbo.json                         # Turborepo task config
├── biome.json                         # Linting/formatting
├── tsconfig.base.json                 # Shared TS config
├── .env.local                         # Environment variables
└── PLAN.md                            # This file
```

## Schema de Base de Datos

```sql
-- Paquetes: canvases, canvas_documents, images

canvases {
  id          TEXT PRIMARY KEY (nanoid)
  name        TEXT NOT NULL
  description TEXT
  user_id     TEXT NOT NULL
  thumbnail   TEXT (URL de preview)
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
}

canvas_documents {
  id          TEXT PRIMARY KEY (nanoid)
  canvas_id   TEXT UNIQUE NOT NULL (FK → canvases.id ON DELETE CASCADE)
  store_data  TEXT NOT NULL (JSON del tldraw store)
  version     INTEGER DEFAULT 1
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
}

images {
  id          TEXT PRIMARY KEY (nanoid)
  canvas_id   TEXT NOT NULL (FK → canvases.id ON DELETE CASCADE)
  url         TEXT NOT NULL (URL externa)
  name        TEXT
  width       INTEGER
  height      INTEGER
  position_x  REAL DEFAULT 0
  position_y  REAL DEFAULT 0
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
}
```

## API Design

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/api/auth/sign-in` | Iniciar sesión | No |
| POST | `/api/auth/sign-up` | Registrar usuario | No |
| GET | `/api/auth/session` | Obtener sesión actual | Sí |
| GET | `/api/canvases?userId=X` | Listar lienzos del usuario | Sí |
| POST | `/api/canvases` | Crear nuevo lienzo | Sí |
| GET | `/api/canvases/:id` | Obtener lienzo + store | Sí |
| PUT | `/api/canvases/:id` | Actualizar lienzo/store | Sí |
| DELETE | `/api/canvases/:id` | Eliminar lienzo | Sí |
| POST | `/api/images` | Agregar imagen (URL) | Sí |
| DELETE | `/api/images/:id` | Eliminar imagen | Sí |

## Páginas

1. **`/`** — Landing page con features + botón de login
2. **`/login`** — Formulario de login/registro
3. **`/dashboard`** — Grid de lienzos del usuario (crear, eliminar, editar)
4. **`/canvas/:id`** — Editor tldraw completo con toolbar, panel de imágenes, persistencia automática

## Scripts Disponibles

```bash
# Development
bun run dev          # Start dev server (port 3000)

# Build
bun run build        # Build all packages

# Lint & Format
bun run lint         # Lint all packages
bun run format       # Format all files

# Type checking
bun run typecheck    # Type check all packages

# Database
cd packages/db
bun run db:generate  # Generate migration SQL
bun run db:push      # Push schema to DB
bun run db:studio    # Open Drizzle Studio
```

## Fases de Implementación

| Fase | Tarea | Estado |
|---|---|---|
| **1** | Migrar a monorepo (Turborepo + Bun workspaces) | ✅ |
| **2** | Crear packages/db con schema de Drizzle | ✅ |
| **3** | Crear packages/auth con Better Auth | ✅ |
| **4** | Crear packages/ui con shadcn/ui | ✅ |
| **5** | Migrar apps/web al monorepo | ✅ |
| **6** | Crear API routes (canvas CRUD, images) | ✅ |
| **7** | Crear páginas (login, dashboard) | ✅ |
| **8** | Integrar tldraw en canvas page | ✅ |
| **9** | Conectar tldraw store con backend | ✅ |
| **10** | Testing y polish | ✅ |

## Próximos Pasos (Futuro)

- [ ] Solicitar tldraw hobby license
- [ ] Subida de archivos locales (upload)
- [ ] Extensión de navegador (API REST documentada, CORS, tokens)
- [ ] Migrar a Turso DB
- [ ] Drag & drop de imágenes directamente en el canvas
- [ ] Exportar canvas como imagen
- [ ] Colaboración en tiempo real
