import { get } from 'svelte/store';
import {
  cardService,
  normalizeCardUpdate,
  type CardInput,
  type CardUpdate,
} from '../services/cardService';
import { activeBoardIdStore } from '../stores/boards';
import { cardsStore } from '../stores/cards';
import { nowIso } from '../utils/date';
import type { Card, CardPriority } from '../types';

export type CardEditorState = {
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

const DEFAULT_EDITOR: CardEditorState = {
  open: false,
  editingCardId: null,
  boardId: '',
  columnId: '',
  title: '',
  description: '',
  priority: 'medium',
  tagsText: '',
  dueDate: '',
};

type Deps = {
  loadBoardData: (boardId: string) => Promise<void>;
  notifySuccess: (message: string) => void;
  safely: (task: () => Promise<void>) => Promise<void>;
  requestConfirm: (
    title: string,
    message: string,
    action: () => Promise<void>,
  ) => void;
};

export function createCardActions({
  loadBoardData,
  notifySuccess,
  safely,
  requestConfirm,
}: Deps) {
  let editor = $state<CardEditorState>({ ...DEFAULT_EDITOR });

  function openCreate(columnId: string): void {
    const boardId = get(activeBoardIdStore);
    if (!boardId) return;
    editor = { ...DEFAULT_EDITOR, open: true, boardId, columnId };
  }

  function openEdit(card: Card): void {
    editor = {
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
    const current = cards.find((c) => c.id === cardId);
    if (!current)
      throw new Error(
        `Optimistic update error: card not found with id ${cardId}`,
      );

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
      return cards.map((c) => (c.id === cardId ? nextCard : c));
    }

    const remaining = cards.filter((c) => c.id !== cardId);
    const sourceReordered = new Map(
      remaining
        .filter((c) => c.columnId === current.columnId)
        .sort((a, b) => a.order - b.order)
        .map((c, i) => [c.id, { ...c, order: i + 1, updatedAt: now }]),
    );
    const targetMaxOrder = remaining
      .filter((c) => c.columnId === normalized.columnId)
      .reduce((max, c) => Math.max(max, c.order), 0);

    return [
      ...remaining.map((c) => sourceReordered.get(c.id) ?? c),
      { ...nextCard, columnId: normalized.columnId, order: targetMaxOrder + 1 },
    ];
  }

  async function submit(): Promise<void> {
    await safely(async () => {
      let shouldReloadBoardData = false;
      const tags = editor.tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (editor.editingCardId) {
        const update: CardUpdate = {
          title: editor.title,
          description: editor.description,
          priority: editor.priority,
          tags,
          dueDate: editor.dueDate || null,
          columnId: editor.columnId,
        };

        const currentCards = get(cardsStore);
        cardsStore.set(
          buildOptimisticUpdatedCards(
            currentCards,
            editor.editingCardId,
            update,
          ),
        );
        editor.open = false;

        try {
          await cardService.update(editor.editingCardId, update);
          notifySuccess('Card updated.');
        } catch (error) {
          const boardId = get(activeBoardIdStore);
          if (boardId) {
            await loadBoardData(boardId);
          }
          editor.open = true;
          throw error;
        }
      } else {
        const input: CardInput = {
          boardId: editor.boardId,
          columnId: editor.columnId,
          title: editor.title,
          description: editor.description,
          priority: editor.priority,
          tags,
          dueDate: editor.dueDate || null,
        };
        await cardService.create(input);
        shouldReloadBoardData = true;
        notifySuccess('Card created.');
      }

      editor.open = false;
      if (shouldReloadBoardData) {
        const boardId = get(activeBoardIdStore);
        if (boardId) await loadBoardData(boardId);
      }
    });
  }

  function requestDelete(card: Card): void {
    requestConfirm('Delete card', `Delete card ${card.title}?`, async () => {
      await cardService.remove(card.id);
      const boardId = get(activeBoardIdStore);
      if (boardId) await loadBoardData(boardId);
      notifySuccess('Card deleted.');
    });
  }

  async function drop(
    cardId: string,
    toColumnId: string,
    toIndex: number,
  ): Promise<void> {
    await safely(async () => {
      await cardService.move(cardId, toColumnId, toIndex);
      const boardId = get(activeBoardIdStore);
      if (boardId) await loadBoardData(boardId);
    });
  }

  return {
    get editor() {
      return editor;
    },
    set editor(v: CardEditorState) {
      editor = v;
    },
    openCreate,
    openEdit,
    submit,
    requestDelete,
    drop,
  };
}
