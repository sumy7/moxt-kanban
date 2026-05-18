import { createValueStore } from "./store"

type Toast = {
  type: "success" | "error"
  message: string
}

export const toastStore = createValueStore<Toast | null>(null)
