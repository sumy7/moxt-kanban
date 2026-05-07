import { writable } from 'svelte/store';
import type { Card } from '../types';

export const cardsStore = writable<Card[]>([]);
