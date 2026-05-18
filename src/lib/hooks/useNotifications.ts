import { useCallback, useRef, useState } from "react"
import { get } from "../stores/store"
import { toastStore } from "../stores/ui"

export function useNotifications() {
  const [errorMessage, setErrorMessage] = useState("")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const parseError = useCallback((error: unknown): string => {
    if (error instanceof Error) return error.message
    return "Unknown error"
  }, [])

  const notifySuccess = useCallback((message: string): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    toastStore.set({ type: "success", message })
    timerRef.current = setTimeout(() => {
      const current = get(toastStore)
      if (current?.type === "success" && current.message === message) {
        toastStore.set(null)
      }
      timerRef.current = null
    }, 2200)
  }, [])

  const notifyError = useCallback((message: string): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    toastStore.set({ type: "error", message })
  }, [])

  const safely = useCallback(
    async (task: () => Promise<void>): Promise<void> => {
      try {
        setErrorMessage("")
        await task()
      } catch (error) {
        notifyError(parseError(error))
      }
    },
    [notifyError, parseError]
  )

  return { errorMessage, parseError, notifySuccess, notifyError, safely }
}
