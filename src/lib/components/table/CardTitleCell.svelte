<script lang="ts">
	type Props = { title: string; description: string };
	let { title, description }: Props = $props();
</script>

<div class="font-medium">{title}</div>
{#if description}
	<div class="mt-1 text-xs text-muted-foreground">{description}</div>
{/if}
