import { writable } from 'svelte/store';
import type { Column } from '../types';

export const columnsStore = writable<Column[]>([]);
