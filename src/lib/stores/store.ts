import { createStore, useStore as useZustandStore } from "zustand"
import type { StoreApi } from "zustand"

type ValueStoreState<T> = { value: T }

export type ValueStore<T> = {
  set: (value: T) => void
  get: () => T
  update: (fn: (current: T) => T) => void
}

// WeakMap keeps the zustand store hidden — consumers can only access the
// four documented methods on ValueStore<T>.
const storeRegistry = new WeakMap<
  ValueStore<unknown>,
  StoreApi<ValueStoreState<unknown>>
>()

export function createValueStore<T>(initial: T): ValueStore<T> {
  const zustandStore = createStore<ValueStoreState<T>>()(() => ({
    value: initial,
  }))

  const valueStore: ValueStore<T> = {
    set(value: T) {
      zustandStore.setState({ value })
    },
    get() {
      return zustandStore.getState().value
    },
    update(fn: (current: T) => T) {
      zustandStore.setState({ value: fn(zustandStore.getState().value) })
    },
  }

  storeRegistry.set(
    valueStore as ValueStore<unknown>,
    zustandStore as StoreApi<ValueStoreState<unknown>>,
  )

  return valueStore
}

/** React hook that subscribes to a ValueStore and returns its current value */
export function useStore<T>(valueStore: ValueStore<T>): T {
  const zustandStore = storeRegistry.get(
    valueStore as ValueStore<unknown>,
  ) as StoreApi<ValueStoreState<T>> | undefined
  if (!zustandStore) {
    throw new Error(
      "useStore: the provided store was not created by createValueStore.",
    )
  }
  return useZustandStore(zustandStore, (state) => state.value)
}

/** Read the current value of a store outside of React */
export function get<T>(valueStore: ValueStore<T>): T {
  return valueStore.get()
}
