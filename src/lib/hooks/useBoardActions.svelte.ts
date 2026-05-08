import { boardService } from '../services/boardService';
import { activeBoardIdStore } from '../stores/boards';
import type { Board } from '../types';

type Deps = {
  reloadBoards: (selectFirst?: boolean) => Promise<void>;
  notifySuccess: (message: string) => void;
  safely: (task: () => Promise<void>) => Promise<void>;
  requestConfirm: (
    title: string,
    message: string,
    action: () => Promise<void>,
  ) => void;
};

export function createBoardActions({
  reloadBoards,
  notifySuccess,
  safely,
  requestConfirm,
}: Deps) {
  let modalOpen = $state(false);
  let editingId = $state<string | null>(null);
  let nameInput = $state('');

  function openCreate(): void {
    editingId = null;
    nameInput = '';
    modalOpen = true;
  }

  function openEdit(board: Board): void {
    editingId = board.id;
    nameInput = board.name;
    modalOpen = true;
  }

  function closeModal(): void {
    modalOpen = false;
  }

  async function submit(): Promise<void> {
    await safely(async () => {
      if (editingId) {
        await boardService.rename(editingId, nameInput);
        notifySuccess('Board updated.');
      } else {
        const created = await boardService.create(nameInput);
        activeBoardIdStore.set(created.id);
        notifySuccess('Board created.');
      }
      modalOpen = false;
      await reloadBoards(false);
    });
  }

  function requestDelete(board: Board): void {
    requestConfirm(
      'Delete board',
      `Delete ${board.name}? All its columns and cards will also be deleted.`,
      async () => {
        await boardService.remove(board.id);
        await reloadBoards(true);
        notifySuccess('Board deleted.');
      },
    );
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
    get nameInput() {
      return nameInput;
    },
    set nameInput(v: string) {
      nameInput = v;
    },
    openCreate,
    openEdit,
    closeModal,
    submit,
    requestDelete,
  };
}
