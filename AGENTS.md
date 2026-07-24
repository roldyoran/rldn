# AGENTS.md

## Project Overview

Canvas App - infinite canvas for images/diagrams with auth. Monorepo managed by Turborepo + Bun workspaces.

## Commands

```bash
bun run dev:web          # Start Astro dev server (http://localhost:4321)
bun run typecheck        # Typecheck all packages
bun run typecheck:web    # Typecheck web only
bun run lint             # Biome lint all
bun run format           # Biome format all
bun run db:push          # Push Drizzle schema to SQLite
bun run db:generate      # Generate Drizzle migrations
bun run db:studio        # Open Drizzle Studio
```

## Architecture

```
apps/web/        → Astro 6 (SSR, Bun adapter, TailwindCSS 4)
packages/db/     → Drizzle ORM + better-sqlite3 (SQLite)
packages/auth/   → Better Auth (drizzle-adapter)
packages/ui/     → shadcn/ui components
```

## Key Gotchas

### Env vars

- **Two `.env` files**: root `.env` and `apps/web/.env` — keep both in sync
- `apps/web/.env` has `BETTER_AUTH_URL=http://localhost:4321` (dev port)
- Root `.env` has Turso config for future migration
- `packages/db/src/index.ts` uses `process.env.DATABASE_URL` — NOT `import.meta.env`
- `apps/web/src/lib/db.ts` uses `import.meta.env.DATABASE_URL` (Vite-injected)
- `@repo/auth` exports `createAuth(db)` — lazy init, accepts db instance. Do NOT call at import time.

### Database

- DB file: `/home/rol2/Desktop/rldn/dev.db`
- Schema: `canvases`, `canvas_documents`, `images` + auth tables (`user`, `session`, `account`, `verification`)
- Auth tables use `timestamp_ms` mode; app tables use `timestamp` mode (unixepoch)
- `nanoid` used for generating canvas/document IDs

### Auth

- Better Auth with email+password only (no OAuth)
- All auth routes consolidated in `/api/auth/[...all].ts` catch-all
- Session check: fetch `/api/auth/get-session` with `credentials: "include"` → returns user or null
- Canvas API requires auth — returns 401 if no session
- Always use `credentials: "include"` on client-side fetch calls for cookie-based sessions

### Fabric.js Canvas

- Canvas editor at `/canvas/[id]` uses fabric.js 5.3.0 loaded via CDN (`<script is:inline>`)
- Canvas data saved as JSON to `canvas_documents.store_data`
- Auto-saves 1.2s after changes via `PUT /api/canvases/:id`
- Also saves on tab switch (visibilitychange) and page unload (beforeunload)
- Neutral color palette only — no blue/bright accent colors in canvas UI
- Canvas name editable from topbar input, auto-saved with changes

### Formatter

- Biome: tabs for indentation, double quotes for strings
- Run `bun run format` before committing
