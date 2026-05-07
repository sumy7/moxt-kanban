# Kanban System Execution Plan

## 1. Project Overview

Build a **local-first Kanban system** using:

- **Frontend**: Svelte / SvelteKit
- **Language**: TypeScript
- **Database**: IndexedDB
- **Recommended IndexedDB wrapper**: Dexie

The application should support core Kanban workflows and persist all data locally in the browser. In addition to the classic board view, the system must also provide a **Table View** for task management.

This document is intended to be **directly executable by an implementation agent**.

---

## 2. Primary Goals

Implement a Kanban application with the following capabilities:

1. Board management
2. Column management
3. Card/task management
4. Drag-and-drop between columns
5. Persistent local storage with IndexedDB
6. Search and filtering
7. **Table View** for cards/tasks
8. Responsive and maintainable UI architecture

---

## 3. Scope

## 3.1 In Scope for MVP

The MVP must include:

- Single-user local-first usage
- IndexedDB persistence
- Board view
- Table view
- Create/edit/delete boards
- Create/edit/delete columns
- Create/edit/delete cards
- Card ordering inside columns
- Move cards across columns
- Search cards
- Basic filtering
- Card detail editing
- Default seeded data on first launch

## 3.2 Out of Scope for MVP

The following are not required for the initial MVP, but should be designed so they can be added later:

- Authentication
- Multi-device sync
- Realtime collaboration
- Backend APIs
- Comments
- Attachments
- Notifications
- PWA
- Role/permission systems

---

## 4. Product Requirements

## 4.1 Core Views

### 4.1.1 Board View
A classic Kanban board layout with:

- Horizontal list of columns
- Vertical list of cards in each column
- Support for drag-and-drop card movement
- Add/edit/delete columns
- Add/edit/delete cards

### 4.1.2 Table View
A tabular task management view for the same underlying card data.

The table view must:

- Display cards in rows
- Display key fields in columns
- Support sorting and filtering
- Allow inline or modal editing
- Reflect the same underlying IndexedDB data as the board view
- Allow quick navigation to the related board/column context

Recommended columns for the table view:

- Title
- Board
- Column / Status
- Priority
- Tags
- Due Date
- Updated At
- Created At

Optional for MVP:
- Description preview

---

## 5. Functional Requirements

## 5.1 Board Management

The system must support:

- Create board
- Rename board
- Delete board
- Switch between boards

When a board is deleted:
- Its columns must be deleted
- Its cards must also be deleted

## 5.2 Column Management

The system must support:

- Create column
- Rename column
- Delete column
- Reorder columns

When a column is deleted:
- The implementation must define one of these behaviors:
  - Option A: delete all cards in that column
  - Option B: require moving cards before deletion

For MVP, use:
- **Option A: delete all cards in the column after user confirmation**

## 5.3 Card Management

The system must support:

- Create card
- Edit card
- Delete card
- Move card within a column
- Move card to another column
- Persist all card changes

Card fields for MVP:

- `id`
- `boardId`
- `columnId`
- `title`
- `description`
- `order`
- `priority`
- `tags`
- `dueDate`
- `createdAt`
- `updatedAt`

## 5.4 Search and Filtering

The system must support:

- Search by card title
- Search by description text
- Filter by priority
- Filter by tags
- Filter by due date presence or range
- Filter by column/status
- Filters must work in both board and table views where applicable

## 5.5 Sorting

Sorting requirements:

### Board View
- Sort is primarily based on `order` within a column

### Table View
Allow sorting by:
- Title
- Priority
- Due Date
- Updated At
- Created At
- Column / Status

---

## 6. Non-Functional Requirements

## 6.1 Architecture
The implementation should separate:

- UI components
- State management
- Database access
- Business logic/services
- Type definitions
- Utility functions

## 6.2 Performance
The app should remain responsive with:

- At least 10 boards
- At least 20 columns per board
- At least 500 cards overall

## 6.3 Maintainability
Code should be:

- Type-safe
- Modular
- Easy to extend
- Easy to test

## 6.4 UX
The UI should include:

- Empty states
- Loading states where appropriate
- Error handling for DB operations
- Delete confirmations
- Clear feedback after save/update/delete actions

---

## 7. Technical Stack

## 7.1 Required Stack

- SvelteKit
- TypeScript
- IndexedDB
- Dexie

## 7.2 Optional Supporting Libraries

The agent may choose appropriate libraries for:

- Drag-and-drop
- Form handling
- Date formatting
- Styling

Suggested options:

- Tailwind CSS or plain CSS/SCSS
- `svelte-dnd-action` for drag-and-drop
- `date-fns` for date utilities

---

## 8. Data Model

## 8.1 Board

```ts
type Board = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};
```

## 8.2 Column

```ts
type Column = {
  id: string;
  boardId: string;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};
```

## 8.3 Card

