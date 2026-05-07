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

  let draggingCardId = $state<string | null>(null);
  let activeDropColumnId = $state<string | null>(null);
  let activeDropIndex = $state<number | null>(null);

  function startDrag(event: DragEvent, card: KanbanCard): void {
    if (!event.dataTransfer) {
      return;
    }

    draggingCardId = card.id;
    activeDropIndex = null;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify({ cardId: card.id }));
  }

  function handleDragEnd(): void {
    draggingCardId = null;
    activeDropColumnId = null;
    activeDropIndex = null;
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

  function setDropPosition(event: DragEvent, columnId: string, index: number): void {
    event.preventDefault();
    event.stopPropagation();
    activeDropColumnId = columnId;
    activeDropIndex = index;
  }

  function dropToColumn(event: DragEvent, columnId: string): void {
    event.preventDefault();
    event.stopPropagation();

    const payload = readPayload(event);
    if (!payload) {
      return;
    }

    const list = cardsByColumn[columnId] ?? [];
    const resolvedIndex =
      activeDropColumnId === columnId && activeDropIndex !== null ? activeDropIndex : list.length;

    onDropCard(payload.cardId, columnId, resolvedIndex);
    handleDragEnd();
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
  <div class="h-full overflow-x-auto pb-1">
    <div class="flex h-full min-w-max items-stretch gap-3">
      {#each columns as column (column.id)}
        {@const columnCards = cardsByColumn[column.id] ?? []}
        <section
          class={`flex h-full max-h-full min-h-[220px] w-[320px] flex-col gap-2 border bg-card p-2 text-card-foreground transition-colors ${
            activeDropColumnId === column.id ? 'border-primary bg-accent/35' : 'border-border'
          }`}
          style="--column-card-height: 74px;"
        >
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

          <div
            class="grid min-h-0 flex-1 auto-rows-min gap-2 overflow-y-auto"
            role="region"
            aria-label={`Cards in ${column.title}`}
            ondragover={(event) => setDropPosition(event, column.id, columnCards.length)}
            ondrop={(event) => dropToColumn(event, column.id)}
          >
            {#each columnCards as card, index (card.id)}
              {#if draggingCardId && activeDropColumnId === column.id && activeDropIndex === index}
                <div class="drop-placeholder" aria-hidden="true"></div>
              {/if}

              <div
                draggable="true"
                class={`transition duration-150 ease-out ${draggingCardId === card.id ? 'scale-[0.98] opacity-45' : 'opacity-100'}`}
                style="min-height: var(--column-card-height);"
                role="listitem"
                aria-label={`Card ${card.title}`}
                ondragstart={(event) => startDrag(event, card)}
                ondragend={handleDragEnd}
                ondragenter={(event) => setDropPosition(event, column.id, index)}
                ondragover={(event) => setDropPosition(event, column.id, index)}
                ondrop={(event) => dropToColumn(event, column.id)}
              >
                <UiCard.Root size="sm" class="gap-2 rounded-none border">
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

            {#if draggingCardId && activeDropColumnId === column.id && activeDropIndex === columnCards.length}
              <div class="drop-placeholder" aria-hidden="true"></div>
            {/if}
          </div>

          <Button class="mt-1" type="button" variant="secondary" onclick={() => onAddCard(column.id)}>
            <Plus class="size-3.5" />
            Add Card
          </Button>
        </section>
      {/each}

      <Button type="button" variant="outline" class="h-10 w-[190px] self-start border-dashed" onclick={onAddColumn}>
        <Plus class="size-3.5" />
        Add Column
      </Button>
    </div>
  </div>
{/if}

<style>
  .drop-placeholder {
    --placeholder-offset: 6px;
    height: var(--column-card-height);
    border: 1px dashed var(--primary);
    background: color-mix(in oklch, var(--accent) 72%, transparent);
    animation: placeholder-move 150ms ease-out;
  }

  @keyframes placeholder-move {
    0% {
      transform: translateY(var(--placeholder-offset));
      opacity: 0.45;
    }
    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>
