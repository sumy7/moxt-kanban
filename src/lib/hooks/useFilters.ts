import { useCallback } from "react"
import { defaultFilters, filtersStore } from "../stores/filters"
import type { CardFilters, SortField } from "../types"

export function useFilters() {
  const update = useCallback((patch: Partial<CardFilters>): void => {
    filtersStore.update((filters) => ({ ...filters, ...patch }))
  }, [])

  const toggleView = useCallback((mode: CardFilters["viewMode"]): void => {
    filtersStore.update((filters) => ({ ...filters, viewMode: mode }))
  }, [])

  const updateSort = useCallback((field: SortField): void => {
    filtersStore.update((filters) => {
      const nextDirection =
        filters.sortField === field
          ? filters.sortDirection === "asc"
            ? "desc"
            : "asc"
          : "asc"
      return { ...filters, sortField: field, sortDirection: nextDirection }
    })
  }, [])

  const reset = useCallback((): void => {
    filtersStore.update((filters) => ({
      ...defaultFilters,
      viewMode: filters.viewMode,
    }))
  }, [])

  return { update, toggleView, updateSort, reset }
}
