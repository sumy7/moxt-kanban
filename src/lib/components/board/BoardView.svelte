<script lang="ts">
  import { ChevronLeft, ChevronRight, GripVertical, Pencil, Plus, Trash2 } from '@lucide/svelte';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as UiCard from '$lib/components/ui/card/index.js';
  import type { Card as KanbanCard, Column } from '../../types';
  import EmptyState from '../shared/EmptyState.svelte';
  import { formatDate } from '../../utils/date';

  type Props = {
    columns: Column[];
    cardsByColumn: Record<string, KanbanCard[]>;
    onAddColumn: () => void;
    onMoveColumnLeft: (column: Column) => void;
    onMoveColumnRight: (column: Column) => void;
    onEditColumn: (column: Column) => void;
    onDeleteColumn: (column: Column) => void;
    onAddCard: (columnId: string) => void;
    onEditCard: (card: KanbanCard) => void;
    onDeleteCard: (card: KanbanCard) => void;
    onDropCard: (cardId: string, toColumnId: string, toIndex: number) => void;
  };

  let {
    columns,
    cardsByColumn,
    onAddColumn,
    onMoveColumnLeft,
    onMoveColumnRight,
    onEditColumn,
    onDeleteColumn,
    onAddCard,
    onEditCard,
    onDeleteCard,
    onDropCard,
  }: Props = $props();

  let keyboardSelectedCardId = $state<string | null>(null);

  function startDrag(event: DragEvent, card: KanbanCard): void {
    if (!event.dataTransfer) {
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify({ cardId: card.id }));
  }

  function readPayload(event: DragEvent): { cardId: string } | null {
    if (!event.dataTransfer) {
      return null;
    }

    const raw = event.dataTransfer.getData('application/json');
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as { cardId: string };
    } catch {
      return null;
    }
  }

  function clearKeyboardSelection(): void {
    keyboardSelectedCardId = null;
  }

  function dropToColumnEnd(columnId: string): void {
    if (!keyboardSelectedCardId) {
      return;
    }

    const list = cardsByColumn[columnId] ?? [];
    onDropCard(keyboardSelectedCardId, columnId, list.length);
  }

  function handleColumnDrop(event: DragEvent, columnId: string): void {
    event.preventDefault();
    const payload = readPayload(event);
    if (!payload) {
      return;
    }

    const list = cardsByColumn[columnId] ?? [];
    onDropCard(payload.cardId, columnId, list.length);
  }

  function handleColumnDropZoneKeydown(event: KeyboardEvent, columnId: string): void {
    if (!keyboardSelectedCardId) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      dropToColumnEnd(columnId);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      clearKeyboardSelection();
    }
  }

  function handleCardKeydown(
    event: KeyboardEvent,
    card: KanbanCard,
    columnId: string,
    index: number,
  ): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      keyboardSelectedCardId = keyboardSelectedCardId === card.id ? null : card.id;
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      clearKeyboardSelection();
      return;
    }

    if (keyboardSelectedCardId !== card.id) {
      return;
    }

    if (event.key === 'ArrowUp' && index > 0) {
      event.preventDefault();
      onDropCard(card.id, columnId, index - 1);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      onDropCard(card.id, columnId, index + 1);
      return;
    }

    const columnIndex = columns.findIndex((column) => column.id === columnId);
    if (event.key === 'ArrowLeft' && columnIndex > 0) {
      event.preventDefault();
      const targetColumnId = columns[columnIndex - 1].id;
      const list = cardsByColumn[targetColumnId] ?? [];
      onDropCard(card.id, targetColumnId, list.length);
      return;
    }

    if (event.key === 'ArrowRight' && columnIndex < columns.length - 1) {
      event.preventDefault();
      const targetColumnId = columns[columnIndex + 1].id;
      const list = cardsByColumn[targetColumnId] ?? [];
      onDropCard(card.id, targetColumnId, list.length);
    }
  }
</script>

