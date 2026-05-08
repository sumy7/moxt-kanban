<script lang="ts">
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Table from '$lib/components/ui/table/index.js';
  import type { Card, Column, SortDirection, SortField } from '../../types';
  import EmptyState from '../shared/EmptyState.svelte';
  import { formatDate } from '../../utils/date';

  type Props = {
    cards: Card[];
    columns: Column[];
    sortField: SortField;
    sortDirection: SortDirection;
    onSort: (field: SortField) => void;
    onEditCard: (card: Card) => void;
    onDeleteCard: (card: Card) => void;
  };

  let { cards, columns, sortField, sortDirection, onSort, onEditCard, onDeleteCard }: Props =
    $props();

  const columnMap = $derived(new Map(columns.map((column) => [column.id, column.title])));

  // 列定义
  interface ColumnHeader {
    id: string;
    label: string;
    sortable: boolean;
  }

  const columnHeaders: ColumnHeader[] = [
    { id: 'title', label: 'Title', sortable: true },
    { id: 'column', label: 'Status', sortable: true },
    { id: 'priority', label: 'Priority', sortable: true },
    { id: 'tags', label: 'Tags', sortable: false },
    { id: 'dueDate', label: 'Due Date', sortable: true },
    { id: 'updatedAt', label: 'Updated', sortable: true },
    { id: 'createdAt', label: 'Created', sortable: true },
  ];

  function handleColumnSort(colId: string): void {
    onSort(colId as SortField);
  }

  function getSortIndicator(colId: string): string {
    if (sortField !== colId) {
      return '';
    }

    return sortDirection === 'desc' ? '↓' : '↑';
  }
</script>

{#if cards.length === 0}
  <EmptyState title="No matching cards" description="Try changing search or filters." />
{:else}
  <div class="table-wrap">
    <Table.Root class="w-full border bg-card">
      <Table.Header>
        <Table.Row>
          {#each columnHeaders as header (header.id)}
            <Table.Head
              class={header.sortable ? 'cursor-pointer select-none hover:bg-muted/50' : ''}
              onclick={() => header.sortable && handleColumnSort(header.id)}
            >
              <div class="flex items-center gap-1">
                <span>{header.label}</span>
                {#if header.sortable && getSortIndicator(header.id)}
                  <span class="text-xs">{getSortIndicator(header.id)}</span>
                {/if}
              </div>
            </Table.Head>
          {/each}
          <Table.Head class="w-24">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each cards as card (card.id)}
          <Table.Row>
            <Table.Cell class="max-w-xs">
              <div class="font-medium">{card.title}</div>
              <div class="mt-1 text-xs text-muted-foreground">
                {card.description || 'No description'}
              </div>
            </Table.Cell>
            <Table.Cell>
              {columnMap.get(card.columnId) ?? 'Unknown'}
            </Table.Cell>
            <Table.Cell>
              <Badge
                variant={
                  card.priority === 'urgent'
                    ? 'destructive'
                    : card.priority === 'high'
                      ? 'secondary'
                      : 'outline'
                }
              >
                {card.priority}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              {(card.tags ?? []).join(', ') || '-'}
            </Table.Cell>
            <Table.Cell>
              {formatDate(card.dueDate)}
            </Table.Cell>
            <Table.Cell>
              {formatDate(card.updatedAt)}
            </Table.Cell>
            <Table.Cell>
              {formatDate(card.createdAt)}
            </Table.Cell>
            <Table.Cell class="w-24">
              <div class="flex gap-1">
                <Button type="button" size="xs" variant="outline" onclick={() => onEditCard(card)}>Edit</Button>
                <Button type="button" size="xs" variant="destructive" onclick={() => onDeleteCard(card)}>Delete</Button>
              </div>
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>
{/if}

<style>
  .table-wrap {
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: auto;
    display: block;
  }
</style>
