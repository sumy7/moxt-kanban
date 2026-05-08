import { db } from '../db/database';
import type { Board } from '../types';
import { nowIso } from '../utils/date';
import { createId } from '../utils/id';

function validateName(name: string): string {
  const value = name.trim();
  if (!value) {
    throw new Error('Board name is required.');
  }
  return value;
}

export const boardService = {
  async list(): Promise<Board[]> {
    const all = await db.boards.orderBy('updatedAt').reverse().toArray();
    return all.filter((b) => !b.deletedAt);
  },

  async findUpdatedSince(since: string): Promise<Board[]> {
    const all = await db.boards.orderBy('updatedAt').toArray();
    return all.filter((b) => b.updatedAt > since);
  },

  async create(name: string): Promise<Board> {
    const validName = validateName(name);
    const now = nowIso();
    const board: Board = {
      id: createId('board'),
      name: validName,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await db.transaction('rw', db.boards, db.columns, async () => {
      await db.boards.add(board);
      await db.columns.bulkAdd([
        {
          id: createId('col'),
          boardId: board.id,
          title: 'Todo',
          order: 1,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
        {
          id: createId('col'),
          boardId: board.id,
          title: 'In Progress',
          order: 2,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
        {
          id: createId('col'),
          boardId: board.id,
          title: 'Done',
          order: 3,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      ]);
    });

    return board;
  },

  async rename(boardId: string, name: string): Promise<void> {
    const validName = validateName(name);

    await db.boards.update(boardId, {
      name: validName,
      updatedAt: nowIso(),
    });
  },

  async remove(boardId: string): Promise<void> {
    const now = nowIso();
    await db.transaction('rw', db.boards, db.columns, db.cards, async () => {
      const cards = await db.cards.where('boardId').equals(boardId).toArray();
      await db.cards.bulkPut(
        cards.map((c) => ({ ...c, deletedAt: now, updatedAt: now })),
      );

      const columns = await db.columns
        .where('boardId')
        .equals(boardId)
        .toArray();
      await db.columns.bulkPut(
        columns.map((c) => ({ ...c, deletedAt: now, updatedAt: now })),
      );

      await db.boards.update(boardId, { deletedAt: now, updatedAt: now });
    });
  },
};
