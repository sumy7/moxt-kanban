import { useState, useCallback, useRef, useMemo } from "react"
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
  const dragCardToColumnRef = useRef<Map<string, string> | null>(null)
  // Set in handleDragStart and never mutated during drag — used to detect true
  // within-original-column moves so we can skip redundant state updates (Bug 2/4).
  const originalColIdRef = useRef<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const columnIdSet = useMemo(
    () => new Set(columns.map((c) => c.id)),
    [columns]
  )
  // Shared card lookup for render loop and drag overlay.
  const cardMap = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])
  const activeCard = activeCardId ? (cardMap.get(activeCardId) ?? null) : null

  // Memoised per-column id arrays. Deliberately excludes `overColumnId` so that
  // highlight-only re-renders do NOT produce new array references for SortableContext —
  // preventing the measureRects layoutEffect loop (Bug 2).
  const itemsPerColumn = useMemo((): Record<string, string[]> => {
    if (dragItems) return dragItems
    const map: Record<string, string[]> = {}
    for (const col of columns) {
      map[col.id] = cards
        .filter((c) => c.columnId === col.id)
        .sort((a, b) => a.order - b.order)
        .map((c) => c.id)
    }
    return map
  }, [dragItems, cards, columns])

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

  function buildCardToColumnMap(
    items: Record<string, string[]>
  ): Map<string, string> {
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
    [columnIdSet]
  )

  function handleDragStart({ active }: DragStartEvent) {
    const activeId = String(active.id)
    const map = buildItemsMap()
    const c2c = buildCardToColumnMap(map)
    setActiveCardId(activeId)
    setDragItems(map)
    dragItemsRef.current = map
    dragCardToColumnRef.current = c2c
    originalColIdRef.current = c2c.get(activeId) ?? null
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    const current = dragItemsRef.current
    const cardToColumn = dragCardToColumnRef.current
    if (!over || !current || !cardToColumn) {
      setOverColumnId(null)
      return
    }

    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    const currentColId = cardToColumn.get(activeId)
    if (!currentColId) return

    const destColId = columnIdSet.has(overId)
      ? overId
      : cardToColumn.get(overId)
    if (!destColId) return

    setOverColumnId(destColId)

    // Skip all within-current-column hovers: useSortable's CSS transforms already
    // handle the visual reordering, so calling setDragItems here would give
    // SortableContext a new items array reference → measureRects layoutEffect →
    // another onDragOver → setDragItems → infinite loop, regardless of which
    // column the card is currently in. This applies to the original column AND
    // any column the card has been moved into via a cross-column dragOver.
    if (currentColId === destColId) {
      return
    }

    // ── Cross-column move (or reordering inside destination after a cross-column) ──

    const sourceItems = current[currentColId] ?? []
    // Remove activeId from the destination array first so indexOf gives the
    // correct slot without an off-by-one shift (Bugs 3, 5).
    const targetWithoutActive = (current[destColId] ?? []).filter(
      (id) => id !== activeId
    )

    let toIndex: number
    if (columnIdSet.has(overId)) {
      // Hovering over the column container itself (empty column) → append (Bug 4).
      toIndex = targetWithoutActive.length
    } else {
      const overIndex = targetWithoutActive.indexOf(overId)
      toIndex = overIndex < 0 ? targetWithoutActive.length : overIndex
      // Pointer-half heuristic: insert before/after the hovered card based on
      // whether the pointer is in the top or bottom half. This stabilises the
      // result so the same pointer position always yields the same slot (Bugs 3, 5).
      if (overIndex >= 0 && active.rect.current.translated != null) {
        const isBelowCenter =
          active.rect.current.translated.top >
          over.rect.top + over.rect.height / 2
        toIndex = overIndex + (isBelowCenter ? 1 : 0)
      }
    }

    const nextSourceItems = sourceItems.filter((id) => id !== activeId)
    const nextTargetItems = [...targetWithoutActive]
    nextTargetItems.splice(toIndex, 0, activeId)

    const next: Record<string, string[]> = {
      ...current,
      [currentColId]: nextSourceItems,
      [destColId]: nextTargetItems,
    }
    dragItemsRef.current = next
    setDragItems(next)
    dragCardToColumnRef.current = buildCardToColumnMap(next)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const final = dragItemsRef.current
    const originalColId = originalColIdRef.current

    if (final && originalColId && over) {
      const activeId = String(active.id)
      const overId = String(over.id)
      const c2c = dragCardToColumnRef.current

      // Determine the column the active card is currently tracked in.
      const currentColId = c2c?.get(activeId) ?? null

      // Determine destination column from what was under the pointer at release.
      // Prefer the over-item's column; fall back to currentColId if over is the
      // active card itself (released without moving off it).
      const destColId = columnIdSet.has(overId)
        ? overId
        : overId !== activeId
          ? (c2c?.get(overId) ?? currentColId)
          : currentColId

      if (destColId && currentColId) {
        // Compute the final insertion index using the same pointer-half logic as
        // handleDragOver. This handles all cases:
        //   • Within-original-column: dragItems was never updated for same-column
        //     hovers, so CSS transforms determined the visual position; we derive
        //     the final index from over.id.
        //   • Within-non-original-column: card entered this column via a
        //     cross-column dragOver; subsequent within-column hovers were skipped,
        //     so we must compute from over.id here rather than from the stale
        //     snapshot position in final[destColId].
        //   • Cross-column: same formula, snapshot already correct.
        const colItems = final[destColId] ?? []
        const withoutActive = colItems.filter((id) => id !== activeId)

        let toIndex: number
        if (columnIdSet.has(overId)) {
          // Released on the column container → append.
          toIndex = withoutActive.length
        } else if (overId === activeId) {
          // Released exactly on itself without moving → preserve current position.
          const snapshotPos = colItems.indexOf(activeId)
          toIndex = snapshotPos >= 0 ? snapshotPos : 0
        } else {
          const overIndex = withoutActive.indexOf(overId)
          if (overIndex < 0) {
            // over is in a different column (shouldn't normally happen) → fallback.
            const snapshotPos = colItems.indexOf(activeId)
            toIndex = snapshotPos >= 0 ? snapshotPos : 0
          } else {
            toIndex = overIndex
            if (active.rect.current.translated != null) {
              const isBelowCenter =
                active.rect.current.translated.top >
                over.rect.top + over.rect.height / 2
              toIndex = overIndex + (isBelowCenter ? 1 : 0)
            }
          }
        }

        // For a pure within-original-column drop, skip the call when the card
        // ended up at the same index it started from (no effective reorder).
        const isPureWithinOriginal =
          destColId === originalColId && currentColId === originalColId
        if (isPureWithinOriginal) {
          const fromIndex = colItems.indexOf(activeId)
          if (fromIndex !== toIndex) {
            onDrop(activeId, destColId, toIndex)
          }
        } else {
          onDrop(activeId, destColId, toIndex)
        }
      }
    }
    // If over is null (released outside all droppables) → no onDrop, visual reverts.

    // Clear drag state. With the optimistic update in drop(), the cards prop
    // already reflects the new order by the time this clears dragItems, so
    // there is no snap-back flash (Bug 1).
    setDragItems(null)
    dragItemsRef.current = null
    dragCardToColumnRef.current = null
    originalColIdRef.current = null
    setActiveCardId(null)
    setOverColumnId(null)
  }

  function handleDragCancel() {
    setActiveCardId(null)
    setDragItems(null)
    setOverColumnId(null)
    dragItemsRef.current = null
    dragCardToColumnRef.current = null
    originalColIdRef.current = null
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
          // itemsPerColumn is memoised on [dragItems, cards, columns] so changing
          // overColumnId (highlight-only re-render) does not produce new array
          // references for SortableContext (Bug 2).
          const itemIds = itemsPerColumn[column.id] ?? []
          const colCards = itemIds
            .map((id) => cardMap.get(id))
            .filter((c): c is Card => c != null)

          const isOver = overColumnId === column.id

          return (
            <div
              key={column.id}
              className={`board-column${isOver ? " drop-target" : ""}`}
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
