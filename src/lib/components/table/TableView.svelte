<script lang="ts">
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Table from '$lib/components/ui/table/index.js';
  import type { Card, Column, SortDirection, SortField } from '../../types';
  import EmptyState from '../shared/EmptyState.svelte';
  import { formatDate } from '../../utils/date';
  import { writable } from 'svelte/store';

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

  // 排序状态
  const sorting = writable<{ id: string; desc: boolean }[]>([
    {
      id: sortField,
      desc: sortDirection === 'desc',
    },
  ]);

  let currentSorting: { id: string; desc: boolean }[] = [];
  sorting.subscribe((value) => {
    currentSorting = value;
  });

  // 监听外部排序变化
  $effect(() => {
    sorting.set([
      {
        id: sortField,
        desc: sortDirection === 'desc',
      },
    ]);
  });

  // 排序数据
  const sortedCards = $derived.by(() => {
    const sorted = [...cards];
    if (currentSorting.length > 0) {
      const { id, desc } = currentSorting[0];
      sorted.sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;

        switch (id) {
          case 'title':
            aVal = a.title;
            bVal = b.title;
            break;
          case 'column':
            aVal = a.columnId;
            bVal = b.columnId;
            break;
          case 'priority':
            aVal = a.priority;
            bVal = b.priority;
            break;
          case 'tags':
            aVal = (a.tags ?? []).join(', ');
            bVal = (b.tags ?? []).join(', ');
            break;
          case 'dueDate':
            aVal = a.dueDate || '';
            bVal = b.dueDate || '';
            break;
          case 'updatedAt':
            aVal = a.updatedAt;
            bVal = b.updatedAt;
            break;
          case 'createdAt':
            aVal = a.createdAt;
            bVal = b.createdAt;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return desc ? 1 : -1;
        if (aVal > bVal) return desc ? -1 : 1;
        return 0;
      });
    }
    return sorted;
  });

  // 构建行数据，每行包含 id 和 original
  const rows = $derived.by(() =>
    sortedCards.map((card, idx) => ({
      id: card.id || `row-${idx}`,
      original: card,
    }))
  );

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
    const isCurrentColumn = currentSorting[0]?.id === colId;
    const desc = isCurrentColumn ? !currentSorting[0].desc : false;
    sorting.set([
      {
        id: colId,
        desc: desc,
      },
    ]);
    onSort(colId as SortField);
  }

  function getSortIndicator(colId: string): string {
    const s = currentSorting[0];
    if (s?.id !== colId) return '';
    return s.desc ? '↓' : '↑';
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
        {#each rows as row (row.id)}
          <Table.Row>
            <Table.Cell class="max-w-xs">
              <div class="font-medium">{row.original.title}</div>
              <div class="mt-1 text-xs text-muted-foreground">
                {row.original.description || 'No description'}
              </div>
            </Table.Cell>
            <Table.Cell>
              {columnMap.get(row.original.columnId) ?? 'Unknown'}
            </Table.Cell>
            <Table.Cell>
              <Badge
                variant={
                  row.original.priority === 'urgent'
                    ? 'destructive'
                    : row.original.priority === 'high'
                      ? 'secondary'
                      : 'outline'
                }
              >
                {row.original.priority}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              {(row.original.tags ?? []).join(', ') || '-'}
            </Table.Cell>
            <Table.Cell>
              {formatDate(row.original.dueDate)}
            </Table.Cell>
            <Table.Cell>
              {formatDate(row.original.updatedAt)}
            </Table.Cell>
            <Table.Cell>
              {formatDate(row.original.createdAt)}
            </Table.Cell>
            <Table.Cell class="w-24">
              <div class="flex gap-1">
                <Button type="button" size="xs" variant="outline" onclick={() => onEditCard(row.original)}>Edit</Button>
                <Button type="button" size="xs" variant="destructive" onclick={() => onDeleteCard(row.original)}>Delete</Button>
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
