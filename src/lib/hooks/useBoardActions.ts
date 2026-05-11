import { useCallback, useState } from "react"
import { boardService } from "../services/boardService"
import { activeBoardIdStore } from "../stores/boards"
import type { Board } from "../types"

type Deps = {
  reloadBoards: (selectFirst?: boolean) => Promise<void>
  notifySuccess: (message: string) => void
  safely: (task: () => Promise<void>) => Promise<void>
  requestConfirm: (
    title: string,
    message: string,
    action: () => Promise<void>
  ) => void
}

export function useBoardActions({
  reloadBoards,
  notifySuccess,
  safely,
  requestConfirm,
}: Deps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState("")

  const openCreate = useCallback((): void => {
    setEditingId(null)
    setNameInput("")
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((board: Board): void => {
    setEditingId(board.id)
    setNameInput(board.name)
    setModalOpen(true)
  }, [])

  const closeModal = useCallback((): void => {
    setModalOpen(false)
  }, [])

  const submit = useCallback(
    async (
      currentName: string,
      currentEditingId: string | null
    ): Promise<void> => {
      await safely(async () => {
        if (currentEditingId) {
          await boardService.rename(currentEditingId, currentName)
          notifySuccess("Board updated.")
        } else {
          const created = await boardService.create(currentName)
          activeBoardIdStore.set(created.id)
          notifySuccess("Board created.")
        }
        setModalOpen(false)
        await reloadBoards(false)
      })
    },
    [safely, notifySuccess, reloadBoards]
  )

  const requestDelete = useCallback(
    (board: Board): void => {
      requestConfirm(
        "Delete board",
        `Delete ${board.name}? All its columns and cards will also be deleted.`,
        async () => {
          await boardService.remove(board.id)
          await reloadBoards(true)
          notifySuccess("Board deleted.")
        }
      )
    },
    [requestConfirm, reloadBoards, notifySuccess]
  )

  return {
    modalOpen,
    editingId,
    nameInput,
    setNameInput,
    openCreate,
    openEdit,
    closeModal,
    submit,
    requestDelete,
  }
}
