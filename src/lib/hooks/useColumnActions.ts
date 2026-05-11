import { useCallback, useState } from "react"
import { columnService } from "../services/columnService"
import { activeBoardIdStore } from "../stores/boards"
import { columnsStore } from "../stores/columns"
import { get } from "../stores/store"
import type { Column } from "../types"

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

export function useColumnActions({
  loadBoardData,
  notifySuccess,
  safely,
  requestConfirm,
}: Deps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [titleInput, setTitleInput] = useState("")

  const openCreate = useCallback((): void => {
    if (!get(activeBoardIdStore)) return
    setEditingId(null)
    setTitleInput("")
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((column: Column): void => {
    setEditingId(column.id)
    setTitleInput(column.title)
    setModalOpen(true)
  }, [])

  const closeModal = useCallback((): void => {
    setModalOpen(false)
  }, [])

  const submit = useCallback(
    async (
      currentTitle: string,
      currentEditingId: string | null
    ): Promise<void> => {
      await safely(async () => {
        const boardId = get(activeBoardIdStore)
        if (!boardId) return

        if (currentEditingId) {
          await columnService.rename(currentEditingId, currentTitle)
          notifySuccess("Column updated.")
        } else {
          await columnService.create(boardId, currentTitle)
          notifySuccess("Column created.")
        }
        setModalOpen(false)
        await loadBoardData(boardId)
      })
    },
    [safely, notifySuccess, loadBoardData]
  )

  const requestDelete = useCallback(
    (column: Column): void => {
      requestConfirm(
        "Delete column",
        `Delete ${column.title}? All cards in this column will be removed.`,
        async () => {
          await columnService.remove(column.id)
          const boardId = get(activeBoardIdStore)
          if (boardId) await loadBoardData(boardId)
          notifySuccess("Column deleted.")
        }
      )
    },
    [requestConfirm, loadBoardData, notifySuccess]
  )

  const move = useCallback(
    async (column: Column, direction: "left" | "right"): Promise<void> => {
      await safely(async () => {
        const boardId = get(activeBoardIdStore)
        if (!boardId) return

        const sorted = [...get(columnsStore)].sort((a, b) => a.order - b.order)
        const index = sorted.findIndex((c) => c.id === column.id)
        const nextIndex = direction === "left" ? index - 1 : index + 1
        if (index < 0 || nextIndex < 0 || nextIndex >= sorted.length) return

        const [moved] = sorted.splice(index, 1)
        sorted.splice(nextIndex, 0, moved)
        await columnService.reorder(
          boardId,
          sorted.map((c) => c.id)
        )
        await loadBoardData(boardId)
      })
    },
    [safely, loadBoardData]
  )

  return {
    modalOpen,
    editingId,
    titleInput,
    setTitleInput,
    openCreate,
    openEdit,
    closeModal,
    submit,
    requestDelete,
    move,
  }
}
