<script lang="ts">
  import { SlidersHorizontal } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import TableToolbar from '../table/TableToolbar.svelte';
  import type { CardFilters, Column } from '../../types';

  type Props = {
    boardName: string;
    viewMode: 'board' | 'table';
    filters: CardFilters;
    columns: Column[];
    availableTags: string[];
    onToggleView: (mode: 'board' | 'table') => void;
    onFiltersChange: (patch: Partial<CardFilters>) => void;
    onResetFilters: () => void;
  };

  let {
    boardName,
    viewMode,
    filters,
    columns,
    availableTags,
    onToggleView,
    onFiltersChange,
    onResetFilters,
  }: Props = $props();

  let filtersOpen = $state(false);

  const hasActiveFilters = $derived(
    filters.searchText !== '' ||
      filters.priorities.length > 0 ||
      filters.tags.length > 0 ||
      filters.columnIds.length > 0 ||
      filters.dueDateMode !== 'all' ||
      filters.dueDateFrom !== null ||
      filters.dueDateTo !== null,
  );
</script>

<div class="board-toolbar">
  <div class="board-toolbar-row">
    <h2 class="board-name">{boardName}</h2>

    <div class="board-toolbar-controls">
      <div class="view-toggle" role="group" aria-label="Switch view">
        <Button
          type="button"
          size="sm"
          variant={viewMode === 'board' ? 'default' : 'outline'}
          onclick={() => onToggleView('board')}
        >
          Board View
        </Button>
        <Button
          type="button"
          size="sm"
          variant={viewMode === 'table' ? 'default' : 'outline'}
          onclick={() => onToggleView('table')}
        >
          Table View
        </Button>
      </div>

      <Button
        type="button"
        size="sm"
        variant={filtersOpen ? 'default' : 'outline'}
        onclick={() => (filtersOpen = !filtersOpen)}
        class={hasActiveFilters && !filtersOpen ? 'filter-active' : ''}
      >
        <SlidersHorizontal class="size-3.5" />
        Filters
        {#if hasActiveFilters}
          <span class="filter-dot" aria-hidden="true"></span>
        {/if}
      </Button>
    </div>
  </div>

  {#if filtersOpen}
    <div class="board-toolbar-filters">
      <TableToolbar
        {filters}
        {columns}
        {availableTags}
        onFiltersChange={onFiltersChange}
        onReset={onResetFilters}
      />
    </div>
  {/if}
</div>

<style>
  .board-toolbar {
    border: 1px solid var(--border);
    background: var(--card);
    padding: 0.4rem 0.65rem;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .board-toolbar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .board-name {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.2;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .board-toolbar-controls {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .view-toggle {
    display: flex;
    gap: 0;
  }

  .view-toggle :global(button:first-child) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .view-toggle :global(button:last-child) {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left: none;
  }

  .filter-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    margin-left: 2px;
    opacity: 0.75;
    vertical-align: middle;
  }

  .board-toolbar-filters {
    border-top: 1px solid var(--border);
    padding-top: 0.55rem;
  }
</style>
