import type { Card, CardFilters, Column } from '../types';
import { sortCards } from '../utils/sort';

function includesText(card: Card, query: string): boolean {
  if (!query.trim()) {
    return true;
  }

  const text = query.trim().toLowerCase();
  return (
    card.title.toLowerCase().includes(text) ||
    card.description.toLowerCase().includes(text) ||
    card.tags.some((tag) => tag.toLowerCase().includes(text))
  );
}

function isDueDateMatch(card: Card, filters: CardFilters): boolean {
  if (filters.dueDateMode === 'with' && !card.dueDate) {
    return false;
  }

  if (filters.dueDateMode === 'without' && card.dueDate) {
    return false;
  }

  if (filters.dueDateMode === 'overdue') {
    return !!card.dueDate && new Date(card.dueDate).getTime() < Date.now();
  }

  if (
    filters.dueDateFrom &&
    (!card.dueDate || card.dueDate < filters.dueDateFrom)
  ) {
    return false;
  }

  if (
    filters.dueDateTo &&
    (!card.dueDate || card.dueDate > filters.dueDateTo)
  ) {
    return false;
  }

  return true;
}

export function filterAndSortCards(
  cards: Card[],
  columns: Column[],
  filters: CardFilters,
): Card[] {
  const columnMap = new Map(columns.map((column) => [column.id, column.title]));

  const filtered = cards.filter((card) => {
    if (!includesText(card, filters.searchText)) {
      return false;
    }

    if (
      filters.priorities.length > 0 &&
      !filters.priorities.includes(card.priority)
    ) {
      return false;
    }

    if (
      filters.tags.length > 0 &&
      !filters.tags.every((tag) => card.tags.includes(tag))
    ) {
      return false;
    }

    if (
      filters.columnIds.length > 0 &&
      !filters.columnIds.includes(card.columnId)
    ) {
      return false;
    }

    return isDueDateMatch(card, filters);
  });

  return sortCards(
    filtered,
    filters.sortField,
    filters.sortDirection,
    (columnId) => {
      return columnMap.get(columnId) ?? 'Unknown';
    },
  );
}
