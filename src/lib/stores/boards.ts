import { writable } from 'svelte/store';
import type { Board } from '../types';

export const boardsStore = writable<Board[]>([]);
export const activeBoardIdStore = writable<string | null>(null);
