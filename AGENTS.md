# AGENTS.md

**Kanban system**: A local-first Kanban application built with SvelteKit, TypeScript, IndexedDB (Dexie), and Tailwind CSS. The application must support Board View and Table View for task management, with full drag-and-drop support, persistence, and filtering/search capabilities.

## Project Overview

**Tech Stack**: SvelteKit, TypeScript, Dexie (IndexedDB), shadcn-svelte, Tailwind CSS, Rsbuild

**Execution Plan**: See [kanban-system-execution-plan.md](./kanban-system-execution-plan.md) for complete product requirements, data models, acceptance criteria, and 8-milestone development roadmap.

**MVP Goals**: Single-user local-first Kanban with Board/Table views, drag-and-drop, IndexedDB persistence, search/filter, and basic confirmation dialogs.

## Architecture

### Directory Structure

```
src/
  lib/
    components/     # UI components (board, table, shared)
    db/             # Database setup (handled via Dexie)
    services/       # Business logic (board, column, card services)
    stores/         # Svelte stores (state management)
    types/          # TypeScript type definitions
    utils/          # Helper functions
  routes/           # SvelteKit pages
```

### Core Principles

1. **Separation of Concerns**: Keep components focused on presentation; delegate business logic to services; manage state with Svelte stores
2. **Type Safety**: Use TypeScript everywhere; define types in `src/lib/types/`
3. **No Direct DB Mutations**: All data mutations go through services; components consume stores only
4. **Reuse Data Model**: Board View and Table View share the same underlying card data via stores
5. **IndexedDB Persistence**: Use Dexie for all DB operations; seed default data on first launch

### Data Model

- **Board**: id, name, createdAt, updatedAt
- **Column**: id, boardId, title, order, createdAt, updatedAt
- **Card**: id, boardId, columnId, title, description, order, priority, tags, dueDate, createdAt, updatedAt

See execution plan section 8 for full type definitions.

### Key Services

- `boardService`: Board CRUD and management
- `columnService`: Column CRUD and ordering
- `cardService`: Card CRUD, drag/drop, reordering
- `filterService`: Search, filter, and sort logic

### Key Stores

- `boardsStore`: Active board, board list
- `columnsStore`: Columns for active board
- `cardsStore`: Cards for active board, drag operations
- `filtersStore`: Search, filters, sorting, view mode
- `uiStore`: Modal state, selected card, confirmations

## Commands

- `pnpm run dev` - Start dev server (auto-opens browser)
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run lint` - Run ESLint
- `pnpm run format` - Format code with Prettier
- `pnpm run svelte-check` - Type-check Svelte components

## Validation Rules

**Board**: Name required and trimmed
**Column**: Title required and trimmed
**Card**: Title required and trimmed; priority defaults to 'medium'; tags default to empty array

## Important Notes

- **Cascading Deletes**: Deleting a board deletes all columns/cards; deleting a column deletes all cards
- **Card Ordering**: Use numeric order field; recompute after moves
- **Drag-and-Drop**: Update columnId and order; persist to IndexedDB immediately
- **Seed Data**: Auto-create default board (Todo, In Progress, Done columns) on first launch
- **Component Library**: Use shadcn-svelte for UI components; this is already integrated

## External Resources

- [Rsbuild docs](https://rsbuild.rs/llms.txt)
- [Rspack docs](https://rspack.rs/llms.txt)
- [Dexie documentation](https://dexie.org/)
- [Execution Plan](./kanban-system-execution-plan.md) - Full requirements and acceptance criteria
