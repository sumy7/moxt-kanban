<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { CardPriority } from '../../types';

	type Props = { priority: CardPriority };

	let { priority }: Props = $props();

	const variant = $derived(priority === 'urgent' ? 'destructive' : priority === 'high' ? 'secondary' : 'outline');
</script>

<Badge {variant}>{priority}</Badge>
