<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';

  type Props = {
    title: string;
    description: string;
    actionText?: string;
    onAction?: () => void;
  };

  let { title, description, actionText, onAction }: Props = $props();
</script>

<Card.Root class="rounded-none border-dashed text-center">
  <Card.Content class="space-y-3 px-4 py-8">
    <Card.Title>{title}</Card.Title>
    <Card.Description>{description}</Card.Description>
    {#if actionText && onAction}
      <div class="pt-1">
        <Button type="button" onclick={onAction}>{actionText}</Button>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
