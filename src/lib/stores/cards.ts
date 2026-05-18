import { createValueStore } from "./store"
import type { Card } from "../types"

export const cardsStore = createValueStore<Card[]>([])
