<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Card } from '../../types';

	type Props = {
		card: Card;
		onEdit: (card: Card) => void;
		onDelete: (card: Card) => void;
	};

	let { card, onEdit, onDelete }: Props = $props();
</script>

<div class="flex gap-1">
	<Button type="button" size="xs" variant="outline" onclick={() => onEdit(card)}>Edit</Button>
	<Button type="button" size="xs" variant="destructive" onclick={() => onDelete(card)}>Delete</Button>
</div>
