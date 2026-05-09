<script lang="ts">
	import {
		type ColumnDef,
		type PaginationState,
		type SortingState,
		getCoreRowModel,
		getPaginationRowModel,
		getSortedRowModel,
	} from '@tanstack/table-core';
	import {
		FlexRender,
		createSvelteTable,
		renderComponent,
	} from '$lib/components/ui/data-table/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Card, Column } from '../../types';
	import { formatDate } from '../../utils/date';
	import { priorityRank } from '../../utils/sort';
	import EmptyState from '../shared/EmptyState.svelte';
	import CardTableActions from './CardTableActions.svelte';
	import CardTableSortHeader from './CardTableSortHeader.svelte';
	import CardPriorityCell from './CardPriorityCell.svelte';
	import CardTitleCell from './CardTitleCell.svelte';

	type Props = {
		cards: Card[];
		columns: Column[];
		onEditCard: (card: Card) => void;
		onDeleteCard: (card: Card) => void;
	};

	let { cards, columns, onEditCard, onDeleteCard }: Props = $props();

	const columnMap = $derived(new Map(columns.map((col) => [col.id, col.title])));

	const DEFAULT_PAGE_SIZE = 20;

	const columnDefs: ColumnDef<Card>[] = [
		{
			accessorKey: 'title',
			header: ({ column }) =>
				renderComponent(CardTableSortHeader, {
					label: 'Title',
					onclick: column.getToggleSortingHandler(),
					sorted: column.getIsSorted(),
				}),
			cell: ({ row }) =>
				renderComponent(CardTitleCell, {
					title: row.original.title,
					description: row.original.description,
				}),
		},
		{
			id: 'column',
			accessorFn: (card) => columnMap.get(card.columnId) ?? 'Unknown',
			header: ({ column }) =>
				renderComponent(CardTableSortHeader, {
					label: 'Status',
					onclick: column.getToggleSortingHandler(),
					sorted: column.getIsSorted(),
				}),
		},
		{
			accessorKey: 'priority',
			sortingFn: (rowA, rowB) =>
				(priorityRank[rowA.original.priority] ?? 0) -
				(priorityRank[rowB.original.priority] ?? 0),
			header: ({ column }) =>
				renderComponent(CardTableSortHeader, {
					label: 'Priority',
					onclick: column.getToggleSortingHandler(),
					sorted: column.getIsSorted(),
				}),
			cell: ({ row }) => renderComponent(CardPriorityCell, { priority: row.original.priority }),
		},
		{
			id: 'tags',
			accessorFn: (card) => (card.tags ?? []).join(', ') || '-',
			header: 'Tags',
			enableSorting: false,
		},
		{
			accessorKey: 'dueDate',
			header: ({ column }) =>
				renderComponent(CardTableSortHeader, {
					label: 'Due Date',
					onclick: column.getToggleSortingHandler(),
					sorted: column.getIsSorted(),
				}),
			cell: ({ row }) => formatDate(row.original.dueDate),
		},
		{
			accessorKey: 'updatedAt',
			header: ({ column }) =>
				renderComponent(CardTableSortHeader, {
					label: 'Updated',
					onclick: column.getToggleSortingHandler(),
					sorted: column.getIsSorted(),
				}),
			cell: ({ row }) => formatDate(row.original.updatedAt),
		},
		{
			accessorKey: 'createdAt',
			header: ({ column }) =>
				renderComponent(CardTableSortHeader, {
					label: 'Created',
					onclick: column.getToggleSortingHandler(),
					sorted: column.getIsSorted(),
				}),
			cell: ({ row }) => formatDate(row.original.createdAt),
		},
		{
			id: 'actions',
			header: 'Actions',
			enableSorting: false,
			enableHiding: false,
			cell: ({ row }) =>
				renderComponent(CardTableActions, {
					card: row.original,
					onEdit: onEditCard,
					onDelete: onDeleteCard,
				}),
		},
	];

	let sorting = $state<SortingState>([]);
	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE });

	const table = createSvelteTable({
		get data() {
			return cards;
		},
		columns: columnDefs,
		state: {
			get sorting() {
				return sorting;
			},
			get pagination() {
				return pagination;
			},
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: (updater) => {
			sorting = typeof updater === 'function' ? updater(sorting) : updater;
		},
		onPaginationChange: (updater) => {
			pagination = typeof updater === 'function' ? updater(pagination) : updater;
		},
		renderFallbackValue: null,
	});
</script>

{#if cards.length === 0}
	<EmptyState title="No matching cards" description="Try changing search or filters." />
{:else}
	<div class="table-wrap">
		<div class="rounded-md border">
			<Table.Root>
				<Table.Header>
					{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
						<Table.Row>
							{#each headerGroup.headers as header (header.id)}
								<Table.Head class="whitespace-nowrap">
									{#if !header.isPlaceholder}
										<FlexRender
											content={header.column.columnDef.header}
											context={header.getContext()}
										/>
									{/if}
								</Table.Head>
							{/each}
						</Table.Row>
					{/each}
				</Table.Header>
				<Table.Body>
					{#each table.getRowModel().rows as row (row.id)}
						<Table.Row>
							{#each row.getVisibleCells() as cell (cell.id)}
								<Table.Cell>
									<FlexRender
										content={cell.column.columnDef.cell}
										context={cell.getContext()}
									/>
								</Table.Cell>
							{/each}
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={columnDefs.length} class="h-24 text-center">
								No results.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

		<div class="flex items-center justify-between pt-3">
			<span class="text-muted-foreground text-sm">
				{table.getFilteredRowModel().rows.length} card(s) total
			</span>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
				>
					Previous
				</Button>
				<span class="text-sm">
					Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
				</span>
				<Button
					variant="outline"
					size="sm"
					onclick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
				>
					Next
				</Button>
			</div>
		</div>
	</div>
{/if}

<style>
	.table-wrap {
		width: 100%;
		height: 100%;
		min-height: 0;
		overflow: auto;
		display: flex;
		flex-direction: column;
	}
</style>
