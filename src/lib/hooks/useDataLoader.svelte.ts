import { get } from 'svelte/store';
import { boardService } from '../services/boardService';
import { cardService } from '../services/cardService';
import { columnService } from '../services/columnService';
import { activeBoardIdStore, boardsStore } from '../stores/boards';
import { cardsStore } from '../stores/cards';
import { columnsStore } from '../stores/columns';
import { filtersStore } from '../stores/filters';

export function createDataLoader() {
  async function loadBoardData(boardId: string): Promise<void> {
    const [columns, cards] = await Promise.all([
      columnService.listByBoard(boardId),
      cardService.listByBoard(boardId),
    ]);
    columnsStore.set(columns);
    cardsStore.set(cards);

    const validColumnIds = new Set(columns.map((c) => c.id));
    filtersStore.update((filters) => ({
      ...filters,
      columnIds: filters.columnIds.filter((id) => validColumnIds.has(id)),
    }));
  }

  async function reloadBoards(selectFirst = false): Promise<void> {
    const boards = await boardService.list();
    boardsStore.set(boards);

    if (boards.length === 0) {
      activeBoardIdStore.set(null);
      columnsStore.set([]);
      cardsStore.set([]);
      return;
    }

    const activeId = get(activeBoardIdStore);
    const boardId =
      selectFirst || !activeId || !boards.some((b) => b.id === activeId)
        ? boards[0].id
        : activeId;

    activeBoardIdStore.set(boardId);
    await loadBoardData(boardId);
  }

  return { loadBoardData, reloadBoards };
}
