import { createValueStore } from "./store"
import type { Board } from "../types"

export const boardsStore = createValueStore<Board[]>([])
export const activeBoardIdStore = createValueStore<string | null>(null)
