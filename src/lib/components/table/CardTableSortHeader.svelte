<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';

	type Props = {
		label: string;
		onclick: ((event: unknown) => void) | undefined;
		sorted: false | 'asc' | 'desc';
	};

	let { label, onclick, sorted }: Props = $props();
</script>

<Button variant="ghost" size="sm" class="-ml-3 h-8" {onclick}>
	{label}
	{#if sorted === 'asc'}
		<ArrowUp class="ml-2 size-4" />
	{:else if sorted === 'desc'}
		<ArrowDown class="ml-2 size-4" />
	{:else}
		<ArrowUpDown class="ml-2 size-4" />
	{/if}
</Button>
