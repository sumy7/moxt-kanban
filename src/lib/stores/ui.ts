import { writable } from 'svelte/store';

type Toast = {
  type: 'success' | 'error';
  message: string;
};

export const toastStore = writable<Toast | null>(null);
