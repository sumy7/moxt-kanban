<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import BoardToolbar from './lib/components/shared/BoardToolbar.svelte';
  import BoardView from './lib/components/board/BoardView.svelte';
  import ConfirmDialog from './lib/components/shared/ConfirmDialog.svelte';
  import DatePicker from './lib/components/shared/DatePicker.svelte';
  import EmptyState from './lib/components/shared/EmptyState.svelte';
  import Modal from './lib/components/shared/Modal.svelte';
  import TableView from './lib/components/table/TableView.svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';
  import { db } from './lib/db/database';
  import { seedIfNeeded } from './lib/db/seed';
  import { filterAndSortCards } from './lib/services/filterService';
  import { initSync, destroySync } from './lib/services/syncService';
  import { activeBoardIdStore, boardsStore } from './lib/stores/boards';
  import { cardsStore } from './lib/stores/cards';
  import { columnsStore } from './lib/stores/columns';
  import { filtersStore } from './lib/stores/filters';
  import { toastStore } from './lib/stores/ui';
  import { createNotifications } from './lib/hooks/useNotifications.svelte';
  import { createConfirm } from './lib/hooks/useConfirm.svelte';
  import { createDataLoader } from './lib/hooks/useDataLoader.svelte';
  import { createBoardActions } from './lib/hooks/useBoardActions.svelte';
  import { createColumnActions } from './lib/hooks/useColumnActions.svelte';
  import { createCardActions } from './lib/hooks/useCardActions.svelte';
  import { createFilters } from './lib/hooks/useFilters.svelte';
  import type { Card, CardPriority } from './lib/types';

  // — hooks —
  const notify = createNotifications();
  const confirm = createConfirm(notify.safely);
  const loader = createDataLoader();
  const boards = createBoardActions({
    reloadBoards: loader.reloadBoards,
    notifySuccess: notify.notifySuccess,
    safely: notify.safely,
    requestConfirm: confirm.request,
  });
  const columns = createColumnActions({
    loadBoardData: loader.loadBoardData,
    notifySuccess: notify.notifySuccess,
    safely: notify.safely,
    requestConfirm: confirm.request,
  });
  const cards = createCardActions({
    loadBoardData: loader.loadBoardData,
    notifySuccess: notify.notifySuccess,
    safely: notify.safely,
    requestConfirm: confirm.request,
  });
  const filters = createFilters();

  // — app-level state —
  let loading = $state(true);
  let currentUser = $state<string | null>(null);

  const appVersion = __APP_VERSION__;

  const activeBoard = $derived(
    $boardsStore.find((board) => board.id === $activeBoardIdStore) ?? null,
  );

  const availableTags = $derived(
    [...new Set($cardsStore.flatMap((card) => card.tags.map((tag) => tag.trim()).filter(Boolean)))].sort(),
  );

  const visibleCards = $derived(filterAndSortCards($cardsStore, $columnsStore, $filtersStore));

  const activeBoardLabel = $derived(activeBoard?.name ?? 'Select Board');
  const backendProviderLabel = $derived(db.provider === 'moxt' ? 'moxt' : 'indexeddb');

  const cardPriorityLabel = $derived(cards.editor.priority);

  const cardColumnLabel = $derived.by(() => {
    return $columnsStore.find((col) => col.id === cards.editor.columnId)?.title ?? 'Select Column';
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
      await loader.reloadBoards(true);
      initSync();

      const m = (window as any).moxt?.currentMember;
      if (m) currentUser = m.displayName || m.email || null;
    } catch (error) {
      notify.notifyError(notify.parseError(error));
    } finally {
      loading = false;
    }
  });

  onDestroy(() => {
    destroySync();
  });

  async function selectBoard(boardId: string): Promise<void> {
    await notify.safely(async () => {
      activeBoardIdStore.set(boardId);
      await loader.loadBoardData(boardId);
    });
  }
</script>

