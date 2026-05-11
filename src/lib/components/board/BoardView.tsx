import { useRef } from "react"
import { Button } from "@/components/ui/button"
import type { Card, Column } from "../../types"
import { EmptyState } from "../shared/EmptyState"

type BoardViewProps = {
  columns: Column[]
  cards: Card[]
  onAddCard: (columnId: string) => void
  onEditCard: (card: Card) => void
  onDeleteCard: (card: Card) => void
  onDrop: (cardId: string, toColumnId: string, toIndex: number) => void
}

type DragRef = {
  cardId: string
  fromColumnId: string
}

function priorityClass(priority: Card["priority"]): string {
  return (
    {
      low: "priority-low",
      medium: "priority-medium",
      high: "priority-high",
      urgent: "priority-urgent",
    }[priority] ?? ""
  )
}

export function BoardView({
  columns,
  cards,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onDrop,
}: BoardViewProps) {
  const dragRef = useRef<DragRef | null>(null)
  const dragOverRef = useRef<{ columnId: string; index: number } | null>(null)

  function handleDragStart(e: React.DragEvent, card: Card): void {
    dragRef.current = { cardId: card.id, fromColumnId: card.columnId }
    e.dataTransfer.effectAllowed = "move"
    ;(e.currentTarget as HTMLElement).classList.add("dragging")
  }

  function handleDragEnd(e: React.DragEvent): void {
    ;(e.currentTarget as HTMLElement).classList.remove("dragging")
    document
      .querySelectorAll(".drop-target")
      .forEach((el) => el.classList.remove("drop-target"))
    dragRef.current = null
    dragOverRef.current = null
  }

  function handleDragOver(
    e: React.DragEvent,
    columnId: string,
    index: number
  ): void {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    dragOverRef.current = { columnId, index }
    const col = (e.currentTarget as HTMLElement).closest(".board-column")
    if (col) {
      document.querySelectorAll(".drop-target").forEach((el) => {
        if (el !== col) el.classList.remove("drop-target")
      })
      col.classList.add("drop-target")
    }
  }

  function handleDrop(
    e: React.DragEvent,
    columnId: string,
    index: number
  ): void {
    e.preventDefault()
    const drag = dragRef.current
    if (!drag) return
    onDrop(drag.cardId, columnId, index)
    document
      .querySelectorAll(".drop-target")
      .forEach((el) => el.classList.remove("drop-target"))
    dragRef.current = null
    dragOverRef.current = null
  }

  if (columns.length === 0) {
    return (
      <EmptyState
        title="No columns yet"
        description="Create a column to start organizing cards."
      />
    )
  }

  return (
    <div className="board-view">
      {columns.map((column) => {
        const colCards = cards
          .filter((c) => c.columnId === column.id)
          .sort((a, b) => a.order - b.order)

        return (
          <div
            key={column.id}
            className="board-column"
            onDragOver={(e) => handleDragOver(e, column.id, colCards.length)}
            onDrop={(e) => handleDrop(e, column.id, colCards.length)}
          >
            <div className="column-header">
              <span className="column-title">{column.title}</span>
              <span className="column-count">{colCards.length}</span>
            </div>

            <div className="column-cards">
              {colCards.map((card, idx) => (
                <div
                  key={card.id}
                  className={`board-card ${priorityClass(card.priority)}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, card)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => {
                    e.stopPropagation()
                    handleDragOver(e, column.id, idx)
                  }}
                  onDrop={(e) => {
                    e.stopPropagation()
                    handleDrop(e, column.id, idx)
                  }}
                >
                  <div className="card-title">{card.title}</div>
                  {card.description ? (
                    <div className="card-desc">{card.description}</div>
                  ) : null}
                  {card.tags.length > 0 ? (
                    <div className="card-tags">
                      {card.tags.map((tag) => (
                        <span key={tag} className="chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="card-footer">
                    {card.dueDate ? (
                      <span className="card-due">{card.dueDate}</span>
                    ) : null}
                    <span
                      className={`priority-badge ${priorityClass(card.priority)}`}
                    >
                      {card.priority}
                    </span>
                    <div className="card-actions">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => onEditCard(card)}
                        title="Edit card"
                      >
                        ✎
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => onDeleteCard(card)}
                        title="Delete card"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="add-card-btn w-full"
              onClick={() => onAddCard(column.id)}
            >
              + Add Card
            </Button>
          </div>
        )
      })}
    </div>
  )
}
