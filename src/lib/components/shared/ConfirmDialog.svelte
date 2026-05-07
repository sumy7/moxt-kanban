<script lang="ts">
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';

  type Props = {
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
  };

  let {
    open,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
  }: Props = $props();
</script>

<AlertDialog.Root bind:open onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{title}</AlertDialog.Title>
      <AlertDialog.Description>{message}</AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={onCancel}>{cancelText}</AlertDialog.Cancel>
      <AlertDialog.Action variant="destructive" onclick={onConfirm}>{confirmText}</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
