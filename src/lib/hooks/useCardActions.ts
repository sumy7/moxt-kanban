import { useCallback, useState } from "react"
import {
  cardService,
  normalizeCardUpdate,
  type CardInput,
  type CardUpdate,
} from "../services/cardService"
import { activeBoardIdStore } from "../stores/boards"
import { cardsStore } from "../stores/cards"
import { get } from "../stores/store"
import type { Card, CardPriority } from "../types"
import { nowIso } from "../utils/date"

export type CardEditorState = {
  open: boolean
  editingCardId: string | null
  boardId: string
  columnId: string
  title: string
  description: string
  priority: CardPriority
  tagsText: string
  dueDate: string
}

const DEFAULT_EDITOR: CardEditorState = {
  open: false,
  editingCardId: null,
  boardId: "",
  columnId: "",
  title: "",
  description: "",
  priority: "medium",
  tagsText: "",
  dueDate: "",
}

type Deps = {
  loadBoardData: (boardId: string) => Promise<void>
  notifySuccess: (message: string) => void
  safely: (task: () => Promise<void>) => Promise<void>
  requestConfirm: (
    title: string,
    message: string,
    action: () => Promise<void>
  ) => void
}

function buildOptimisticUpdatedCards(
  cards: Card[],
  cardId: string,
  update: CardUpdate
): Card[] {
  const current = cards.find((c) => c.id === cardId)
  if (!current)
    throw new Error(`Optimistic update error: card not found with id ${cardId}`)

  const normalized = normalizeCardUpdate(update)
  const now = nowIso()
  const nextCard: Card = {
    ...current,
    title: normalized.title,
    description: normalized.description,
    priority: normalized.priority,
    tags: normalized.tags,
    dueDate: normalized.dueDate,
    updatedAt: now,
  }

  if (current.columnId === normalized.columnId) {
    return cards.map((c) => (c.id === cardId ? nextCard : c))
  }

  const remaining = cards.filter((c) => c.id !== cardId)
  const sourceReordered = new Map(
    remaining
      .filter((c) => c.columnId === current.columnId)
      .sort((a, b) => a.order - b.order)
      .map((c, i) => [c.id, { ...c, order: i + 1, updatedAt: now }])
  )
  const targetMaxOrder = remaining
    .filter((c) => c.columnId === normalized.columnId)
    .reduce((max, c) => Math.max(max, c.order), 0)

  return [
    ...remaining.map((c) => sourceReordered.get(c.id) ?? c),
    { ...nextCard, columnId: normalized.columnId, order: targetMaxOrder + 1 },
  ]
}

export function useCardActions({
  loadBoardData,
  notifySuccess,
  safely,
  requestConfirm,
}: Deps) {
  const [editor, setEditor] = useState<CardEditorState>({ ...DEFAULT_EDITOR })

  const openCreate = useCallback((columnId: string): void => {
    const boardId = get(activeBoardIdStore)
    if (!boardId) return
    setEditor({ ...DEFAULT_EDITOR, open: true, boardId, columnId })
  }, [])

  const openEdit = useCallback((card: Card): void => {
    setEditor({
      open: true,
      editingCardId: card.id,
      boardId: card.boardId,
      columnId: card.columnId,
      title: card.title,
      description: card.description,
      priority: card.priority,
      tagsText: card.tags.join(", "),
      dueDate: card.dueDate ?? "",
    })
  }, [])

  const submit = useCallback(
    async (currentEditor: CardEditorState): Promise<void> => {
      await safely(async () => {
        let shouldReloadBoardData = false
        const tags = currentEditor.tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)

        if (currentEditor.editingCardId) {
          const update: CardUpdate = {
            title: currentEditor.title,
            description: currentEditor.description,
            priority: currentEditor.priority,
            tags,
            dueDate: currentEditor.dueDate || null,
            columnId: currentEditor.columnId,
          }

          const currentCards = get(cardsStore)
          cardsStore.set(
            buildOptimisticUpdatedCards(
              currentCards,
              currentEditor.editingCardId,
              update
            )
          )
          setEditor((prev) => ({ ...prev, open: false }))

          try {
            await cardService.update(currentEditor.editingCardId, update)
            notifySuccess("Card updated.")
          } catch (error) {
            const boardId = get(activeBoardIdStore)
            if (boardId) await loadBoardData(boardId)
            setEditor((prev) => ({ ...prev, open: true }))
            throw error
          }
        } else {
          const input: CardInput = {
            boardId: currentEditor.boardId,
            columnId: currentEditor.columnId,
            title: currentEditor.title,
            description: currentEditor.description,
            priority: currentEditor.priority,
            tags,
            dueDate: currentEditor.dueDate || null,
          }
          await cardService.create(input)
          shouldReloadBoardData = true
          notifySuccess("Card created.")
        }

        setEditor((prev) => ({ ...prev, open: false }))
        if (shouldReloadBoardData) {
          const boardId = get(activeBoardIdStore)
          if (boardId) await loadBoardData(boardId)
        }
      })
    },
    [safely, notifySuccess, loadBoardData]
  )

  const requestDelete = useCallback(
    (card: Card): void => {
      requestConfirm("Delete card", `Delete card ${card.title}?`, async () => {
        await cardService.remove(card.id)
        const boardId = get(activeBoardIdStore)
        if (boardId) await loadBoardData(boardId)
        notifySuccess("Card deleted.")
      })
    },
    [requestConfirm, loadBoardData, notifySuccess]
  )

  const drop = useCallback(
    async (
      cardId: string,
      toColumnId: string,
      toIndex: number
    ): Promise<void> => {
      await safely(async () => {
        await cardService.move(cardId, toColumnId, toIndex)
        const boardId = get(activeBoardIdStore)
        if (boardId) await loadBoardData(boardId)
      })
    },
    [safely, loadBoardData]
  )

  return {
    editor,
    setEditor,
    openCreate,
    openEdit,
    submit,
    requestDelete,
    drop,
  }
}
