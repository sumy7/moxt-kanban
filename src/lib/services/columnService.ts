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
    return columns.sort((a, b) => a.order - b.order);
  },

  async create(boardId: string, title: string): Promise<Column> {
    const validTitle = validateTitle(title);
    const now = nowIso();
    const maxOrder =
      (await db.columns.where('boardId').equals(boardId).sortBy('order')).at(-1)
        ?.order ?? 0;

    const column: Column = {
      id: createId('col'),
      boardId,
      title: validTitle,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
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
    await db.transaction('rw', db.columns, db.cards, async () => {
      await db.cards.where('columnId').equals(columnId).delete();
      await db.columns.delete(columnId);
    });
  },

  async reorder(boardId: string, orderedColumnIds: string[]): Promise<void> {
    const now = nowIso();
    const columns = await db.columns.where('boardId').equals(boardId).toArray();
    const columnIdsInBoard = new Set(columns.map((column) => column.id));

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
