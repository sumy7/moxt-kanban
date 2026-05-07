import type { CardPriority } from './card';

export type ViewMode = 'board' | 'table';

export type SortField =
  | 'title'
  | 'priority'
  | 'dueDate'
  | 'updatedAt'
  | 'createdAt'
  | 'column';

export type SortDirection = 'asc' | 'desc';

export type CardFilters = {
  searchText: string;
  priorities: CardPriority[];
  tags: string[];
  columnIds: string[];
  dueDateMode: 'all' | 'with' | 'without' | 'overdue';
  dueDateFrom: string | null;
  dueDateTo: string | null;
  sortField: SortField;
  sortDirection: SortDirection;
  viewMode: ViewMode;
};
