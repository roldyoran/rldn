# DESIGN.md

## UI Component Library: Starwind UI

**Starwind UI** — shadcn/ui for Astro. Components are `.astro` files + vanilla JS, not React.

### Installation

```bash
npx starwind@latest add <component>
```

### Installed Components

| Component      | Location                                | Purpose                   |
| -------------- | --------------------------------------- | ------------------------- |
| `button`       | `src/components/starwind/button/`       | Actions, form submissions |
| `card`         | `src/components/starwind/card/`         | Content containers        |
| `alert-dialog` | `src/components/starwind/alert-dialog/` | Confirmation modals       |
| `input`        | `src/components/starwind/input/`        | Text inputs               |
| `badge`        | `src/components/starwind/badge/`        | Status indicators         |
| `skeleton`     | `src/components/starwind/skeleton/`     | Loading placeholders      |
| `separator`    | `src/components/starwind/separator/`    | Visual dividers           |
| `dropdown`     | `src/components/starwind/dropdown/`     | Menus, actions            |
| `avatar`       | `src/components/starwind/avatar/`       | User avatars              |

### Import Pattern

```astro
---
import { Button } from "@/components/starwind/button/Button.astro";
import { Card } from "@/components/starwind/card/Card.astro";
---

<Button variant="primary" size="md">Click me</Button>
<Card class="p-4">Content</Card>
```

### Adding New Components

```bash
npx starwind@latest add textarea tabs scroll-area select popover tooltip
```

Components are installed to `src/components/starwind/`. Edit them directly — you own the code.

### Rules

- **Do not edit** `src/components/starwind/` unless customizing a specific component
- Use Starwind for Astro pages (dashboard, login)
- For React islands (canvas, kanban drag-and-drop), use Starwind as UI shell + React for interactivity

---

## Theme

### CSS Architecture

- `src/styles/starwind.css` — Starwind base + custom theme variables
- `src/styles/global.css` — Excalidraw-specific overrides only

### Color Palette

Neutral palette. No blue/bright accent colors in canvas UI.

| Token           | Light                       | Dark                        |
| --------------- | --------------------------- | --------------------------- |
| `--background`  | `oklch(1 0 0)`              | `oklch(0.145 0 0)`          |
| `--foreground`  | `oklch(0.145 0 0)`          | `oklch(0.985 0 0)`          |
| `--primary`     | `oklch(0.205 0 0)`          | `oklch(0.922 0 0)`          |
| `--muted`       | `oklch(0.97 0 0)`           | `oklch(0.269 0 0)`          |
| `--border`      | `oklch(0.922 0 0)`          | `oklch(1 0 0 / 10%)`        |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |

### Typography

- **Sans**: Space Grotesk
- **Mono**: Geist Mono

### Dark Mode

Toggle via `class="dark"` on `<html>`. Starwind CSS variables auto-switch.

---

## Excalidraw Theme Overrides

### Why `theme="light"`

Dark mode applies `filter: invert() + hue-rotate()` which desaturates images. Light theme preserves original colors. All dark styling is done via CSS variable overrides in `global.css`.

### Override Variables

All Excalidraw variables are overridden in `src/styles/global.css` under `.excalidraw-wrapper .excalidraw`. Key categories:

- **Core backgrounds**: `--default-bg-color: #1b1b1a`
- **Borders**: `--default-border-color: #2a2926`
- **Text**: `--color-on-surface: #eae8e4`
- **Buttons**: `--button-gray-1: #2a2926`
- **Surfaces**: `--color-surface-high: #2a2926`
- **Gray scale**: `--color-gray-10` through `--color-gray-100`

### Palette Reference

```
#141414 → #1b1b1a → #232322 → #2a2926 → #373634 → #4a4846 → #5a5856 → #928f89 → #eae8e4
```

### Grid Color Patch

Excalidraw v0.18.1 hardcodes grid colors as `Bold:"#dddddd"` and `Regular:"#e5e5e5"`. The patch in `ExcalidrawEditor.tsx` intercepts `CanvasRenderingContext2D.strokeStyle` and replaces these with subtle transparent values. Verify hex values when updating Excalidraw.

---

## Adding a New Feature

### 1. Create Feature Directory

```bash
mkdir -p src/features/kanban/components
```

### 2. Add Starwind Components

```bash
npx starwind@latest add textarea tabs scroll-area
```

### 3. Create Page Route

```astro
---
// src/pages/kanban/[id].astro
import Layout from "@/layouts/Layout.astro";
---

<Layout title="Kanban">
	<!-- Feature content -->
</Layout>
```

### 4. Create API Routes

```typescript
// src/pages/api/kanban/[id].ts
import type { APIRoute } from "astro";
import { authenticateRequest } from "@/shared/lib/api-auth";
import { getDbInstance } from "@/shared/lib/db";
```

### 5. Use Existing Schema

The `kanban_data` table already exists in the database. Link to a `documents` row via `documentId`.

### 6. Create Barrel File

```typescript
// src/features/kanban/index.ts
export { default as KanbanBoard } from "./components/KanbanBoard";
```
