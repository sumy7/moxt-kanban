import { createStore, useStore as useZustandStore } from "zustand"
import type { StoreApi } from "zustand"

type ValueStoreState<T> = { value: T }

export type ValueStore<T> = {
  set: (value: T) => void
  get: () => T
  update: (fn: (current: T) => T) => void
  /** Internal zustand store — used by useStore hook */
  _store: StoreApi<ValueStoreState<T>>
}

export function createValueStore<T>(initial: T): ValueStore<T> {
  const store = createStore<ValueStoreState<T>>()(() => ({ value: initial }))

  return {
    set(value: T) {
      store.setState({ value })
    },
    get() {
      return store.getState().value
    },
    update(fn: (current: T) => T) {
      store.setState({ value: fn(store.getState().value) })
    },
    _store: store,
  }
}

/** React hook that subscribes to a ValueStore and returns its current value */
export function useStore<T>(valueStore: ValueStore<T>): T {
  return useZustandStore(valueStore._store, (state) => state.value)
}

/** Read the current value of a store outside of React */
export function get<T>(valueStore: ValueStore<T>): T {
  return valueStore.get()
}
