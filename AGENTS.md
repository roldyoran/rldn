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

### Excalidraw Canvas

- Canvas editor at `/canvas/[id]` uses `@excalidraw/excalidraw` v0.18+ (React component)
- `ExcalidrawEditor` component (`apps/web/src/components/ExcalidrawEditor.tsx`) handles data loading internally via fetch, passes data as `initialData` on first render
- **IMPORTANT**: Excalidraw's `initialData` prop is mount-only. Do NOT try to pass data via React re-renders — it will be ignored. Use the component's internal fetch pattern instead.
- `gridModeEnabled` prop enables Excalidraw's built-in dot grid (v0.18 renders dots by default)
- Canvas data saved as JSON string to `canvas_documents.store_data` via `serializeAsJSON(elements, appState, files, "local")`
- The `"local"` serialization format embeds image data as base64 data URLs (self-contained but large)
- Auto-saves 1.2s after changes via `PUT /api/canvases/:id`
- Also saves on tab switch (visibilitychange) and page unload (beforeunload) with 64KB keepalive limit
- Neutral color palette only — no blue/bright accent colors in canvas UI
- Canvas name editable from topbar input, auto-saved with changes
- Page script (`[id].astro` inline script) polls `window.__excalidrawAPI.get()` for the imperative API
- Page script communicates with React via `window.__onExcalidrawChange` callback and `window.__serializeExcalidraw` function
- Excalidraw's built-in UI is hidden via CSS — custom toolbar/topbar in the Astro page
- **Theme**: Excalidraw uses `theme="light"` — NOT dark mode. Dark mode desaturates images and makes them look washed out. Keep light theme for correct image rendering.
- **Default element colors**: Use `currentItemStrokeColor` and `currentItemBackgroundColor` (NOT `currentStrokeColor`/`currentBackgroundColor`) in appState to set default colors for new elements. White (`#ffffff`) is the default stroke color for the dark canvas background.
- **Grid color**: Excalidraw v0.18.1 has NO `gridColor` API — colors are hardcoded as `Bold:"#dddddd"` and `Regular:"#e5e5e5"` in the bundle. Grid color is customized via monkey-patch of `CanvasRenderingContext2D.strokeStyle` in `ExcalidrawEditor.tsx`. The patch intercepts the hardcoded grey hex values and replaces them with red (`#ff0000` for Bold, `#ff3333` for Regular). Runs once on module load. **If Excalidraw is updated, verify the hardcoded hex values still match** — check `dist/prod/chunk-*.js` for the `Ti={Bold:...,Regular:...}` pattern.

### Formatter

- Biome: tabs for indentation, double quotes for strings
- Run `bun run format` before committing
