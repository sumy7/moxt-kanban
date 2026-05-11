import { useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CardFilters, Column } from "../../types"
import { TableToolbar } from "../table/TableToolbar"

type BoardToolbarProps = {
  boardName: string
  viewMode: "board" | "table"
  filters: CardFilters
  columns: Column[]
  availableTags: string[]
  onToggleView: (mode: "board" | "table") => void
  onFiltersChange: (patch: Partial<CardFilters>) => void
  onResetFilters: () => void
}

export function BoardToolbar({
  boardName,
  viewMode,
  filters,
  columns,
  availableTags,
  onToggleView,
  onFiltersChange,
  onResetFilters,
}: BoardToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)

  const hasActiveFilters =
    filters.searchText !== "" ||
    filters.priorities.length > 0 ||
    filters.tags.length > 0 ||
    filters.columnIds.length > 0 ||
    filters.dueDateMode !== "all" ||
    filters.dueDateFrom !== null ||
    filters.dueDateTo !== null

  return (
    <div className="board-toolbar">
      <div className="board-toolbar-row">
        <h2 className="board-name">{boardName}</h2>

        <div className="board-toolbar-controls">
          <div className="view-toggle" role="group" aria-label="Switch view">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "board" ? "default" : "outline"}
              onClick={() => onToggleView("board")}
            >
              Board View
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "table" ? "default" : "outline"}
              onClick={() => onToggleView("table")}
            >
              Table View
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            variant={filtersOpen ? "default" : "outline"}
            onClick={() => setFiltersOpen((v) => !v)}
            className={hasActiveFilters && !filtersOpen ? "filter-active" : ""}
          >
            <SlidersHorizontal className="size-3.5" />
            Filters
            {hasActiveFilters ? (
              <span className="filter-dot" aria-hidden="true" />
            ) : null}
          </Button>
        </div>
      </div>

      {filtersOpen ? (
        <div className="board-toolbar-filters">
          <TableToolbar
            filters={filters}
            columns={columns}
            availableTags={availableTags}
            onFiltersChange={onFiltersChange}
            onReset={onResetFilters}
          />
        </div>
      ) : null}
    </div>
  )
}
