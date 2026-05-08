import { defaultFilters, filtersStore } from '../stores/filters';
import type { CardFilters, SortField } from '../types';

export function createFilters() {
  function update(patch: Partial<CardFilters>): void {
    filtersStore.update((filters) => ({ ...filters, ...patch }));
  }

  function toggleView(mode: CardFilters['viewMode']): void {
    filtersStore.update((filters) => ({ ...filters, viewMode: mode }));
  }

  function updateSort(field: SortField): void {
    filtersStore.update((filters) => {
      const nextDirection =
        filters.sortField === field
          ? filters.sortDirection === 'asc'
            ? 'desc'
            : 'asc'
          : 'asc';
      return { ...filters, sortField: field, sortDirection: nextDirection };
    });
  }

  function reset(): void {
    filtersStore.update((filters) => ({
      ...defaultFilters,
      viewMode: filters.viewMode,
    }));
  }

  return { update, toggleView, updateSort, reset };
}
