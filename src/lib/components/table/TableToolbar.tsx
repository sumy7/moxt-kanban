import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  CardFilters,
  CardPriority,
  Column,
  SortDirection,
  SortField,
} from "../../types"
import { DatePicker } from "../shared/DatePicker"

const PRIORITIES: CardPriority[] = ["low", "medium", "high", "urgent"]

type TableToolbarProps = {
  filters: CardFilters
  columns: Column[]
  availableTags: string[]
  onFiltersChange: (next: Partial<CardFilters>) => void
  onReset: () => void
}

export function TableToolbar({
  filters,
  columns,
  availableTags,
  onFiltersChange,
  onReset,
}: TableToolbarProps) {
  const [tagInput, setTagInput] = useState("")

  function togglePriority(priority: CardPriority): void {
    const exists = filters.priorities.includes(priority)
    onFiltersChange({
      priorities: exists
        ? filters.priorities.filter((p) => p !== priority)
        : [...filters.priorities, priority],
    })
  }

  function applyTagInput(): void {
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    onFiltersChange({ tags })
  }

  function setSort(sortField: SortField): void {
    const isCurrent = filters.sortField === sortField
    const sortDirection: SortDirection = isCurrent
      ? filters.sortDirection === "asc"
        ? "desc"
        : "asc"
      : "asc"
    onFiltersChange({ sortField, sortDirection })
  }

  return (
    <div className="table-toolbar">
      <div className="inline-group">
        <Select
          value={filters.columnIds[0] ?? "__all__"}
          onValueChange={(value) =>
            onFiltersChange({ columnIds: value === "__all__" ? [] : [value] })
          }
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Status</SelectItem>
            {columns.map((column) => (
              <SelectItem key={column.id} value={column.id}>
                {column.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={onReset}>
          Reset
        </Button>
      </div>

      <Input
        type="search"
        value={filters.searchText}
        onChange={(e) => onFiltersChange({ searchText: e.target.value })}
        placeholder="Search title, description, tags"
      />

      <div className="inline-group">
        {PRIORITIES.map((priority) => (
          <Button
            key={priority}
            type="button"
            size="xs"
            variant={
              filters.priorities.includes(priority) ? "default" : "outline"
            }
            onClick={() => togglePriority(priority)}
          >
            {priority}
          </Button>
        ))}
      </div>

      <div className="inline-group grow">
        <Select
          value={filters.dueDateMode}
          onValueChange={(value) =>
            onFiltersChange({
              dueDateMode: value as CardFilters["dueDateMode"],
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Due Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Due Date</SelectItem>
            <SelectItem value="with">Has Due Date</SelectItem>
            <SelectItem value="without">No Due Date</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <DatePicker
          value={filters.dueDateFrom}
          placeholder="Due from"
          title="Due date from"
          onValueChange={(value) => onFiltersChange({ dueDateFrom: value })}
        />
        <DatePicker
          value={filters.dueDateTo}
          placeholder="Due to"
          title="Due date to"
          onValueChange={(value) => onFiltersChange({ dueDateTo: value })}
        />
      </div>

      <div className="inline-group grow">
        <Input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          list="tag-list"
          placeholder="Filter tags: a,b,c"
          onBlur={applyTagInput}
        />
        <datalist id="tag-list">
          {availableTags.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
        <Button type="button" variant="outline" onClick={applyTagInput}>
          Apply Tags
        </Button>
      </div>

      <div className="inline-group">
        <Button
          type="button"
          variant="outline"
          onClick={() => setSort("updatedAt")}
        >
          Sort Updated
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setSort("dueDate")}
        >
          Sort Due
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setSort("priority")}
        >
          Sort Priority
        </Button>
      </div>
    </div>
  )
}
