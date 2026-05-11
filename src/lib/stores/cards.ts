import { createStore } from './store';
import type { Card } from '../types';

export const cardsStore = createStore<Card[]>([]);