```ts
type CardPriority = 'low' | 'medium' | 'high' | 'urgent';

type Card = {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  order: number;
  priority: CardPriority;
  tags: string[];
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};
```

---

## 9. IndexedDB Schema Design

Use Dexie to create the following tables:

- `boards`
- `columns`
- `cards`

Recommended schema:

```ts
boards: 'id, name, createdAt, updatedAt'
columns: 'id, boardId, [boardId+order], createdAt, updatedAt'
cards: 'id, boardId, columnId, [columnId+order], dueDate, priority, createdAt, updatedAt'
```

### Notes

- `boardId` enables board-level filtering
- `columnId` enables column-level retrieval
- `[columnId+order]` supports ordered rendering per column
- Due date and priority indexes help filtering and sorting use cases

---

## 10. Suggested Project Structure

```text
src/
  lib/
    components/
      board/
        BoardView.svelte
        ColumnView.svelte
        CardItem.svelte
      table/
        TableView.svelte
        TableRow.svelte
        TableToolbar.svelte
      shared/
        Modal.svelte
        ConfirmDialog.svelte
        SearchBar.svelte
        FilterBar.svelte
        EmptyState.svelte
    db/
      database.ts
      schema.ts
      seed.ts
    services/
      boardService.ts
      columnService.ts
      cardService.ts
      viewService.ts
      filterService.ts
    stores/
      boards.ts
      columns.ts
      cards.ts
      filters.ts
      ui.ts
    types/
      board.ts
      column.ts
      card.ts
      filters.ts
    utils/
      id.ts
      date.ts
      sort.ts
      constants.ts
  routes/
    +page.svelte
    boards/
      [boardId]/
        +page.svelte
```

---

## 11. State Management Requirements

Use Svelte stores to manage state.

Suggested stores:

- `boardsStore`
- `columnsStore`
- `cardsStore`
- `filtersStore`
- `uiStore`

Responsibilities:

### boardsStore
- Active board
- Board list
- Board CRUD state updates

### columnsStore
- Columns for active board
- Column ordering updates

### cardsStore
- Cards for active board
- Card CRUD
- Card move/reorder logic

### filtersStore
- Search text
- Selected tags
- Selected priority
- Due date filters
- Selected column/status
- Current sort field and direction
- Current view mode: `board` or `table`

### uiStore
- Modal open/close state
- Selected card
- Confirmation dialogs
- Toast/notification state

---

## 12. Business Logic Requirements

## 12.1 Initial Seed
On first application launch:

- Check whether there is existing board data
- If no data exists, create a default board
- Seed default columns:
  - Todo
  - In Progress
  - Done

## 12.2 Ordering Strategy
Use a numeric `order` field.

For MVP:
- Recompute order values after move operations
- Use simple sequential integers: `1, 2, 3, ...`

## 12.3 Moving Cards
When moving a card:

- Update `columnId`
- Update `order`
- Update `updatedAt`

If moving across columns:
- Recompute order in source column
- Recompute order in target column

## 12.4 Deletion Rules

### Deleting a Board
Must cascade delete:
- all columns in that board
- all cards in that board

### Deleting a Column
Must cascade delete:
- all cards in that column

Must require explicit user confirmation.

---

## 13. UI Requirements

## 13.1 Global Layout

Recommended layout:

- Header:
  - app name
  - board switcher
  - view switcher (Board / Table)
  - search
  - filters
  - add actions

- Main content:
  - Board View or Table View depending on selected mode

## 13.2 Board View UI
Must include:

- Column cards/panels
- Card items
- Add column button
- Add card button inside each column
- Drag-and-drop interactions
- Edit/delete actions for columns and cards

## 13.3 Table View UI
Must include:

- A table/grid layout
- Sortable column headers
- Filter toolbar
- Row click or action menu to edit a card
- Ability to identify the card's board and status/column
- Empty state when no matching records are found

---

## 14. Execution Plan

## Milestone 1: Project Setup
Tasks:

1. Initialize SvelteKit project with TypeScript
2. Add Dexie
3. Add styling solution
4. Create base directory structure
5. Define shared types

Deliverable:
- Project compiles successfully
- Basic app shell renders

Acceptance Criteria:
- App runs locally
- TypeScript configured correctly
- Lint/build passes if configured

---

## Milestone 2: Database Layer
Tasks:

1. Implement Dexie database setup
2. Define tables and indexes
3. Implement seed logic
4. Implement CRUD helpers for boards, columns, cards
5. Add error handling around DB operations

Deliverable:
- Reusable DB access layer

Acceptance Criteria:
- Data persists after reload
- Seed data is created only on first launch
- CRUD operations work correctly

---

## Milestone 3: Core Services and Stores
Tasks:

1. Implement board service
2. Implement column service
3. Implement card service
4. Implement filter/sort service
5. Implement Svelte stores
6. Connect stores to DB layer

Deliverable:
- State and business logic layer

