import { useCallback, useSyncExternalStore } from 'react'

const queryStateEvent = 'durable-ui:query-state-change'

/**
 * Sync one URL query parameter with React state.
 *
 * @param {string} key Query parameter to read and write.
 * @param {string | null} [defaultValue=null] Value returned when the parameter is missing.
 * @param {object} [options]
 * @param {'push' | 'replace'} [options.history='push'] Whether updates create a history entry or replace the current one.
 * @returns {[string | null, (nextValue: string | null | ((previousValue: string | null) => string | null)) => void]}
 */
export function useQueryState(key, defaultValue = null, options = {}) {
  const { history = 'push' } = options

  const subscribe = useCallback((onStoreChange) => {
    if (typeof window === 'undefined') return () => {}

    window.addEventListener('popstate', onStoreChange)
    window.addEventListener(queryStateEvent, onStoreChange)

    return () => {
      window.removeEventListener('popstate', onStoreChange)
      window.removeEventListener(queryStateEvent, onStoreChange)
    }
  }, [])

  const getSnapshot = useCallback(
    () => readQueryState(key, defaultValue),
    [defaultValue, key]
  )

  const value = useSyncExternalStore(subscribe, getSnapshot, () => defaultValue)

  const setValue = useCallback(
    (nextValue) => {
      const resolvedValue =
        typeof nextValue === 'function'
          ? nextValue(readQueryState(key, defaultValue))
          : nextValue

      updateQueryState(key, resolvedValue, { defaultValue, history })
    },
    [defaultValue, history, key]
  )

  return [value, setValue]
}

function readQueryState(key, defaultValue) {
  if (typeof window === 'undefined') return defaultValue

  const params = new URLSearchParams(window.location.search)
  const value = params.get(key)

  if (value == null || value === '') return defaultValue
  return value
}

function updateQueryState(key, value, options) {
  if (typeof window === 'undefined') return false

  const url = new URL(window.location.href)
  const previousUrl = url.toString()
  const normalizedValue = normalizeQueryValue(value, options.defaultValue)

  if (normalizedValue == null) {
    url.searchParams.delete(key)
  } else {
    url.searchParams.set(key, normalizedValue)
  }

  const nextUrl = url.toString()
  if (nextUrl === previousUrl) return false

  const method = resolveHistoryMethod(options.history)
  window.history[method](window.history.state, '', nextUrl)
  window.dispatchEvent(new Event(queryStateEvent))
  return true
}

function normalizeQueryValue(value, defaultValue) {
  if (value == null) return null

  const normalizedValue = String(value)
  if (normalizedValue === '') return null

  if (defaultValue != null && normalizedValue === String(defaultValue)) {
    return null
  }

  return normalizedValue
}

function resolveHistoryMethod(history) {
  return history === 'replace' ? 'replaceState' : 'pushState'
}
