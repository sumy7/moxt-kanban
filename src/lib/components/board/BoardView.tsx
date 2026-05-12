import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
  rectIntersection,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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

type CardBodyProps = {
  card: Card
  onEditCard: (card: Card) => void
  onDeleteCard: (card: Card) => void
}

function CardBody({ card, onEditCard, onDeleteCard }: CardBodyProps) {
  return (
    <>
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
        {card.dueDate ? <span className="card-due">{card.dueDate}</span> : null}
        <span className={`priority-badge ${priorityClass(card.priority)}`}>
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
    </>
  )
}

type SortableCardProps = CardBodyProps & { isDragOverlay?: boolean }

function SortableCard({ card, onEditCard, onDeleteCard }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      className={`board-card ${priorityClass(card.priority)}${isDragging ? " dragging" : ""}`}
    >
      <CardBody
        card={card}
        onEditCard={onEditCard}
        onDeleteCard={onDeleteCard}
      />
    </div>
  )
}

type ColumnCardsProps = {
  columnId: string
  children: React.ReactNode
}

function ColumnCards({ columnId, children }: ColumnCardsProps) {
  const { setNodeRef } = useDroppable({ id: columnId })
  return (
    <div ref={setNodeRef} className="column-cards">
      {children}
    </div>
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
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [dragItems, setDragItems] = useState<Record<string, string[]> | null>(
    null
  )
  const [overColumnId, setOverColumnId] = useState<string | null>(null)
  const dragItemsRef = useRef<Record<string, string[]> | null>(null)
  const pendingClearRef = useRef(false)

  useEffect(() => {
    if (pendingClearRef.current) {
      pendingClearRef.current = false
      setDragItems(null)
      dragItemsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const columnIdSet = new Set(columns.map((c) => c.id))
  const cardMap = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])
  const activeCard = activeCardId ? (cardMap.get(activeCardId) ?? null) : null

  function buildItemsMap(): Record<string, string[]> {
    const map: Record<string, string[]> = {}
    for (const col of columns) {
      map[col.id] = cards
        .filter((c) => c.columnId === col.id)
        .sort((a, b) => a.order - b.order)
        .map((c) => c.id)
    }
    return map
  }

  function buildCardToColumnMap(items: Record<string, string[]>): Map<string, string> {
    const map = new Map<string, string>()
    for (const [colId, cardIds] of Object.entries(items)) {
      for (const cardId of cardIds) {
        map.set(cardId, colId)
      }
    }
    return map
  }

  const collisionDetection = useCallback<CollisionDetection>(
    (args) => {
      const hits = pointerWithin(args)
      const cardHit = hits.find(({ id }) => !columnIdSet.has(String(id)))
      if (cardHit) return [cardHit]
      const colHit = hits.find(({ id }) => columnIdSet.has(String(id)))
      if (colHit) return [colHit]
      return rectIntersection(args)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns]
  )

  function handleDragStart({ active }: DragStartEvent) {
    setActiveCardId(String(active.id))
    const map = buildItemsMap()
    setDragItems(map)
    dragItemsRef.current = map
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    const current = dragItemsRef.current
    if (!over || !current) {
      setOverColumnId(null)
      return
    }

    const activeId = String(active.id)
    const overId = String(over.id)
    const cardToColumn = buildCardToColumnMap(current)

    if (activeId === overId) return

    const sourceColId = cardToColumn.get(activeId)
    if (!sourceColId) return

    const destColId = columnIdSet.has(overId)
      ? overId
      : cardToColumn.get(overId)
    if (!destColId) return

    setOverColumnId(destColId)

    let next: Record<string, string[]>

    if (sourceColId === destColId) {
      if (columnIdSet.has(overId)) return
      const items = current[sourceColId]
      const fromIndex = items.indexOf(activeId)
      const toIndex = items.indexOf(overId)
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return
      next = { ...current, [sourceColId]: arrayMove(items, fromIndex, toIndex) }
    } else {
      const sourceItems = current[sourceColId]
      const targetItems = current[destColId] ?? []
      const sourceIndex = sourceItems.indexOf(activeId)
      if (sourceIndex < 0) return

      let toIndex = targetItems.length
      if (!columnIdSet.has(overId)) {
        const overIndex = targetItems.indexOf(overId)
        toIndex = overIndex < 0 ? targetItems.length : overIndex
      }

      const nextSourceItems = sourceItems.filter((id) => id !== activeId)
      const nextTargetItems = [...targetItems]
      nextTargetItems.splice(toIndex, 0, activeId)

      next = {
        ...current,
        [sourceColId]: nextSourceItems,
        [destColId]: nextTargetItems,
      }
    }

    dragItemsRef.current = next
    setDragItems(next)
  }

  function handleDragEnd({ active }: DragEndEvent) {
    const final = dragItemsRef.current
    if (final) {
      const activeId = String(active.id)
      const destColId = Object.keys(final).find((colId) =>
        final[colId].includes(activeId)
      )
      if (destColId) {
        const toIndex = final[destColId].indexOf(activeId)
        onDrop(activeId, destColId, toIndex < 0 ? 0 : toIndex)
      }
      pendingClearRef.current = true
    } else {
      setDragItems(null)
      dragItemsRef.current = null
    }
    setActiveCardId(null)
    setOverColumnId(null)
  }

  function handleDragCancel() {
    setActiveCardId(null)
    setDragItems(null)
    setOverColumnId(null)
    dragItemsRef.current = null
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
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="board-view">
        {columns.map((column) => {
          const itemIds = dragItems
            ? (dragItems[column.id] ?? [])
            : cards
                .filter((c) => c.columnId === column.id)
                .sort((a, b) => a.order - b.order)
                .map((c) => c.id)

          const colCards = itemIds
            .map((id) => cardMap.get(id))
            .filter((c): c is Card => c != null)

          const isOver = overColumnId === column.id

          return (
            <div
              key={column.id}
              className={`board-column${isOver ? "drop-target" : ""}`}
            >
              <div className="column-header">
                <span className="column-title">{column.title}</span>
                <span className="column-count">{colCards.length}</span>
              </div>

              <ColumnCards columnId={column.id}>
                <SortableContext
                  items={itemIds}
                  strategy={verticalListSortingStrategy}
                >
                  {colCards.map((card) => (
                    <SortableCard
                      key={card.id}
                      card={card}
                      onEditCard={onEditCard}
                      onDeleteCard={onDeleteCard}
                    />
                  ))}
                </SortableContext>
              </ColumnCards>

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

      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeCard ? (
          <div
            className={`board-card ${priorityClass(activeCard.priority)} drag-overlay`}
          >
            <CardBody
              card={activeCard}
              onEditCard={onEditCard}
              onDeleteCard={onDeleteCard}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
