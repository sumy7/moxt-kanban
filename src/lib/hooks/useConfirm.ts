import { useCallback, useState } from "react"

type ConfirmState = {
  open: boolean
  title: string
  message: string
  action: (() => Promise<void>) | null
}

const CLOSED: ConfirmState = {
  open: false,
  title: "",
  message: "",
  action: null,
}

export function useConfirm(
  safely: (task: () => Promise<void>) => Promise<void>
) {
  const [state, setState] = useState<ConfirmState>(CLOSED)

  const request = useCallback(
    (title: string, message: string, action: () => Promise<void>): void => {
      setState({ open: true, title, message, action })
    },
    []
  )

  const confirm = useCallback(
    async (currentAction: (() => Promise<void>) | null): Promise<void> => {
      if (!currentAction) return
      await safely(async () => {
        await currentAction()
        setState(CLOSED)
      })
    },
    [safely]
  )

  const cancel = useCallback((): void => {
    setState(CLOSED)
  }, [])

  return { state, request, confirm, cancel }
}