{#if columns.length === 0}
  <EmptyState
    title="No columns yet"
    description="Create your first column to start managing cards."
    actionText="Add Column"
    onAction={onAddColumn}
  />
{:else}
  <div class="overflow-x-auto pb-3">
    <div class="flex min-w-max items-start gap-4">
      {#each columns as column (column.id)}
        <section class="flex min-h-[220px] w-[320px] flex-col gap-3 rounded-lg border bg-card p-3 text-card-foreground">
          <header class="flex items-start justify-between gap-2">
            <h3 class="pt-1 text-sm font-semibold">{column.title}</h3>
            <div class="flex flex-wrap justify-end gap-1">
              <Button type="button" size="icon-xs" variant="outline" onclick={() => onMoveColumnLeft(column)} title="Move left">
                <ChevronLeft class="size-3.5" />
                <span class="sr-only">Move left</span>
              </Button>
              <Button type="button" size="icon-xs" variant="outline" onclick={() => onMoveColumnRight(column)} title="Move right">
                <ChevronRight class="size-3.5" />
                <span class="sr-only">Move right</span>
              </Button>
              <Button type="button" size="icon-xs" variant="outline" onclick={() => onEditColumn(column)}>
                <Pencil class="size-3.5" />
                <span class="sr-only">Rename</span>
              </Button>
              <Button type="button" size="icon-xs" variant="destructive" onclick={() => onDeleteColumn(column)}>
                <Trash2 class="size-3.5" />
                <span class="sr-only">Delete</span>
              </Button>
            </div>
          </header>
          <p class="text-[11px] text-muted-foreground">
            Drag cards with mouse, or focus a card and press Space then arrow keys to move.
          </p>

          <div
            class="rounded border border-dashed border-border bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground"
            role="button"
            tabindex="0"
            aria-label={`Drop selected card into ${column.title}`}
            ondragover={(event) => event.preventDefault()}
            ondrop={(event) => handleColumnDrop(event, column.id)}
            onkeydown={(event) => handleColumnDropZoneKeydown(event, column.id)}
          >
            {#if keyboardSelectedCardId}
              Press Enter to drop selected card here
            {:else}
              Drop zone
            {/if}
          </div>

          <div class="grid gap-2" role="list" aria-label={`Cards in ${column.title}`}>
            {#each cardsByColumn[column.id] ?? [] as card, index (card.id)}
              <div
                draggable="true"
                class="rounded-md"
                tabindex="0"
                role="button"
                aria-grabbed={keyboardSelectedCardId === card.id}
                aria-label={`Card ${card.title}`}
                ondragstart={(event) => startDrag(event, card)}
                ondragover={(event) => event.preventDefault()}
                ondrop={(event) => {
                  event.preventDefault();
                  const payload = readPayload(event);
                  if (!payload || payload.cardId === card.id) {
                    return;
                  }
                  onDropCard(payload.cardId, column.id, index);
                }}
                onkeydown={(event) => handleCardKeydown(event, card, column.id, index)}
              >
                <UiCard.Root size="sm" class="gap-2">
                  <UiCard.Content class="space-y-2 px-3">
                    <UiCard.Title class="flex items-center gap-1 text-xs">
                      <GripVertical class="size-3 text-muted-foreground" />
                      {card.title}
                    </UiCard.Title>
                    <UiCard.Description class="line-clamp-3 text-xs">
                      {card.description || 'No description'}
                    </UiCard.Description>
                  </UiCard.Content>
                  <div class="flex items-center justify-between gap-2 px-3 text-[11px] text-muted-foreground">
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
                    {#if card.dueDate}
                      <span>Due {formatDate(card.dueDate)}</span>
                    {/if}
                  </div>
                  <UiCard.Footer class="justify-end gap-1 px-3 pb-3">
                    <Button type="button" size="icon-xs" variant="outline" onclick={() => onEditCard(card)}>
                      <Pencil class="size-3.5" />
                      <span class="sr-only">Edit</span>
                    </Button>
                    <Button type="button" size="icon-xs" variant="destructive" onclick={() => onDeleteCard(card)}>
                      <Trash2 class="size-3.5" />
                      <span class="sr-only">Delete</span>
                    </Button>
                  </UiCard.Footer>
                </UiCard.Root>
              </div>
            {/each}
          </div>

          <Button class="mt-1" type="button" variant="secondary" onclick={() => onAddCard(column.id)}>
            <Plus class="size-3.5" />
            Add Card
          </Button>
        </section>
      {/each}

      <Button type="button" variant="outline" class="h-10 w-[190px] border-dashed" onclick={onAddColumn}>
        <Plus class="size-3.5" />
        Add Column
      </Button>
    </div>
  </div>
{/if}
