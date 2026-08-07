# rldn

Multi-feature workspace application. Infinite canvas, kanban boards, todo lists, and notes — all in one place.

## Tech Stack

- **Framework**: [Astro 6](https://astro.build/) (SSR, Bun adapter)
- **UI**: [Starwind UI](https://starwind.dev/) (shadcn for Astro) + [React 19](https://react.dev/) islands
- **Canvas**: [Excalidraw](https://excalidraw.com/) v0.18+
- **Database**: [Turso](https://turso.tech/) (libSQL) + [Drizzle ORM](https://orm.drizzle.team/)
- **Auth**: [Better Auth](https://www.better-auth.com/) (email + password)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Monorepo**: [Turborepo](https://turbo.build/) + [Bun](https://bun.sh/) workspaces

## Getting Started

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
cp apps/web/.env.example apps/web/.env

# Set up database
bash scripts/db-setup.sh

# Start dev server
bun run dev:web
```

The app will be available at `http://localhost:4321`.

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev:web` | Start Astro dev server |
| `bun run build` | Build for production |
| `bun run typecheck` | Typecheck all packages |
| `bun run lint` | Lint with ESLint |
| `bun run format` | Format with Prettier |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Apply migrations to Turso |
| `bun run db:push` | Push schema to Turso |
| `bash scripts/db-setup.sh` | Full DB setup |

## Project Structure

```
rldn/
├── apps/
│   └── web/                    # Astro application
│       └── src/
│           ├── pages/          # File-based routing
│           ├── layouts/        # HTML shell
│           ├── features/       # Feature modules
│           │   ├── canvas/     # Excalidraw canvas (React)
│           │   └── dashboard/  # Dashboard (Astro + Starwind)
│           ├── shared/         # Cross-feature utilities
│           │   └── lib/        # auth, db, api-auth
│           ├── styles/         # CSS (starwind + excalidraw)
│           └── components/     # Auto-generated Starwind UI
├── packages/
│   ├── db/                     # Drizzle ORM + schema
│   └── auth/                   # Better Auth
├── scripts/                    # DB setup scripts
└── extension/                  # Browser extension
```

## Architecture

**Feature-based architecture** with strict dependency direction:

```
pages/ → features/ → shared/
```

- **Pages**: Thin controllers — route definition + layout composition
- **Features**: Self-contained modules (canvas, dashboard, kanban, etc.)
- **Shared**: Business-agnostic utilities (auth, DB, types)

Features never import from other features. Shared never imports from features.

See [AGENTS.md](./AGENTS.md) for detailed architecture documentation.

## Design System

See [DESIGN.md](./DESIGN.md) for:

- Starwind UI component library
- Theme configuration
- Color palette
- Excalidraw theme overrides
- Guide for adding new features

## Environment Variables

Two `.env` files must be kept in sync:

| Variable | Root `.env` | `apps/web/.env` |
|----------|-------------|-----------------|
| `TURSO_DB_URL` | `libsql://...` | `TURSO_DB_URL=libsql://...` |
| `TURSO_SECRET` | `...` | `TURSO_SECRET=...` |
| `BETTER_AUTH_SECRET` | `...` | `BETTER_AUTH_SECRET=...` |
| `BETTER_AUTH_URL` | — | `http://localhost:4321` |

## Database

Turso (libSQL) with Drizzle ORM. Schema includes:

- `documents` — Universal base entity (canvas, kanban, todo, note)
- `canvases`, `canvas_documents`, `images` — Canvas feature
- `kanban_data`, `todo_data`, `note_data` — Future features
- Auth tables (`user`, `session`, `account`, `verification`, `apikey`)

## License

Private — All rights reserved.
