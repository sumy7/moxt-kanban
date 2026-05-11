import { createStore } from "./store"
import type { Column } from "../types"

export const columnsStore = createStore<Column[]>([])
