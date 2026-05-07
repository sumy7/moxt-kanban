export type CardPriority = 'low' | 'medium' | 'high' | 'urgent';

export type Card = {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  order: number;
  priority: CardPriority;
  tags: string[];
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};
