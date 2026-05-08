import { get } from 'svelte/store';
import { columnService } from '../services/columnService';
import { activeBoardIdStore } from '../stores/boards';
import { columnsStore } from '../stores/columns';
import type { Column } from '../types';

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

export function createColumnActions({
  loadBoardData,
  notifySuccess,
  safely,
  requestConfirm,
}: Deps) {
  let modalOpen = $state(false);
  let editingId = $state<string | null>(null);
  let titleInput = $state('');

  function openCreate(): void {
    if (!get(activeBoardIdStore)) return;
    editingId = null;
    titleInput = '';
    modalOpen = true;
  }

  function openEdit(column: Column): void {
    editingId = column.id;
    titleInput = column.title;
    modalOpen = true;
  }

  function closeModal(): void {
    modalOpen = false;
  }

  async function submit(): Promise<void> {
    await safely(async () => {
      const boardId = get(activeBoardIdStore);
      if (!boardId) return;

      if (editingId) {
        await columnService.rename(editingId, titleInput);
        notifySuccess('Column updated.');
      } else {
        await columnService.create(boardId, titleInput);
        notifySuccess('Column created.');
      }
      modalOpen = false;
      await loadBoardData(boardId);
    });
  }

  function requestDelete(column: Column): void {
    requestConfirm(
      'Delete column',
      `Delete ${column.title}? All cards in this column will be removed.`,
      async () => {
        await columnService.remove(column.id);
        const boardId = get(activeBoardIdStore);
        if (boardId) await loadBoardData(boardId);
        notifySuccess('Column deleted.');
      },
    );
  }

  async function move(
    column: Column,
    direction: 'left' | 'right',
  ): Promise<void> {
    await safely(async () => {
      const boardId = get(activeBoardIdStore);
      if (!boardId) return;

      const sorted = [...get(columnsStore)].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((c) => c.id === column.id);
      const nextIndex = direction === 'left' ? index - 1 : index + 1;
      if (index < 0 || nextIndex < 0 || nextIndex >= sorted.length) return;

      const [moved] = sorted.splice(index, 1);
      sorted.splice(nextIndex, 0, moved);
      await columnService.reorder(
        boardId,
        sorted.map((c) => c.id),
      );
      await loadBoardData(boardId);
    });
  }

  return {
    get modalOpen() {
      return modalOpen;
    },
    set modalOpen(v: boolean) {
      modalOpen = v;
    },
    get editingId() {
      return editingId;
    },
    get titleInput() {
      return titleInput;
    },
    set titleInput(v: string) {
      titleInput = v;
    },
    openCreate,
    openEdit,
    closeModal,
    submit,
    requestDelete,
    move,
  };
}
