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

  function indicator(field: SortField): string {
    if (sortField !== field) {
      return '';
    }

    return sortDirection === 'asc' ? '↑' : '↓';
  }
</script>

{#if cards.length === 0}
  <EmptyState title="No matching cards" description="Try changing search or filters." />
{:else}
  <div class="table-wrap">
    <Table.Root class="w-full border bg-card">
      <Table.Header>
        <Table.Row>
          <Table.Head><Button variant="ghost" size="xs" onclick={() => onSort('title')}>Title {indicator('title')}</Button></Table.Head>
          <Table.Head><Button variant="ghost" size="xs" onclick={() => onSort('column')}>Status {indicator('column')}</Button></Table.Head>
          <Table.Head><Button variant="ghost" size="xs" onclick={() => onSort('priority')}>Priority {indicator('priority')}</Button></Table.Head>
          <Table.Head>Tags</Table.Head>
          <Table.Head><Button variant="ghost" size="xs" onclick={() => onSort('dueDate')}>Due Date {indicator('dueDate')}</Button></Table.Head>
          <Table.Head><Button variant="ghost" size="xs" onclick={() => onSort('updatedAt')}>Updated {indicator('updatedAt')}</Button></Table.Head>
          <Table.Head><Button variant="ghost" size="xs" onclick={() => onSort('createdAt')}>Created {indicator('createdAt')}</Button></Table.Head>
          <Table.Head>Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each cards as card (card.id)}
          <Table.Row>
            <Table.Cell>
              <div class="font-medium">{card.title}</div>
              <div class="mt-1 text-xs text-muted-foreground">{card.description || 'No description'}</div>
            </Table.Cell>
            <Table.Cell>{columnMap.get(card.columnId) ?? 'Unknown'}</Table.Cell>
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
            <Table.Cell>{card.tags.join(', ') || '-'}</Table.Cell>
            <Table.Cell>{formatDate(card.dueDate)}</Table.Cell>
            <Table.Cell>{formatDate(card.updatedAt)}</Table.Cell>
            <Table.Cell>{formatDate(card.createdAt)}</Table.Cell>
            <Table.Cell>
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
