<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import BoardView from './lib/components/board/BoardView.svelte';
  import ConfirmDialog from './lib/components/shared/ConfirmDialog.svelte';
  import DatePicker from './lib/components/shared/DatePicker.svelte';
  import EmptyState from './lib/components/shared/EmptyState.svelte';
  import Modal from './lib/components/shared/Modal.svelte';
  import TableToolbar from './lib/components/table/TableToolbar.svelte';
  import TableView from './lib/components/table/TableView.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';
  import { db } from './lib/db/database';
  import { seedIfNeeded } from './lib/db/seed';
  import { boardService } from './lib/services/boardService';
  import {
    cardService,
    normalizeCardUpdate,
    type CardInput,
    type CardUpdate,
  } from './lib/services/cardService';
  import { columnService } from './lib/services/columnService';
  import { filterAndSortCards } from './lib/services/filterService';
  import { activeBoardIdStore, boardsStore } from './lib/stores/boards';
  import { cardsStore } from './lib/stores/cards';
  import { columnsStore } from './lib/stores/columns';
  import { defaultFilters, filtersStore } from './lib/stores/filters';
  import { toastStore } from './lib/stores/ui';
  import { nowIso } from './lib/utils/date';
  import { initSync, destroySync } from './lib/services/syncService';
  import type { Board, Card, CardFilters, CardPriority, Column, SortField } from './lib/types';

  type ConfirmState = {
    open: boolean;
    title: string;
    message: string;
    action: (() => Promise<void>) | null;
  };

  type CardEditorState = {
    open: boolean;
    editingCardId: string | null;
    boardId: string;
    columnId: string;
    title: string;
    description: string;
    priority: CardPriority;
    tagsText: string;
    dueDate: string;
  };

  let loading = $state(true);
  let errorMessage = $state('');

  let boardModalOpen = $state(false);
  let editingBoardId = $state<string | null>(null);
  let boardNameInput = $state('');

  let columnModalOpen = $state(false);
  let editingColumnId = $state<string | null>(null);
  let columnTitleInput = $state('');
  let filterModalOpen = $state(false);

  let cardEditor = $state<CardEditorState>({
    open: false,
    editingCardId: null,
    boardId: '',
    columnId: '',
    title: '',
    description: '',
    priority: 'medium',
    tagsText: '',
    dueDate: '',
  });

  let confirmState = $state<ConfirmState>({
    open: false,
    title: '',
    message: '',
    action: null,
  });

  const activeBoard = $derived(
    $boardsStore.find((board) => board.id === $activeBoardIdStore) ?? null,
  );

  const availableTags = $derived(
    [...new Set($cardsStore.flatMap((card) => card.tags.map((tag) => tag.trim()).filter(Boolean)))].sort(),
  );

  const visibleCards = $derived(filterAndSortCards($cardsStore, $columnsStore, $filtersStore));

  const activeBoardLabel = $derived(activeBoard?.name ?? 'Select Board');
  const backendProviderLabel = $derived(db.provider === 'moxt' ? 'moxt' : 'indexeddb');

  const cardPriorityLabel = $derived(cardEditor.priority);

  const cardColumnLabel = $derived.by(() => {
    return $columnsStore.find((column) => column.id === cardEditor.columnId)?.title ?? 'Select Column';
  });

  const cardsByColumn = $derived.by(() => {
    const grouped: Record<string, Card[]> = {};

    for (const column of $columnsStore) {
      grouped[column.id] = [];
    }

    for (const card of visibleCards) {
      if (!grouped[card.columnId]) {
        grouped[card.columnId] = [];
      }
      grouped[card.columnId].push(card);
    }

    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.order - b.order);
    }

    return grouped;
  });

  onMount(async () => {
    try {
      await seedIfNeeded();
      await reloadBoards(true);
      initSync();
    } catch (error) {
      errorMessage = parseError(error);
    } finally {
      loading = false;
    }
  });

  onDestroy(() => {
    destroySync();
  });

  async function reloadBoards(selectFirst = false): Promise<void> {
    const boards = await boardService.list();
    boardsStore.set(boards);

    if (boards.length === 0) {
      activeBoardIdStore.set(null);
      columnsStore.set([]);
      cardsStore.set([]);
      return;
    }

    const activeId = $activeBoardIdStore;
    const boardId =
      selectFirst || !activeId || !boards.some((board) => board.id === activeId)
        ? boards[0].id
        : activeId;

    activeBoardIdStore.set(boardId);
    await loadBoardData(boardId);
  }

  async function loadBoardData(boardId: string): Promise<void> {
    const [columns, cards] = await Promise.all([
      columnService.listByBoard(boardId),
      cardService.listByBoard(boardId),
    ]);
    columnsStore.set(columns);
    cardsStore.set(cards);

    const validColumnIds = new Set(columns.map((column) => column.id));
    filtersStore.update((filters) => ({
      ...filters,
      columnIds: filters.columnIds.filter((columnId) => validColumnIds.has(columnId)),
    }));
  }

  function parseError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }

  function notifySuccess(message: string): void {
    toastStore.set({ type: 'success', message });
    setTimeout(() => toastStore.set(null), 2200);
  }

  function notifyError(message: string): void {
    toastStore.set({ type: 'error', message });
  }

  async function safely(task: () => Promise<void>): Promise<void> {
    try {
      errorMessage = '';
      await task();
    } catch (error) {
      notifyError(parseError(error));
    }
  }

  async function selectBoard(boardId: string): Promise<void> {
    await safely(async () => {
      activeBoardIdStore.set(boardId);
      await loadBoardData(boardId);
    });
  }

  function openBoardCreate(): void {
    editingBoardId = null;
    boardNameInput = '';
    boardModalOpen = true;
  }

  function openBoardEdit(board: Board): void {
    editingBoardId = board.id;
    boardNameInput = board.name;
    boardModalOpen = true;
  }

  async function submitBoard(): Promise<void> {
    await safely(async () => {
      if (editingBoardId) {
        await boardService.rename(editingBoardId, boardNameInput);
        notifySuccess('Board updated.');
      } else {
        const created = await boardService.create(boardNameInput);
        activeBoardIdStore.set(created.id);
        notifySuccess('Board created.');
      }

      boardModalOpen = false;
      await reloadBoards(false);
    });
  }

  function requestDeleteBoard(board: Board): void {
    confirmState = {
      open: true,
      title: 'Delete board',
      message: `Delete ${board.name}? All its columns and cards will also be deleted.`,
      action: async () => {
        await boardService.remove(board.id);
        await reloadBoards(true);
        notifySuccess('Board deleted.');
      },
    };
  }

  function openColumnCreate(): void {
    if (!$activeBoardIdStore) {
      return;
    }
    editingColumnId = null;
    columnTitleInput = '';
    columnModalOpen = true;
  }

  function openColumnEdit(column: Column): void {
    editingColumnId = column.id;
    columnTitleInput = column.title;
    columnModalOpen = true;
  }

  async function submitColumn(): Promise<void> {
    await safely(async () => {
      if (!$activeBoardIdStore) {
        return;
      }

      if (editingColumnId) {
        await columnService.rename(editingColumnId, columnTitleInput);
        notifySuccess('Column updated.');
      } else {
        await columnService.create($activeBoardIdStore, columnTitleInput);
        notifySuccess('Column created.');
      }

      columnModalOpen = false;
      await loadBoardData($activeBoardIdStore);
    });
  }

  function requestDeleteColumn(column: Column): void {
    confirmState = {
      open: true,
      title: 'Delete column',
      message: `Delete ${column.title}? All cards in this column will be removed.`,
      action: async () => {
        await columnService.remove(column.id);
        if ($activeBoardIdStore) {
          await loadBoardData($activeBoardIdStore);
        }
        notifySuccess('Column deleted.');
      },
    };
  }

  async function moveColumn(column: Column, direction: 'left' | 'right'): Promise<void> {
    await safely(async () => {
      if (!$activeBoardIdStore) {
        return;
      }

      const sorted = [...$columnsStore].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((item) => item.id === column.id);
      const nextIndex = direction === 'left' ? index - 1 : index + 1;
      if (index < 0 || nextIndex < 0 || nextIndex >= sorted.length) {
        return;
      }

      const [moved] = sorted.splice(index, 1);
      sorted.splice(nextIndex, 0, moved);
      await columnService.reorder(
        $activeBoardIdStore,
        sorted.map((item) => item.id),
      );
      await loadBoardData($activeBoardIdStore);
    });
  }

  function openCardCreate(columnId: string): void {
    if (!$activeBoardIdStore) {
      return;
    }

    cardEditor = {
      open: true,
      editingCardId: null,
      boardId: $activeBoardIdStore,
      columnId,
      title: '',
      description: '',
      priority: 'medium',
      tagsText: '',
      dueDate: '',
    };
  }

  function openCardEdit(card: Card): void {
    cardEditor = {
      open: true,
      editingCardId: card.id,
      boardId: card.boardId,
      columnId: card.columnId,
      title: card.title,
      description: card.description,
      priority: card.priority,
      tagsText: card.tags.join(', '),
      dueDate: card.dueDate ?? '',
    };
  }

  function buildOptimisticUpdatedCards(
    cards: Card[],
    cardId: string,
    update: CardUpdate,
  ): Card[] {
    const current = cards.find((card) => card.id === cardId);
    if (!current) {
      throw new Error(`Card not found: ${cardId}`);
    }

    const normalized = normalizeCardUpdate(update);
    const now = nowIso();
    const nextCard: Card = {
      ...current,
      title: normalized.title,
      description: normalized.description,
      priority: normalized.priority,
      tags: normalized.tags,
      dueDate: normalized.dueDate,
      updatedAt: now,
    };

    if (current.columnId === normalized.columnId) {
      return cards.map((card) => (card.id === cardId ? nextCard : card));
    }

    const remainingCards = cards.filter((card) => card.id !== cardId);
    const sourceCards = remainingCards
      .filter((card) => card.columnId === current.columnId && !card.deletedAt)
      .sort((a, b) => a.order - b.order);
    const sourceReordered = new Map(
      sourceCards.map((card, index) => [
        card.id,
        { ...card, order: index + 1, updatedAt: now },
      ]),
    );
    const targetMaxOrder = remainingCards
      .filter((card) => card.columnId === normalized.columnId && !card.deletedAt)
      .reduce((max, card) => Math.max(max, card.order), 0);

    return [
      ...remainingCards.map((card) => sourceReordered.get(card.id) ?? card),
      {
        ...nextCard,
        columnId: normalized.columnId,
        order: targetMaxOrder + 1,
      },
    ];
  }

  async function submitCard(): Promise<void> {
    await safely(async () => {
      const tags = cardEditor.tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      if (cardEditor.editingCardId) {
        const update: CardUpdate = {
          title: cardEditor.title,
          description: cardEditor.description,
          priority: cardEditor.priority,
          tags,
          dueDate: cardEditor.dueDate || null,
          columnId: cardEditor.columnId,
        };

        const snapshot = $cardsStore;
        cardsStore.set(buildOptimisticUpdatedCards(snapshot, cardEditor.editingCardId, update));
        cardEditor.open = false;
        notifySuccess('Card updated.');

        try {
          await cardService.update(cardEditor.editingCardId, update);
        } catch (error) {
          cardsStore.set(snapshot);
          cardEditor.open = true;
          throw error;
        }
      } else {
        const input: CardInput = {
          boardId: cardEditor.boardId,
          columnId: cardEditor.columnId,
          title: cardEditor.title,
          description: cardEditor.description,
          priority: cardEditor.priority,
          tags,
          dueDate: cardEditor.dueDate || null,
        };

        await cardService.create(input);
        notifySuccess('Card created.');
      }

      cardEditor.open = false;
      if ($activeBoardIdStore) {
        await loadBoardData($activeBoardIdStore);
      }
    });
  }

  function requestDeleteCard(card: Card): void {
    confirmState = {
      open: true,
      title: 'Delete card',
      message: `Delete card ${card.title}?`,
      action: async () => {
        await cardService.remove(card.id);
        if ($activeBoardIdStore) {
          await loadBoardData($activeBoardIdStore);
        }
        notifySuccess('Card deleted.');
      },
    };
  }

  async function dropCard(cardId: string, toColumnId: string, toIndex: number): Promise<void> {
    await safely(async () => {
      await cardService.move(cardId, toColumnId, toIndex);
      if ($activeBoardIdStore) {
        await loadBoardData($activeBoardIdStore);
      }
    });
  }

  function updateFilters(patch: Partial<CardFilters>): void {
    filtersStore.update((filters) => ({ ...filters, ...patch }));
  }

  function toggleViewMode(mode: CardFilters['viewMode']): void {
    filtersStore.update((filters) => ({ ...filters, viewMode: mode }));
  }

  function updateSort(field: SortField): void {
    filtersStore.update((filters) => {
      const nextDirection =
        filters.sortField === field ? (filters.sortDirection === 'asc' ? 'desc' : 'asc') : 'asc';

      return {
        ...filters,
        sortField: field,
        sortDirection: nextDirection,
      };
    });
  }

  function resetFilters(): void {
    filtersStore.set({ ...defaultFilters, viewMode: $filtersStore.viewMode });
  }

  async function confirmAction(): Promise<void> {
    if (!confirmState.action) {
      return;
    }

    await safely(async () => {
      await confirmState.action?.();
      confirmState.open = false;
      confirmState.action = null;
    });
  }
