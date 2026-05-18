# AGENTS.md

**Kanban system**: A local-first Kanban application built with React 19, Rsbuild, TypeScript, IndexedDB (Dexie), Zustand-style custom stores, and Tailwind CSS v4. The application supports Board View and Table View for task management, with full drag-and-drop support, persistence, filtering/search, and optional external data sync via the Moxt bridge API.

## Project Overview

**Tech Stack**: React 19, TypeScript, Dexie (IndexedDB), shadcn/ui (Radix UI), Tailwind CSS v4, @dnd-kit, @tanstack/react-table, Rsbuild

**MVP Goals**: Single-user local-first Kanban with Board/Table views, drag-and-drop, IndexedDB persistence, search/filter, confirmation dialogs, and optional Moxt backend sync.

## Architecture

### Directory Structure

```
src/
  components/
    ui/               # shadcn/ui primitives (Button, Input, Select, Dialog, etc.)
  lib/
    components/
      board/           # BoardView (drag-and-drop kanban columns)
      shared/          # BoardToolbar, ConfirmDialog, DatePicker, EmptyState, Modal
      table/           # TableView, TableToolbar (@tanstack/react-table)
    db/                # Database adapter layer (Dexie / Moxt dual backend)
    hooks/             # React hooks (useBoardActions, useCardActions, useColumnActions, useConfirm, useDataLoader, useFilters, useNotifications)
    services/          # Business logic (boardService, columnService, cardService, filterService, syncService)
    stores/            # Custom reactive stores with useStore hook (boards, cards, columns, filters, ui, store)
    types/             # TypeScript type definitions (board, card, column, filters, moxt)
    utils/             # Helper functions (date, id, sort)
    utils.ts           # cn() utility for Tailwind class merging
  App.tsx              # Application root component
  app.css              # Application styles
  index.ts             # Entry point (renders App into DOM)
  index.css            # Global CSS (Tailwind imports)
```

### Core Principles

1. **Separation of Concerns**: Components handle presentation; business logic lives in services; state is managed by custom stores consumed via the `useStore` hook
2. **Type Safety**: TypeScript everywhere; types defined in `src/lib/types/`
3. **No Direct DB Mutations**: All data mutations go through services; components consume stores only
4. **Reuse Data Model**: Board View and Table View share the same underlying card data via stores
5. **Dual Backend**: A `DbAdapter` abstraction supports both IndexedDB (Dexie) and Moxt API backends transparently; active backend is resolved at startup
6. **Soft Deletes**: All entities use a `deletedAt` field; services filter out soft-deleted records

### State Management

The project uses a **custom store system** (`src/lib/stores/store.ts`) — a lightweight pub/sub store with a `useStore` React hook for reactive subscriptions:

- `createValueStore<T>(initial)` — creates a store with `get()`, `set()`, `update()`
- `useStore(store)` — React hook that subscribes to a store and returns its current value
- `get(store)` — reads a store's value outside React components (used in services)

### Data Model

- **Board**: `id`, `name`, `createdAt`, `updatedAt`, `deletedAt`
- **Column**: `id`, `boardId`, `title`, `order`, `createdAt`, `updatedAt`, `deletedAt`
- **Card**: `id`, `boardId`, `columnId`, `title`, `description`, `order`, `priority` (low/medium/high/urgent), `tags` (string[]), `dueDate`, `createdAt`, `updatedAt`, `deletedAt`

### Database Layer

`src/lib/db/database.ts` implements a **dual-adapter pattern**:

- `DexieAdapter` — wraps a Dexie (IndexedDB) database with versioned schema migrations (v1→v3)
- `MoxtAdapter` — wraps the `window.moxt` collection API for remote persistence
- `TableFacade` — proxies all table operations through the currently active adapter
- Backend is auto-selected at startup: if `window.moxt` exists, uses Moxt; otherwise falls back to IndexedDB

### Key Services

- `boardService`: Board CRUD and management; soft-delete with cascade
- `columnService`: Column CRUD and ordering; soft-delete with cascade
- `cardService`: Card CRUD, drag/drop reordering, cross-column moves
- `filterService`: Search text, priority/tag/column/due-date filtering, multi-field sorting
- `syncService`: Incremental and full sync with Moxt backend; listens to `data:change` events and `visibilitychange`; coalesces concurrent syncs

### Key Hooks

- `useBoardActions`: Board CRUD modal state and actions
- `useColumnActions`: Column CRUD modal state and actions
- `useCardActions`: Card editor modal state, create/edit/delete/drop actions
- `useDataLoader`: Loads board data (columns + cards) into stores
- `useFilters`: Filter/sort state mutations (toggle view, update filters, reset)
- `useConfirm`: Confirmation dialog state machine
- `useNotifications`: Toast notifications and error-safe wrappers

### Key Stores

- `boardsStore`: List of all boards
- `activeBoardIdStore`: Currently selected board ID
- `columnsStore`: Columns for active board
- `cardsStore`: Cards for active board
- `filtersStore`: Search, filters, sorting, view mode
- `toastStore`: Toast notification state

## Commands

- `pnpm run dev` — Start dev server (auto-opens browser)
- `pnpm run build` — Build for production
- `pnpm run preview` — Preview production build
- `pnpm run lint` — Run ESLint
- `pnpm run format` — Format code with Prettier
- `pnpm run typecheck` — TypeScript type checking

## Validation Rules

**Board**: Name required and trimmed
**Column**: Title required and trimmed
**Card**: Title required and trimmed; priority defaults to `'medium'`; tags default to empty array

## Important Notes

- **Soft Deletes**: All entities support soft-delete via `deletedAt` field; services filter out soft-deleted records from query results
- **Cascading Deletes**: Deleting a board soft-deletes all its columns and cards; deleting a column soft-deletes all its cards
- **Card Ordering**: Uses numeric `order` field; recomputed after moves
- **Drag-and-Drop**: Powered by `@dnd-kit`; updates `columnId` and `order`; persists to backend immediately
- **Seed Data**: Auto-creates a default board with Todo, In Progress, Done columns on first launch
- **Component Library**: Uses shadcn/ui (Radix UI primitives) for UI components
- **Incremental Sync**: `syncService` supports incremental sync using `[boardId+updatedAt]` compound indexes; falls back to full sync after 5 minutes of inactivity
- **Concurrency**: Sync operations are coalesced — concurrent triggers share one in-flight sync promise

## External Resources

- [Rsbuild docs](https://rsbuild.rs/llms.txt)
- [Rspack docs](https://rspack.rs/llms.txt)
- [Dexie documentation](https://dexie.org/)
- [shadcn/ui documentation](https://ui.shadcn.com/)
- [@dnd-kit documentation](https://dndkit.com/)
- [@tanstack/react-table documentation](https://tanstack.com/table)
