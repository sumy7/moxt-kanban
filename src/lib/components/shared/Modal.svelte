<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog/index.js';

  type Props = {
    open: boolean;
    title: string;
    onClose: () => void;
    width?: 'sm' | 'md' | 'lg';
    children?: import('svelte').Snippet;
  };

  let { open, title, onClose, width = 'md', children }: Props = $props();

  const widthClassMap: Record<NonNullable<Props['width']>, string> = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
  };
</script>

<Dialog.Root bind:open onOpenChange={(nextOpen) => !nextOpen && onClose()}>
  <Dialog.Content class={`max-w-[calc(100%-2rem)] ${widthClassMap[width]}`} showCloseButton>
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
    </Dialog.Header>
    <div class="pt-2">
      {@render children?.()}
    </div>
  </Dialog.Content>
</Dialog.Root>
