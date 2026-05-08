import { db } from '../db/database';
import type { Column } from '../types';
import { nowIso } from '../utils/date';
import { createId } from '../utils/id';

function validateTitle(title: string): string {
  const value = title.trim();
  if (!value) {
    throw new Error('Column title is required.');
  }
  return value;
}

export const columnService = {
  async listByBoard(boardId: string): Promise<Column[]> {
    const columns = await db.columns.where('boardId').equals(boardId).toArray();
    return columns
      .filter((c) => !c.deletedAt)
      .sort((a, b) => a.order - b.order);
  },

  async findUpdatedSince(boardId: string, since: string): Promise<Column[]> {
    const all = await db.columns.where('boardId').equals(boardId).toArray();
    return all.filter((c) => c.updatedAt > since);
  },

  async create(boardId: string, title: string): Promise<Column> {
    const validTitle = validateTitle(title);
    const now = nowIso();
    const maxOrder =
      (
        await db.columns.where('boardId').equals(boardId).sortBy('order')
      )
        .filter((c) => !c.deletedAt)
        .at(-1)?.order ?? 0;

    const column: Column = {
      id: createId('col'),
      boardId,
      title: validTitle,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await db.columns.add(column);
    return column;
  },

  async rename(columnId: string, title: string): Promise<void> {
    const validTitle = validateTitle(title);

    await db.columns.update(columnId, {
      title: validTitle,
      updatedAt: nowIso(),
    });
  },

  async remove(columnId: string): Promise<void> {
    const now = nowIso();
    await db.transaction('rw', db.columns, db.cards, async () => {
      const cards = await db.cards
        .where('columnId')
        .equals(columnId)
        .toArray();
      await db.cards.bulkPut(
        cards.map((c) => ({ ...c, deletedAt: now, updatedAt: now })),
      );
      await db.columns.update(columnId, { deletedAt: now, updatedAt: now });
    });
  },

  async reorder(boardId: string, orderedColumnIds: string[]): Promise<void> {
    const now = nowIso();
    const columns = await db.columns.where('boardId').equals(boardId).toArray();
    const columnIdsInBoard = new Set(
      columns.filter((c) => !c.deletedAt).map((column) => column.id),
    );

    await db.transaction('rw', db.columns, async () => {
      for (const [index, id] of orderedColumnIds.entries()) {
        if (!columnIdsInBoard.has(id)) {
          continue;
        }

        await db.columns.update(id, {
          order: index + 1,
          updatedAt: now,
        });
      }
    });
  },
};
