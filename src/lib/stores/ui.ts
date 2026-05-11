import { createStore } from './store';

type Toast = {
  type: 'success' | 'error';
  message: string;
};

export const toastStore = createStore<Toast | null>(null);
