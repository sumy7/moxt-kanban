<script lang="ts">
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Table from '$lib/components/ui/table/index.js';
  import type { Card, Column, SortDirection, SortField } from '../../types';
  import EmptyState from '../shared/EmptyState.svelte';
  import { formatDate } from '../../utils/date';
  import {
    createColumnHelper,
    getCoreRowModel,
    getSortedRowModel,
    type ColumnDef,
    type SortingState,
  } from '@tanstack/table-core';
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

  const columnHelper = createColumnHelper<Card>();

  const columnDefs: ColumnDef<Card>[] = [
    columnHelper.accessor('title', {
      header: 'Title',
    }),
    columnHelper.accessor('columnId', {
      id: 'column',
      header: 'Status',
      cell: (info) => columnMap.get(info.getValue()) ?? 'Unknown',
    }),
    columnHelper.accessor('priority', {
      header: 'Priority',
    }),
    columnHelper.accessor('tags', {
      header: 'Tags',
      cell: (info) => (info.getValue() ?? []).join(', ') || '-',
    }),
    columnHelper.accessor('dueDate', {
      header: 'Due Date',
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('updatedAt', {
      header: 'Updated',
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: (info) => formatDate(info.getValue()),
    }),
  ];

  // 初始化排序状态
  const sorting = writable<SortingState>([
    {
      id: sortField,
      desc: sortDirection === 'desc',
    },
  ]);

  let currentSorting: SortingState = [];
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

  // 创建排序处理函数
  const handleSorting = (updater: SortingState | ((old: SortingState) => SortingState)) => {
    const newSorting = typeof updater === 'function' ? updater(currentSorting) : updater;
    sorting.set(newSorting);
    if (newSorting.length > 0) {
      onSort(newSorting[0].id as SortField);
    }
  };

  // 创建表格实例
  const table = $derived.by(() => {
    const instance = {
      data: cards,
      columns: columnDefs,
      state: {
        sorting: currentSorting,
      },
      onSortingChange: handleSorting,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
    };

    // 获取行
    const sortedRowModel = getSortedRowModel<Card>()(instance);
    const rows = sortedRowModel.rows;

    // 创建表头
    const headerGroups = [
      {
        id: 'header',
        headers: columnDefs.map((col, idx) => {
          const colId = col.id || `col-${idx}`;
          const isSorted = currentSorting[0]?.id === colId;

          return {
            id: colId,
            column: {
              columnDef: col,
              getIsSorted: () =>
                isSorted ? (currentSorting[0].desc ? 'desc' : 'asc') : false,
              toggleSorting: () => {
                const isCurrentColumn = isSorted;
                const desc = isCurrentColumn ? !currentSorting[0].desc : false;
                sorting.set([
                  {
                    id: colId,
                    desc: desc,
                  },
                ]);
                onSort(colId as SortField);
              },
            },
            isPlaceholder: false,
            renderHeader: () =>
              typeof col.header === 'string' ? col.header : '',
          };
        }),
      },
    ];

    return {
      getHeaderGroups: () => headerGroups,
      getRowModel: () => ({
        rows: rows,
      }),
    };
  });

  const headerGroups = $derived(table.getHeaderGroups());
  const rows = $derived(table.getRowModel().rows);

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
        {#each headerGroups as headerGroup (headerGroup.id)}
          <Table.Row>
            {#each headerGroup.headers as header (header.id)}
              <Table.Head
                class="cursor-pointer select-none hover:bg-muted/50"
                onclick={() => header.column.toggleSorting()}
              >
                <div class="flex items-center gap-1">
                  <span>{header.renderHeader()}</span>
                  {#if getSortIndicator(header.id)}
                    <span class="text-xs">{getSortIndicator(header.id)}</span>
                  {/if}
                </div>
              </Table.Head>
            {/each}
            <Table.Head class="w-24">Actions</Table.Head>
          </Table.Row>
        {/each}
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
