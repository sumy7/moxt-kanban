import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Card, Column, SortDirection, SortField } from "../../types"
import { EmptyState } from "../shared/EmptyState"
import { formatDate } from "../../utils/date"

interface ColumnHeader {
  id: string
  label: string
  sortable: boolean
}

const COLUMN_HEADERS: ColumnHeader[] = [
  { id: "title", label: "Title", sortable: true },
  { id: "column", label: "Status", sortable: true },
  { id: "priority", label: "Priority", sortable: true },
  { id: "tags", label: "Tags", sortable: false },
  { id: "dueDate", label: "Due Date", sortable: true },
  { id: "updatedAt", label: "Updated", sortable: true },
  { id: "createdAt", label: "Created", sortable: true },
]

type TableViewProps = {
  cards: Card[]
  columns: Column[]
  sortField: SortField
  sortDirection: SortDirection
  onSort: (field: SortField) => void
  onEditCard: (card: Card) => void
  onDeleteCard: (card: Card) => void
}

export function TableView({
  cards,
  columns,
  sortField,
  sortDirection,
  onSort,
  onEditCard,
  onDeleteCard,
}: TableViewProps) {
  const columnMap = new Map(columns.map((col) => [col.id, col.title]))

  function getSortIndicator(colId: string): string {
    if (sortField !== colId) return ""
    return sortDirection === "desc" ? "↓" : "↑"
  }

  if (cards.length === 0) {
    return (
      <EmptyState
        title="No matching cards"
        description="Try changing search or filters."
      />
    )
  }

  return (
    <div className="table-wrap">
      <Table className="w-full border bg-card">
        <TableHeader>
          <TableRow>
            {COLUMN_HEADERS.map((header) => (
              <TableHead
                key={header.id}
                className={
                  header.sortable
                    ? "cursor-pointer select-none hover:bg-muted/50"
                    : ""
                }
                onClick={() =>
                  header.sortable && onSort(header.id as SortField)
                }
              >
                <div className="flex items-center gap-1">
                  <span>{header.label}</span>
                  {header.sortable && getSortIndicator(header.id) ? (
                    <span className="text-xs">
                      {getSortIndicator(header.id)}
                    </span>
                  ) : null}
                </div>
              </TableHead>
            ))}
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.map((card) => (
            <TableRow key={card.id}>
              <TableCell className="max-w-xs">
                <div className="font-medium">{card.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {card.description || "No description"}
                </div>
              </TableCell>
              <TableCell>{columnMap.get(card.columnId) ?? "Unknown"}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    card.priority === "urgent"
                      ? "destructive"
                      : card.priority === "high"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {card.priority}
                </Badge>
              </TableCell>
              <TableCell>{(card.tags ?? []).join(", ") || "-"}</TableCell>
              <TableCell>{formatDate(card.dueDate)}</TableCell>
              <TableCell>{formatDate(card.updatedAt)}</TableCell>
              <TableCell>{formatDate(card.createdAt)}</TableCell>
              <TableCell className="w-24">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => onEditCard(card)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="destructive"
                    onClick={() => onDeleteCard(card)}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
