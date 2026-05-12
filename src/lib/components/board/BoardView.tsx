import { useState, useCallback, useRef, useEffect } from "react"
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
  isOver: boolean
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
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  // localItems: col.id -> ordered card ids; null when not dragging
  const [localItems, setLocalItems] = useState<Record<string, string[]> | null>(
    null
  )
  // Track the column the active card is over for border highlight
  const [overColumnId, setOverColumnId] = useState<string | null>(null)
  // Stable ref to avoid stale closures in callbacks
  const localItemsRef = useRef<Record<string, string[]> | null>(null)
  // When true, clear localItems on next cards-prop change (after async onDrop resolves)
  const pendingClearRef = useRef(false)

  // Once the parent cards prop reflects the committed drop, clear the local snapshot
  // so we stop overriding the source-of-truth.
  useEffect(() => {
    if (pendingClearRef.current) {
      pendingClearRef.current = false
      setLocalItems(null)
      localItemsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const columnIdSet = new Set(columns.map((c) => c.id))

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

  // Prefer card hits over column hits; fall back to rect intersection
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
    setActiveCard(cards.find((c) => c.id === active.id) ?? null)
    const map = buildItemsMap()
    setLocalItems(map)
    localItemsRef.current = map
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    const current = localItemsRef.current
    if (!over || !current) {
      setOverColumnId(null)
      return
    }

    const activeId = String(active.id)
    const overId = String(over.id)

    // Update over-column highlight
    if (columnIdSet.has(overId)) {
      setOverColumnId(overId)
    } else {
      const destCol = Object.keys(current).find((colId) =>
        current[colId].includes(overId)
      )
      setOverColumnId(destCol ?? null)
    }

    if (activeId === overId) return

    // Find source column
    const sourceColId = Object.keys(current).find((colId) =>
      current[colId].includes(activeId)
    )
    if (!sourceColId) return

    // Find destination column and index
    let destColId: string
    let destIndex: number

    if (columnIdSet.has(overId)) {
      destColId = overId
      destIndex = current[destColId]?.length ?? 0
    } else {
      destColId =
        Object.keys(current).find((colId) => current[colId].includes(overId)) ??
        sourceColId
      destIndex = current[destColId]?.indexOf(overId) ?? 0
      if (destIndex < 0) destIndex = 0
    }

    let next: Record<string, string[]>

    if (sourceColId === destColId) {
      // Reorder within same column
      const items = [...current[sourceColId]]
      const fromIndex = items.indexOf(activeId)
      if (fromIndex === -1) return
      const adjustedDestIndex =
        destIndex > fromIndex ? Math.max(destIndex - 1, 0) : destIndex
      if (fromIndex === adjustedDestIndex) return
      items.splice(fromIndex, 1)
      items.splice(adjustedDestIndex, 0, activeId)
      next = { ...current, [sourceColId]: items }
    } else {
      // Move to a different column
      const sourceItems = current[sourceColId].filter((id) => id !== activeId)
      const destItems = [...(current[destColId] ?? [])]
      destItems.splice(destIndex, 0, activeId)
      next = { ...current, [sourceColId]: sourceItems, [destColId]: destItems }
    }

    localItemsRef.current = next
    setLocalItems(next)
  }

  function handleDragEnd({ active }: DragEndEvent) {
    const final = localItemsRef.current
    if (final) {
      const activeId = String(active.id)
      const destColId = Object.keys(final).find((colId) =>
        final[colId].includes(activeId)
      )
      if (destColId) {
        const toIndex = final[destColId].indexOf(activeId)
        onDrop(activeId, destColId, toIndex < 0 ? 0 : toIndex)
      }
      // Keep localItems showing the final layout until cards prop catches up.
      // The useEffect on `cards` will clear it once the async update lands.
      pendingClearRef.current = true
    } else {
      setLocalItems(null)
      localItemsRef.current = null
    }
    setActiveCard(null)
    setOverColumnId(null)
  }

  function handleDragCancel() {
    setActiveCard(null)
    setLocalItems(null)
    setOverColumnId(null)
    localItemsRef.current = null
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
          // During drag use localItems order; otherwise derive from cards prop
          const itemIds = localItems
            ? (localItems[column.id] ?? [])
            : cards
                .filter((c) => c.columnId === column.id)
                .sort((a, b) => a.order - b.order)
                .map((c) => c.id)

          // Map IDs back to card objects (excluding the dragging card from count)
          const cardMap = new Map(cards.map((c) => [c.id, c]))
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

              <ColumnCards columnId={column.id} isOver={isOver}>
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
