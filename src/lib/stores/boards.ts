import { createStore } from "./store"
import type { Board } from "../types"

export const boardsStore = createStore<Board[]>([])
export const activeBoardIdStore = createStore<string | null>(null)
