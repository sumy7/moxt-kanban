import { db } from '../db/database';
import type { Card, CardPriority } from '../types';
import { nowIso } from '../utils/date';
import { createId } from '../utils/id';

export type CardInput = {
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  priority?: CardPriority;
  tags?: string[];
  dueDate?: string | null;
};

export type CardUpdate = {
  title: string;
  description: string;
  priority: CardPriority;
  tags: string[];
  dueDate: string | null;
  columnId: string;
};

function validateTitle(title: string): string {
  const value = title.trim();
  if (!value) {
    throw new Error('Card title is required.');
  }
  return value;
}

async function getCardOrThrow(cardId: string): Promise<Card> {
  const card = await db.cards.get(cardId);
  if (!card) {
    throw new Error(`Card not found: ${cardId}`);
  }
  return card;
}

async function normalizeColumnOrder(columnId: string): Promise<void> {
  const now = nowIso();
  const cards = (
    await db.cards.where('columnId').equals(columnId).toArray()
  ).sort((a, b) => a.order - b.order);

  await db.cards.bulkPut(
    cards.map((card, index) => ({
      ...card,
      order: index + 1,
      updatedAt: now,
    })),
  );
}

export const cardService = {
  async listByBoard(boardId: string): Promise<Card[]> {
    const cards = await db.cards.where('boardId').equals(boardId).toArray();
    return cards.sort((a, b) => a.order - b.order);
  },

  async create(input: CardInput): Promise<Card> {
    const title = validateTitle(input.title);
    const now = nowIso();
    const maxOrder =
      (
        await db.cards.where('columnId').equals(input.columnId).sortBy('order')
      ).at(-1)?.order ?? 0;

    const card: Card = {
      id: createId('card'),
      boardId: input.boardId,
      columnId: input.columnId,
      title,
      description: input.description?.trim() ?? '',
      order: maxOrder + 1,
      priority: input.priority ?? 'medium',
      tags: input.tags ?? [],
      dueDate: input.dueDate ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await db.cards.add(card);
    return card;
  },

  async update(cardId: string, update: CardUpdate): Promise<void> {
    const card = await getCardOrThrow(cardId);

    const title = validateTitle(update.title);
    const now = nowIso();
    const sourceColumnId = card.columnId;

    if (sourceColumnId !== update.columnId) {
      const maxOrder =
        (
          await db.cards
            .where('columnId')
            .equals(update.columnId)
            .sortBy('order')
        ).at(-1)?.order ?? 0;

      await db.transaction('rw', db.cards, async () => {
        await db.cards.update(cardId, {
          title,
          description: update.description.trim(),
          priority: update.priority,
          tags: update.tags,
          dueDate: update.dueDate,
          columnId: update.columnId,
          order: maxOrder + 1,
          updatedAt: now,
        });
        await normalizeColumnOrder(sourceColumnId);
      });

      return;
    }

    await db.cards.update(cardId, {
      title,
      description: update.description.trim(),
      priority: update.priority,
      tags: update.tags,
      dueDate: update.dueDate,
      updatedAt: now,
    });
  },

  async remove(cardId: string): Promise<void> {
    const card = await getCardOrThrow(cardId);

    await db.transaction('rw', db.cards, async () => {
      await db.cards.delete(cardId);
      await normalizeColumnOrder(card.columnId);
    });
  },

  async move(
    cardId: string,
    toColumnId: string,
    toIndex: number,
  ): Promise<void> {
    const card = await getCardOrThrow(cardId);

    await db.transaction('rw', db.cards, async () => {
      const sourceCards = (
        await db.cards.where('columnId').equals(card.columnId).toArray()
      ).sort((a, b) => a.order - b.order);
      const targetCards = (
        await db.cards.where('columnId').equals(toColumnId).toArray()
      ).sort((a, b) => a.order - b.order);

      const sourceWithoutMoving = sourceCards.filter(
        (item) => item.id !== cardId,
      );
      const targetWithoutMoving =
        card.columnId === toColumnId
          ? sourceWithoutMoving
          : targetCards.filter((item) => item.id !== cardId);

      const insertIndex = Math.max(
        0,
        Math.min(toIndex, targetWithoutMoving.length),
      );
      const movedCard: Card = {
        ...card,
        columnId: toColumnId,
        updatedAt: nowIso(),
      };
      targetWithoutMoving.splice(insertIndex, 0, movedCard);

      const now = nowIso();
      const updates: Card[] = [];

      updates.push(
        ...targetWithoutMoving.map((item, index) => ({
          ...item,
          order: index + 1,
          updatedAt: now,
        })),
      );

      if (card.columnId !== toColumnId) {
        updates.push(
          ...sourceWithoutMoving.map((item, index) => ({
            ...item,
            order: index + 1,
            updatedAt: now,
          })),
        );
      }

      await db.cards.bulkPut(updates);
    });
  },
};
