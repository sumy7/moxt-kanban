<script lang="ts">
	import { isRenderComponentConfig, isRenderSnippetConfig } from './index.js';

	type Props = {
		content: unknown;
		context?: unknown;
	};

	let { content, context }: Props = $props();

	const value = $derived.by(() => {
		if (typeof content === 'function') {
			return (content as (ctx: unknown) => unknown)(context);
		}
		return content;
	});
</script>

{#if isRenderComponentConfig(value)}
	{@const Comp = value.component}
	<Comp {...value.props} />
{:else if isRenderSnippetConfig(value)}
	{@render value.snippet(value.args)}
{:else if value !== null && value !== undefined}
	{value}
{/if}