</script>

<main>
  <header class="toolbar">
    <div class="toolbar-title">
      <h1>Moxt Kanban</h1>
      <span class="backend-chip" aria-label="Current backend provider">
        Backend: {backendProviderLabel}
      </span>
    </div>

    <div class="toolbar-actions">
      <Select.Root
        type="single"
        value={$activeBoardIdStore ?? ''}
        onValueChange={(value) => value && selectBoard(value)}
      >
        <Select.Trigger class="w-[220px]" disabled={$boardsStore.length === 0}>{activeBoardLabel}</Select.Trigger>
        <Select.Content>
          {#each $boardsStore as board (board.id)}
            <Select.Item value={board.id}>{board.name}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>

      <Button type="button" onclick={openBoardCreate}>+ Board</Button>

      {#if activeBoard}
        <Button type="button" variant="outline" onclick={() => openBoardEdit(activeBoard)}>Rename</Button>
        <Button type="button" variant="destructive" onclick={() => requestDeleteBoard(activeBoard)}>Delete</Button>
      {/if}

      <Button
        type="button"
        variant={$filtersStore.viewMode === 'board' ? 'default' : 'outline'}
        onclick={() => toggleViewMode('board')}
      >
        Board View
      </Button>
      <Button
        type="button"
        variant={$filtersStore.viewMode === 'table' ? 'default' : 'outline'}
        onclick={() => toggleViewMode('table')}
      >
        Table View
      </Button>
      <Button type="button" variant="outline" onclick={() => (filterModalOpen = true)}>Filters</Button>
    </div>
  </header>

  <section class="content-region">
    {#if loading}
      <p class="status">Loading...</p>
    {:else if errorMessage}
      <p class="status error">{errorMessage}</p>
    {:else if !$activeBoardIdStore}
      <EmptyState
        title="No boards"
        description="Create your first board to start organizing work."
        actionText="Create Board"
        onAction={openBoardCreate}
      />
    {:else if $filtersStore.viewMode === 'board'}
      <BoardView
        columns={$columnsStore}
        {cardsByColumn}
        onAddColumn={openColumnCreate}
        onMoveColumnLeft={(column) => moveColumn(column, 'left')}
        onMoveColumnRight={(column) => moveColumn(column, 'right')}
        onEditColumn={openColumnEdit}
        onDeleteColumn={requestDeleteColumn}
        onAddCard={openCardCreate}
        onEditCard={openCardEdit}
        onDeleteCard={requestDeleteCard}
        onDropCard={dropCard}
      />
    {:else}
      <TableView
        cards={visibleCards}
        columns={$columnsStore}
        sortField={$filtersStore.sortField}
        sortDirection={$filtersStore.sortDirection}
        onSort={updateSort}
        onEditCard={openCardEdit}
        onDeleteCard={requestDeleteCard}
      />
    {/if}
  </section>

  <Modal
    open={filterModalOpen}
    title="Filters"
    onClose={() => (filterModalOpen = false)}
    width="lg"
  >
    <TableToolbar
      filters={$filtersStore}
      columns={$columnsStore}
      {availableTags}
      onFiltersChange={updateFilters}
      onReset={resetFilters}
    />
  </Modal>

  <Modal
    open={boardModalOpen}
    title={editingBoardId ? 'Rename Board' : 'Create Board'}
    onClose={() => (boardModalOpen = false)}
  >
    <form
      class="form"
      onsubmit={(event) => {
        event.preventDefault();
        void submitBoard();
      }}
    >
      <label>
        Name
        <Input bind:value={boardNameInput} required />
      </label>
      <div class="form-actions">
        <Button type="button" variant="outline" onclick={() => (boardModalOpen = false)}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  </Modal>

  <Modal
    open={columnModalOpen}
    title={editingColumnId ? 'Rename Column' : 'Create Column'}
    onClose={() => (columnModalOpen = false)}
    width="sm"
  >
    <form
      class="form"
      onsubmit={(event) => {
        event.preventDefault();
        void submitColumn();
      }}
    >
      <label>
        Title
        <Input bind:value={columnTitleInput} required />
      </label>
      <div class="form-actions">
        <Button type="button" variant="outline" onclick={() => (columnModalOpen = false)}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  </Modal>

  <Modal
    open={cardEditor.open}
    title={cardEditor.editingCardId ? 'Edit Card' : 'Create Card'}
    onClose={() => (cardEditor.open = false)}
    width="lg"
  >
    <form
      class="form"
      onsubmit={(event) => {
        event.preventDefault();
        void submitCard();
      }}
    >
      <label>
        Title
        <Input bind:value={cardEditor.title} required />
      </label>

      <label>
        Description
        <Textarea rows={4} bind:value={cardEditor.description}></Textarea>
      </label>

      <div class="grid-2">
        <label>
          Priority
          <Select.Root
            type="single"
            value={cardEditor.priority}
            onValueChange={(value) =>
              (cardEditor = {
                ...cardEditor,
                priority: value as CardPriority,
              })}
          >
            <Select.Trigger class="w-full">{cardPriorityLabel}</Select.Trigger>
            <Select.Content>
              <Select.Item value="low">low</Select.Item>
              <Select.Item value="medium">medium</Select.Item>
              <Select.Item value="high">high</Select.Item>
              <Select.Item value="urgent">urgent</Select.Item>
            </Select.Content>
          </Select.Root>
        </label>

        <label>
          Status / Column
          <Select.Root
            type="single"
            value={cardEditor.columnId}
            onValueChange={(value) =>
              (cardEditor = {
                ...cardEditor,
                columnId: value,
              })}
          >
            <Select.Trigger class="w-full">{cardColumnLabel}</Select.Trigger>
            <Select.Content>
              {#each $columnsStore as column (column.id)}
                <Select.Item value={column.id}>{column.title}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </label>
      </div>

      <div class="grid-2">
        <label>
          Tags (comma separated)
          <Input bind:value={cardEditor.tagsText} placeholder="frontend, bug" />
        </label>

        <label>
          Due Date
          <DatePicker
            value={cardEditor.dueDate || null}
            placeholder="Pick due date"
            onValueChange={(value) =>
              (cardEditor = {
                ...cardEditor,
                dueDate: value ?? '',
              })}
          />
        </label>
      </div>

      <div class="form-actions">
        <Button type="button" variant="outline" onclick={() => (cardEditor.open = false)}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  </Modal>

  <ConfirmDialog
    open={confirmState.open}
    title={confirmState.title}
    message={confirmState.message}
    confirmText="Delete"
    cancelText="Cancel"
    onCancel={() => {
      confirmState.open = false;
      confirmState.action = null;
    }}
    onConfirm={confirmAction}
  />

  {#if $toastStore}
    <div class={`toast ${$toastStore.type}`}>{$toastStore.message}</div>
  {/if}
</main>

<style>
  main {
    height: 100vh;
    height: 100dvh;
    width: 100vw;
    padding: 0.75rem;
    max-width: none;
    margin: 0;
    color: var(--foreground);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    overflow: hidden;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    border: 1px solid var(--border);
    padding: 0.5rem;
    background: var(--card);
  }

  h1 {
    margin: 0;
    font-size: 1rem;
    line-height: 1;
  }

  .toolbar-title {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    min-width: max-content;
  }

  .backend-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.13rem 0.42rem;
    border: 1px solid var(--border);
    background: var(--secondary);
    color: var(--secondary-foreground);
    font-size: 0.7rem;
    letter-spacing: 0.01em;
    text-transform: lowercase;
  }

  .toolbar-actions {
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .content-region {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
  }

  .content-region > :global(*) {
    min-width: 0;
    min-height: 0;
    width: 100%;
  }

  .status {
    width: 100%;
    align-self: flex-start;
    padding: 1rem;
    border: 1px solid var(--border);
    background: var(--card);
  }

  .status.error {
    border-color: var(--destructive);
    color: var(--destructive);
    background: hsl(0 100% 98%);
  }

  .form {
    display: grid;
    gap: 0.8rem;
  }

  label {
    display: grid;
    gap: 0.35rem;
    font-weight: 500;
    color: var(--muted-foreground);
  }

  .grid-2 {
    display: grid;
    gap: 0.8rem;
    grid-template-columns: 1fr;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.2rem;
  }

  .toast {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 1200;
    padding: 0.65rem 0.85rem;
    color: var(--primary-foreground);
    border: 1px solid var(--border);
    box-shadow: 0 12px 26px hsl(222 40% 8% / 0.16);
  }

  .toast.success {
    background: hsl(142 71% 45%);
  }

  .toast.error {
    background: var(--destructive);
  }

  @media (max-width: 1120px) {
    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .toolbar-actions {
      justify-content: flex-start;
    }
  }

  @media (min-width: 900px) {
    .grid-2 {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
