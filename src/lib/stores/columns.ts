import { createValueStore } from "./store"
import type { Column } from "../types"

export const columnsStore = createValueStore<Column[]>([])
