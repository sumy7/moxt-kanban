import { toastStore } from '../stores/ui';

export function createNotifications() {
  let errorMessage = $state('');

  function parseError(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Unknown error';
  }

  function notifySuccess(message: string): void {
    toastStore.set({ type: 'success', message });
    setTimeout(() => toastStore.set(null), 2200);
  }

  function notifyError(message: string): void {
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
