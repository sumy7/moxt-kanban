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
    return db.boards.orderBy('updatedAt').reverse().toArray();
  },

  async create(name: string): Promise<Board> {
    const validName = validateName(name);
    const now = nowIso();
    const board: Board = {
      id: createId('board'),
      name: validName,
      createdAt: now,
      updatedAt: now,
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
        },
        {
          id: createId('col'),
          boardId: board.id,
          title: 'In Progress',
          order: 2,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: createId('col'),
          boardId: board.id,
          title: 'Done',
          order: 3,
          createdAt: now,
          updatedAt: now,
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
    await db.transaction('rw', db.boards, db.columns, db.cards, async () => {
      await db.cards.where('boardId').equals(boardId).delete();
      await db.columns.where('boardId').equals(boardId).delete();
      await db.boards.delete(boardId);
    });
  },
};
