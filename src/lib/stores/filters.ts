import { createStore } from "./store"
import type { CardFilters } from "../types"

export const defaultFilters: CardFilters = {
  searchText: "",
  priorities: [],
  tags: [],
  columnIds: [],
  dueDateMode: "all",
  dueDateFrom: null,
  dueDateTo: null,
  sortField: "updatedAt",
  sortDirection: "desc",
  viewMode: "board",
}

export const filtersStore = createStore<CardFilters>(defaultFilters)
