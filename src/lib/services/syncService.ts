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
  return Date.now() - new Date(lastSyncDate).getTime() > FULL_SYNC_THRESHOLD_MS;
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

// ── Sync operations ────────────────────────────────────────────────────────

async function performFullSync(): Promise<void> {
  const syncTime = new Date().toISOString();

  const boards = await boardService.list();
  boardsStore.set(boards);

  const activeBoardId = get(activeBoardIdStore);
  if (activeBoardId && boards.some((b) => b.id === activeBoardId)) {
    const [columns, cards] = await Promise.all([
      columnService.listByBoard(activeBoardId),
      cardService.listByBoard(activeBoardId),
    ]);
    columnsStore.set(columns);
    cardsStore.set(cards);
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
  if (updatedBoards.length > 0) {
    boardsStore.update((current) => mergeBoards(current, updatedBoards));
  }

  const activeBoardId = get(activeBoardIdStore);
  if (activeBoardId) {
    const [updatedColumns, updatedCards] = await Promise.all([
      columnService.findUpdatedSince(activeBoardId, since),
      cardService.findUpdatedSince(activeBoardId, since),
    ]);

    if (updatedColumns.length > 0) {
      columnsStore.update((current) => mergeOrdered(current, updatedColumns));
    }

    if (updatedCards.length > 0) {
      cardsStore.update((current) => mergeOrdered(current, updatedCards));
    }
  }

  setLastSyncDate(syncTime);
}

async function triggerSync(): Promise<void> {
  if (needsFullSync()) {
    await performFullSync();
  } else {
    await performIncrementalSync();
  }
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

  boundVisibilityChange = handleVisibilityChange;
  document.addEventListener('visibilitychange', boundVisibilityChange);

  const moxt = (window as Window & { moxt?: MoxtEventEmitter }).moxt;
  if (moxt) {
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
