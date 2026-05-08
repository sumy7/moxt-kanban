import { get } from 'svelte/store';
import { toastStore } from '../stores/ui';

export function createNotifications() {
  let errorMessage = $state('');
  let successToastTimer: ReturnType<typeof setTimeout> | null = null;

  function parseError(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Unknown error';
  }

  function notifySuccess(message: string): void {
    if (successToastTimer) {
      clearTimeout(successToastTimer);
      successToastTimer = null;
    }

    toastStore.set({ type: 'success', message });

    successToastTimer = setTimeout(() => {
      const currentToast = get(toastStore);
      if (currentToast?.type === 'success' && currentToast.message === message) {
        toastStore.set(null);
      }
      successToastTimer = null;
    }, 2200);
  }

  function notifyError(message: string): void {
    if (successToastTimer) {
      clearTimeout(successToastTimer);
      successToastTimer = null;
    }
    toastStore.set({ type: 'error', message });
  }

  async function safely(task: () => Promise<void>): Promise<void> {
    try {
      errorMessage = '';
      await task();
    } catch (error) {
      notifyError(parseError(error));
    }
  }

  return {
    get errorMessage() {
      return errorMessage;
    },
    parseError,
    notifySuccess,
    notifyError,
    safely,
  };
}
