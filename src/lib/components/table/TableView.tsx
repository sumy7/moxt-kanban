import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
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
import { useMemo } from "react"

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
  const columnMap = useMemo(
    () => new Map(columns.map((col) => [col.id, col.title])),
    [columns]
  )
  const tableCards = useMemo(
    () =>
      cards.map((card) => ({
        ...card,
        column: columnMap.get(card.columnId) ?? "Unknown",
      })),
    [cards, columnMap]
  )

  function getSortIndicator(colId: string): string {
    if (sortField !== colId) return ""
    return sortDirection === "desc" ? "↓" : "↑"
  }

  const tableColumns = useMemo<ColumnDef<(Card & { column: string })>[]>(
    () => [
      {
        accessorKey: "title",
        header: () => (
          <Button variant="ghost" onClick={() => onSort("title")}>
            Title {getSortIndicator("title")}
          </Button>
        ),
        cell: ({ row }) => (
          <div className="max-w-xs">
            <div className="font-medium">{row.original.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {row.original.description || "No description"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "column",
        header: () => (
          <Button variant="ghost" onClick={() => onSort("column")}>
            Status {getSortIndicator("column")}
          </Button>
        ),
      },
      {
        accessorKey: "priority",
        header: () => (
          <Button variant="ghost" onClick={() => onSort("priority")}>
            Priority {getSortIndicator("priority")}
          </Button>
        ),
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.priority === "urgent"
                ? "destructive"
                : row.original.priority === "high"
                  ? "secondary"
                  : "outline"
            }
          >
            {row.original.priority}
          </Badge>
        ),
      },
      {
        accessorKey: "tags",
        header: "Tags",
        cell: ({ row }) => (row.original.tags ?? []).join(", ") || "-",
      },
      {
        accessorKey: "dueDate",
        header: () => (
          <Button variant="ghost" onClick={() => onSort("dueDate")}>
            Due Date {getSortIndicator("dueDate")}
          </Button>
        ),
        cell: ({ row }) => formatDate(row.original.dueDate),
      },
      {
        accessorKey: "updatedAt",
        header: () => (
          <Button variant="ghost" onClick={() => onSort("updatedAt")}>
            Updated {getSortIndicator("updatedAt")}
          </Button>
        ),
        cell: ({ row }) => formatDate(row.original.updatedAt),
      },
      {
        accessorKey: "createdAt",
        header: () => (
          <Button variant="ghost" onClick={() => onSort("createdAt")}>
            Created {getSortIndicator("createdAt")}
          </Button>
        ),
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => onEditCard(row.original)}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="xs"
              variant="destructive"
              onClick={() => onDeleteCard(row.original)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [getSortIndicator, onDeleteCard, onEditCard, onSort]
  )

  const table = useReactTable({
    data: tableCards,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  })

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
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="w-auto">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
  )
}
