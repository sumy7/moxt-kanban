import { createTable, type RowData, type TableOptions, type Table } from '@tanstack/table-core';

export function createSvelteTable<TData extends RowData>(
	options: TableOptions<TData>
): Table<TData> {
	const table = $state(
		createTable({
			// onStateChange is required by TableOptionsResolved; the actual state updates are
			// handled via the individual onXChange callbacks (onSortingChange, onPaginationChange).
			onStateChange() {},
			renderFallbackValue: null,
			...options,
			state: options.state ?? {},
		})
	);

	$effect.pre(() => {
		table.setOptions((prev) => ({
			...prev,
			...options,
			state: {
				...prev.state,
				...options.state,
			},
		}));
	});

	return table;
}
