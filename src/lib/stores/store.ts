import { useEffect, useState } from "react"

export interface Store<T> {
  get(): T
  set(value: T): void
  update(fn: (current: T) => T): void
  subscribe(listener: (value: T) => void): () => void
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial
  const listeners = new Set<(v: T) => void>()

  return {
    get() {
      return value
    },
    set(next) {
      value = next
      listeners.forEach((l) => l(next))
    },
    update(fn) {
      const next = fn(value)
      value = next
      listeners.forEach((l) => l(next))
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export function get<T>(store: Store<T>): T {
  return store.get()
}

export function useStore<T>(store: Store<T>): T {
  const [state, setState] = useState(() => store.get())
  useEffect(() => store.subscribe(setState), [store])
  return state
}