<main>
  <header class="toolbar">
    <div class="toolbar-title">
      <h1>Moxt Kanban</h1>
      <span class="version-chip">{appVersion}</span>
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

      <Button type="button" onclick={boards.openCreate}>+ Board</Button>

      {#if activeBoard}
        <Button type="button" variant="outline" onclick={() => boards.openEdit(activeBoard)}>Edit Board</Button>
      {/if}

      {#if currentUser}
        <span class="user-chip" title="Logged in as {currentUser}">{currentUser}</span>
      {/if}
    </div>
  </header>

  {#if activeBoard}
    <BoardToolbar
      boardName={activeBoard.name}
      viewMode={$filtersStore.viewMode}
      filters={$filtersStore}
      columns={$columnsStore}
      {availableTags}
      onToggleView={filters.toggleView}
      onFiltersChange={filters.update}
      onResetFilters={filters.reset}
    />
  {/if}

  <section class="content-region">
    {#if loading}
      <p class="status">Loading...</p>
    {:else if !$activeBoardIdStore}
      <EmptyState
        title="No boards"
        description="Create your first board to start organizing work."
        actionText="Create Board"
        onAction={boards.openCreate}
      />
    {:else if $filtersStore.viewMode === 'board'}
      <BoardView
        columns={$columnsStore}
        {cardsByColumn}
        onAddColumn={columns.openCreate}
        onMoveColumnLeft={(column) => columns.move(column, 'left')}
        onMoveColumnRight={(column) => columns.move(column, 'right')}
        onEditColumn={columns.openEdit}
        onDeleteColumn={columns.requestDelete}
        onAddCard={cards.openCreate}
        onEditCard={cards.openEdit}
        onDeleteCard={cards.requestDelete}
        onDropCard={cards.drop}
      />
    {:else}
      <TableView
        cards={visibleCards}
        columns={$columnsStore}
        sortField={$filtersStore.sortField}
        sortDirection={$filtersStore.sortDirection}
        onSort={filters.updateSort}
        onEditCard={cards.openEdit}
        onDeleteCard={cards.requestDelete}
      />
    {/if}
  </section>

  <Modal
    open={boards.modalOpen}
    title={boards.editingId ? 'Edit Board' : 'Create Board'}
    onClose={boards.closeModal}
  >
    <form
      class="form"
      onsubmit={(event) => {
        event.preventDefault();
        void boards.submit();
      }}
    >
      <label>
        Name
        <Input bind:value={boards.nameInput} required />
      </label>
      <div class="form-actions">
        <Button type="button" variant="outline" onclick={boards.closeModal}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>

    {#if boards.editingId}
      {@const editingBoard = $boardsStore.find((b) => b.id === boards.editingId)}
      {#if editingBoard}
        <div class="danger-zone">
          <p class="danger-zone-label">Danger Zone</p>
          <Button
            type="button"
            variant="destructive"
            onclick={() => {
              boards.closeModal();
              boards.requestDelete(editingBoard);
            }}
          >
            Delete Board
          </Button>
        </div>
      {/if}
    {/if}
  </Modal>

  <Modal
    open={columns.modalOpen}
    title={columns.editingId ? 'Rename Column' : 'Create Column'}
    onClose={columns.closeModal}
    width="sm"
  >
    <form
      class="form"
      onsubmit={(event) => {
        event.preventDefault();
        void columns.submit();
      }}
    >
      <label>
        Title
        <Input bind:value={columns.titleInput} required />
      </label>
      <div class="form-actions">
        <Button type="button" variant="outline" onclick={columns.closeModal}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  </Modal>

  <Modal
    open={cards.editor.open}
    title={cards.editor.editingCardId ? 'Edit Card' : 'Create Card'}
    onClose={() => (cards.editor.open = false)}
    width="lg"
  >
    <form
      class="form"
      onsubmit={(event) => {
        event.preventDefault();
        void cards.submit();
      }}
    >
      <label>
        Title
        <Input bind:value={cards.editor.title} required />
      </label>

      <label>
        Description
        <Textarea rows={4} bind:value={cards.editor.description}></Textarea>
      </label>

      <div class="grid-2">
        <label>
          Priority
          <Select.Root
            type="single"
            value={cards.editor.priority}
            onValueChange={(value) =>
              (cards.editor = {
                ...cards.editor,
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
            value={cards.editor.columnId}
            onValueChange={(value) =>
              (cards.editor = {
                ...cards.editor,
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
          <Input bind:value={cards.editor.tagsText} placeholder="frontend, bug" />
        </label>

        <label>
          Due Date
          <DatePicker
            value={cards.editor.dueDate || null}
            placeholder="Pick due date"
            onValueChange={(value) =>
              (cards.editor = {
                ...cards.editor,
                dueDate: value ?? '',
              })}
          />
        </label>
      </div>

      <div class="form-actions">
        <Button type="button" variant="outline" onclick={() => (cards.editor.open = false)}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  </Modal>

  <ConfirmDialog
    open={confirm.state.open}
    title={confirm.state.title}
    message={confirm.state.message}
    confirmText="Delete"
    cancelText="Cancel"
    onCancel={confirm.cancel}
    onConfirm={confirm.confirm}
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

  .version-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.13rem 0.42rem;
    border: 1px solid var(--border);
    background: var(--muted);
    color: var(--muted-foreground);
    font-size: 0.68rem;
    font-family: monospace;
    letter-spacing: 0.01em;
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

  .user-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.13rem 0.55rem;
    border: 1px solid var(--border);
    background: var(--secondary);
    color: var(--secondary-foreground);
    font-size: 0.75rem;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

  .danger-zone {
    margin-top: 1.2rem;
    padding-top: 0.9rem;
    border-top: 1px solid var(--destructive);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .danger-zone-label {
    margin: 0;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--destructive);
    text-transform: uppercase;
    letter-spacing: 0.05em;
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
