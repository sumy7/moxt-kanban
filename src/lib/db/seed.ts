import { createId } from '../utils/id';
import { nowIso } from '../utils/date';
import type { Board, Column } from '../types';
import { db } from './database';
import { boardService } from '../services/boardService';

export async function seedIfNeeded(): Promise<void> {
  const boards = await boardService.list();
  if (boards.length > 0) {
    return;
  }

  const now = nowIso();
  const board: Board = {
    id: createId('board'),
    name: 'My First Board',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  const columns: Column[] = [
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
  ];

  await db.transaction('rw', db.boards, db.columns, async () => {
    await db.boards.add(board);
    await db.columns.bulkAdd(columns);
  });
}
