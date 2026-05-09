import type { Component, Snippet } from 'svelte';

export { default as FlexRender } from './flex-render.svelte';
export { createSvelteTable } from './create-svelte-table.svelte.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = Component<any, any>;

// Discriminant property to identify render configs
export type RenderComponentConfig<TComponent extends AnyComponent = AnyComponent> = {
	__kind: 'component';
	component: TComponent;
	props: Record<string, unknown>;
};

export type RenderSnippetConfig<TArgs = unknown> = {
	__kind: 'snippet';
	snippet: Snippet<[TArgs]>;
	args: TArgs;
};

export function isRenderComponentConfig(value: unknown): value is RenderComponentConfig {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>)['__kind'] === 'component'
	);
}

export function isRenderSnippetConfig(value: unknown): value is RenderSnippetConfig {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Record<string, unknown>)['__kind'] === 'snippet'
	);
}

export function renderComponent<TComponent extends AnyComponent>(
	component: TComponent,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	props: TComponent extends Component<infer P, any> ? P : Record<string, unknown>
): RenderComponentConfig<TComponent> {
	return {
		__kind: 'component',
		component,
		props: props as Record<string, unknown>,
	};
}

export function renderSnippet<TArgs>(
	snippet: Snippet<[TArgs]>,
	args: TArgs
): RenderSnippetConfig<TArgs> {
	return {
		__kind: 'snippet',
		snippet,
		args,
	};
}