Acceptance Criteria:
- UI can consume store-driven state
- Service functions encapsulate all mutations
- No direct DB mutations inside UI components

---

## Milestone 4: Board View
Tasks:

1. Implement board page shell
2. Render columns for active board
3. Render cards inside columns
4. Add create/edit/delete board flow
5. Add create/edit/delete column flow
6. Add create/edit/delete card flow

Deliverable:
- Fully usable basic board view

Acceptance Criteria:
- User can manage boards, columns, and cards
- Refresh preserves state
- Empty states are shown when appropriate

---

## Milestone 5: Drag-and-Drop
Tasks:

1. Add column-level card drag-and-drop
2. Add cross-column card movement
3. Recompute order after drag operations
4. Persist new order to IndexedDB

Deliverable:
- Interactive Kanban drag-and-drop board

Acceptance Criteria:
- Cards can be reordered within the same column
- Cards can be moved across columns
- Order remains correct after refresh

---

## Milestone 6: Table View
Tasks:

1. Implement view mode switcher
2. Implement table view layout
3. Render all cards for active board in table format
4. Show status/column, priority, tags, due date, timestamps
5. Add sorting support
6. Add row-level edit action
7. Keep board view and table view fully synchronized through shared stores/data

Deliverable:
- Functional table view based on same underlying card data

Acceptance Criteria:
- Switching between board and table views works
- Table rows reflect current board data
- Edits in one view are immediately reflected in the other
- Sorting works correctly

---

## Milestone 7: Search and Filters
Tasks:

1. Add text search
2. Add priority filter
3. Add tags filter
4. Add due date filter
5. Add column/status filter
6. Make filters work across both views where relevant

Deliverable:
- Shared search/filter experience

Acceptance Criteria:
- Search results update correctly
- Filters can be combined
- Empty state shown for no matches
- Filter behavior is consistent between views

---

## Milestone 8: UX Refinement
Tasks:

1. Add confirmation dialogs
2. Add toast or inline feedback
3. Improve empty states
4. Improve form validation
5. Improve responsive layout
6. Polish loading/error states

Deliverable:
- Production-quality MVP UX

Acceptance Criteria:
- Major destructive actions require confirmation
- Invalid inputs are handled gracefully
- Layout is usable on common desktop widths

---

## 15. Agent Implementation Rules

The implementation agent should follow these rules:

1. Use **TypeScript everywhere**
2. Use **Dexie** for IndexedDB access
3. Keep all data mutations inside services
4. Keep components focused on presentation and interaction
5. Use Svelte stores for shared state
6. Avoid tight coupling between views and DB logic
7. Reuse the same underlying card model for both board and table views
8. Keep the codebase ready for future features like checklist items, export/import, and sync
9. Prefer small, composable components
10. Add lightweight validation for required fields

---

## 16. Recommended Card Editing UX

For MVP, use a modal form for card editing.

Fields to edit:
- Title
- Description
- Priority
- Tags
- Due Date
- Column/Status

Optional enhancement:
- Inline editing in table view for simple fields such as title or priority

---

## 17. Validation Rules

Minimum validation:

### Board
- Name is required
- Name must be trimmed

### Column
- Title is required
- Title must be trimmed

### Card
- Title is required
- Title must be trimmed
- Due date may be null
- Tags default to empty array
- Priority defaults to `medium`

---

## 18. Acceptance Criteria Summary

The project is considered complete for MVP when all of the following are true:

1. A user can create, edit, and delete boards
2. A user can create, edit, delete, and reorder columns
3. A user can create, edit, delete, move, and reorder cards
4. Data persists in IndexedDB after refresh
5. The app seeds default board data on first launch
6. The user can switch between Board View and Table View
7. The table view displays the same underlying task data as the board view
8. Search and filters work correctly
9. Sort works in table view
10. Basic confirmation and error handling exist
11. Code is modular and TypeScript-based

---

## 19. Future Enhancements

These are not required for MVP, but the codebase should make them possible:

- Checklist items
- Labels with colors
- Activity history
- Import/export JSON
- Theme switching
- Dark mode
- PWA support
- Deadline reminders
- Cloud sync
- Multi-board analytics

---

## 20. Suggested Build Order

The agent should implement in this exact order:

1. Project setup
2. Types
3. Dexie schema
4. Seed logic
5. CRUD services
6. Stores
7. Board view
8. Card modal/editor
9. Drag-and-drop
10. Table view
11. Search/filter/sort
12. UX polish
13. Final validation and cleanup

---

## 21. Final Instruction for the Agent

Build a **working MVP** of the Kanban system described above using **SvelteKit + TypeScript + Dexie + IndexedDB**.

Priority order:
1. Correctness
2. Persistence
3. Shared data model between Board View and Table View
4. Simple and maintainable architecture
5. Good UX for core workflows

Do not over-engineer beyond the MVP requirements, but keep the implementation clean and extensible.
