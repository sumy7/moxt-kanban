import { get } from 'svelte/store';
import { activeBoardIdStore, boardsStore } from '../stores/boards';
import { columnsStore } from '../stores/columns';
import { cardsStore } from '../stores/cards';
import type { Board } from '../types';
import { boardService } from './boardService';
import { cardService } from './cardService';
import { columnService } from './columnService';

// How long (ms) without a sync before the next one becomes a full sync.
const FULL_SYNC_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

type MoxtDataChangePayload = { path: string };

type MoxtEventEmitter = {
  on(
    event: 'data:change',
    callback: (payload: MoxtDataChangePayload) => void | Promise<void>,
  ): () => void;
};

// ── In-memory sync timestamp ───────────────────────────────────────────────

let lastSyncDate: string | null = null;

function getLastSyncDate(): string | null {
  return lastSyncDate;
}

function setLastSyncDate(date: string): void {
  lastSyncDate = date;
}

function needsFullSync(): boolean {
  if (!lastSyncDate) return true;
  const ms = new Date(lastSyncDate).getTime();
  if (!Number.isFinite(ms)) return true;
  return Date.now() - ms > FULL_SYNC_THRESHOLD_MS;
}

// ── Store merge helpers ────────────────────────────────────────────────────

function mergeBoards(current: Board[], updated: Board[]): Board[] {
  const result = [...current];
  for (const board of updated) {
    const idx = result.findIndex((b) => b.id === board.id);
    if (board.deletedAt) {
      if (idx >= 0) result.splice(idx, 1);
    } else if (idx >= 0) {
      result[idx] = board;
    } else {
      result.push(board);
    }
  }
  return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function mergeOrdered<
  T extends { id: string; deletedAt: string | null; order: number },
>(current: T[], updated: T[]): T[] {
  const result = [...current];
  for (const item of updated) {
    const idx = result.findIndex((i) => i.id === item.id);
    if (item.deletedAt) {
      if (idx >= 0) result.splice(idx, 1);
    } else if (idx >= 0) {
      result[idx] = item;
    } else {
      result.push(item);
    }
  }
  return result.sort((a, b) => a.order - b.order);
}

// ── Board / store helpers ──────────────────────────────────────────────────

/**
 * Given a list of available boards and the current active board id, returns
 * the id to use as the active board (falling back to the first board or null).
 * Also returns whether the current active board is still valid.
 */
function resolveActiveBoardId(
  boards: Board[],
  currentActiveId: string | null,
): { id: string | null; changed: boolean } {
  const stillValid =
    !!currentActiveId && boards.some((b) => b.id === currentActiveId);
  if (stillValid) return { id: currentActiveId, changed: false };
  const id = boards.length > 0 ? boards[0].id : null;
  return { id, changed: true };
}

// ── Sync operations ────────────────────────────────────────────────────────

async function performFullSync(): Promise<void> {
  const syncTime = new Date().toISOString();

  const boards = await boardService.list();
  boardsStore.set(boards);

  const { id: resolvedBoardId, changed } = resolveActiveBoardId(
    boards,
    get(activeBoardIdStore),
  );

  if (changed) {
    activeBoardIdStore.set(resolvedBoardId);
  }

  if (resolvedBoardId) {
    const [columns, cards] = await Promise.all([
      columnService.listByBoard(resolvedBoardId),
      cardService.listByBoard(resolvedBoardId),
    ]);
    columnsStore.set(columns);
    cardsStore.set(cards);
  } else {
    columnsStore.set([]);
    cardsStore.set([]);
  }

  setLastSyncDate(syncTime);
}

async function performIncrementalSync(): Promise<void> {
  const since = getLastSyncDate();
  if (!since) {
    return performFullSync();
  }

  const syncTime = new Date().toISOString();

  const updatedBoards = await boardService.findUpdatedSince(since);
  let currentBoards = get(boardsStore);
  if (updatedBoards.length > 0) {
    currentBoards = mergeBoards(currentBoards, updatedBoards);
    boardsStore.set(currentBoards);
  }

  // Re-validate the active board after the merge — it may have been deleted.
  const { id: resolvedBoardId, changed } = resolveActiveBoardId(
    currentBoards,
    get(activeBoardIdStore),
  );

  if (changed) {
    activeBoardIdStore.set(resolvedBoardId);
  }

  if (resolvedBoardId) {
    const [updatedColumns, updatedCards] = await Promise.all([
      columnService.findUpdatedSince(resolvedBoardId, since),
      cardService.findUpdatedSince(resolvedBoardId, since),
    ]);

    if (updatedColumns.length > 0) {
      columnsStore.update((current) => mergeOrdered(current, updatedColumns));
    }

    if (updatedCards.length > 0) {
      cardsStore.update((current) => mergeOrdered(current, updatedCards));
    }
  } else {
    columnsStore.set([]);
    cardsStore.set([]);
  }

  setLastSyncDate(syncTime);
}

// ── Concurrency lock ───────────────────────────────────────────────────────

let syncInFlight: Promise<void> | null = null;

async function triggerSync(): Promise<void> {
  // Coalesce concurrent callers onto the running sync promise.
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    try {
      if (needsFullSync()) {
        await performFullSync();
      } else {
        await performIncrementalSync();
      }
    } catch (error) {
      // Absorb errors so the shared promise never rejects and leaves callers
      // with an unhandled rejection. Sync will be retried on the next trigger.
      console.error('[syncService] Sync failed:', error);
    }
  })().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

// ── Event listeners ────────────────────────────────────────────────────────

const WATCHED_PATHS = ['boards', 'columns', 'cards'];

async function handleDataChange(payload: MoxtDataChangePayload): Promise<void> {
  if (!WATCHED_PATHS.some((p) => payload.path.startsWith(p))) return;

  if (
    typeof document !== 'undefined' &&
    document.visibilityState === 'visible'
  ) {
    await triggerSync();
  }
  // If the page is hidden, the visibilitychange handler will trigger a sync
  // when the page becomes visible again (requirement: always sync on show).
}

function handleVisibilityChange(): void {
  if (
    typeof document !== 'undefined' &&
    document.visibilityState === 'visible'
  ) {
    // Always sync when the page becomes visible.
    void triggerSync();
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

let boundVisibilityChange: (() => void) | null = null;
let unsubDataChange: (() => void) | null = null;

export function initSync(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Ensure no stale listeners accumulate if initSync is called more than once.
  destroySync();

  boundVisibilityChange = handleVisibilityChange;
  document.addEventListener('visibilitychange', boundVisibilityChange);

  const moxt = (window as Window & { moxt?: MoxtEventEmitter }).moxt;
  if (moxt && typeof moxt.on === 'function') {
    unsubDataChange = moxt.on('data:change', handleDataChange);
  }
}

export function destroySync(): void {
  if (typeof document !== 'undefined' && boundVisibilityChange) {
    document.removeEventListener('visibilitychange', boundVisibilityChange);
    boundVisibilityChange = null;
  }

  if (unsubDataChange) {
    unsubDataChange();
    unsubDataChange = null;
  }

  lastSyncDate = null;
}

export { performFullSync as fullSync };
