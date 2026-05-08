type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  action: (() => Promise<void>) | null;
};

export function createConfirm(
  safely: (task: () => Promise<void>) => Promise<void>,
) {
  let state = $state<ConfirmState>({
    open: false,
    title: '',
    message: '',
    action: null,
  });

  function request(
    title: string,
    message: string,
    action: () => Promise<void>,
  ): void {
    state = { open: true, title, message, action };
  }

  async function confirm(): Promise<void> {
    if (!state.action) return;
    await safely(async () => {
      await state.action?.();
      state.open = false;
      state.action = null;
    });
  }

  function cancel(): void {
    state.open = false;
    state.action = null;
  }

  return {
    get state() {
      return state;
    },
    request,
    confirm,
    cancel,
  };
}
