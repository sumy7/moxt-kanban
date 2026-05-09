import type { Card, CardPriority, SortDirection, SortField } from '../types';

export const priorityRank: Record<CardPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

export function sortCards(
  cards: Card[],
  sortField: SortField,
  sortDirection: SortDirection,
  getColumnTitle: (columnId: string) => string,
): Card[] {
  const sorted = [...cards].sort((a, b) => {
    let result = 0;

    if (sortField === 'title') {
      result = a.title.localeCompare(b.title);
    } else if (sortField === 'priority') {
      result = priorityRank[a.priority] - priorityRank[b.priority];
    } else if (sortField === 'dueDate') {
      result = (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
    } else if (sortField === 'updatedAt') {
      result = a.updatedAt.localeCompare(b.updatedAt);
    } else if (sortField === 'createdAt') {
      result = a.createdAt.localeCompare(b.createdAt);
    } else if (sortField === 'column') {
      result = getColumnTitle(a.columnId).localeCompare(
        getColumnTitle(b.columnId),
      );
    }

    if (result === 0) {
      return a.order - b.order;
    }

    return sortDirection === 'asc' ? result : -result;
  });

  return sorted;
}
