import { useEffect, useRef, useState } from 'react'

const defaultTtl = 24 * 60 * 60 * 1000
const defaultDebounce = 500

/**
 * Persist form data as a restorable browser draft.
 *
 * @template T
 * @param {string} key Stable localStorage key for this draft.
 * @param {T} data Current form data to persist.
 * @param {object} [options]
 * @param {boolean} [options.clearWhen=false] Remove the draft when this becomes true, usually after a successful submit.
 * @param {number} [options.debounceMs=500] Delay writes until input settles.
 * @param {boolean} [options.enabled=true] Disable automatic draft writes when false.
 * @param {(data: T) => boolean} [options.isEmpty] Return true when data should not be saved.
 * @param {(error: unknown) => void} [options.onError] Called when storage read/write/remove fails.
 * @param {(data: T) => void} [options.onRestore] Called with restored draft data.
 * @param {Storage | (() => Storage)} [options.storage=window.localStorage] Custom storage target.
 * @param {(data: T) => T} [options.transform] Normalize data before saving.
 * @param {number} [options.ttl=86400000] Draft lifetime in milliseconds.
 * @returns {{
 *   clear: () => void,
 *   discard: () => void,
 *   draft: { data: T, expiresAt: number, savedAt: number } | null,
 *   draftSavedAt: Date | null,
 *   hasDraft: boolean,
 *   restore: () => T | null,
 *   save: (data?: T) => ({ data: T, expiresAt: number, savedAt: number } | null)
 * }}
 */
export function useFormDraft(key, data, options = {}) {
  const {
    clearWhen = false,
    debounceMs = defaultDebounce,
    enabled = true,
    isEmpty = isDraftEmpty,
    onError,
    onRestore,
    storage = getDefaultStorage,
    transform = (value) => value,
    ttl = defaultTtl
  } = options

  const dataRef = useRef(data)
  const timeoutRef = useRef()
  const [draft, setDraft] = useState(null)
  const [hasDraft, setHasDraft] = useState(false)

  dataRef.current = data

  useEffect(() => {
    const savedDraft = readDraft(key, { isEmpty, onError, storage })
    setDraft(savedDraft)
    setHasDraft(Boolean(savedDraft))
  }, [key, isEmpty, onError, storage])

  useEffect(() => {
    if (!enabled) return

    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      writeDraft(key, transform(dataRef.current), {
        isEmpty,
        onError,
        storage,
        ttl
      })
    }, debounceMs)

    return () => clearTimeout(timeoutRef.current)
  }, [data, debounceMs, enabled, isEmpty, key, onError, storage, transform, ttl])

  useEffect(() => {
    if (!clearWhen) return

    clearTimeout(timeoutRef.current)
    removeDraft(key, { onError, storage })
    setDraft(null)
    setHasDraft(false)
  }, [clearWhen, key, onError, storage])

  function restore() {
    if (!draft) return null

    onRestore?.(draft.data)
    setHasDraft(false)
    return draft.data
  }

  function discard() {
    clearTimeout(timeoutRef.current)
    removeDraft(key, { onError, storage })
    setDraft(null)
    setHasDraft(false)
  }

  function clear() {
    discard()
  }

  function save(nextData = dataRef.current) {
    const savedDraft = writeDraft(key, transform(nextData), {
      isEmpty,
      onError,
      storage,
      ttl
    })
    setDraft(savedDraft)
    setHasDraft(Boolean(savedDraft))
    return savedDraft
  }

  return {
    clear,
    discard,
    draft,
    draftSavedAt: draft?.savedAt ? new Date(draft.savedAt) : null,
    hasDraft,
    restore,
    save
  }
}

function readDraft(key, options) {
  const { isEmpty, onError, storage } = options
  const store = resolveStorage(storage)
  if (!store) return null

  try {
    const raw = store.getItem(key)
    if (!raw) return null

    const draft = JSON.parse(raw)
    if (!draft || typeof draft !== 'object') {
      removeDraft(key, options)
      return null
    }

    if (draft.expiresAt && draft.expiresAt < Date.now()) {
      removeDraft(key, options)
      return null
    }

    if (isEmpty(draft.data)) return null
    return draft
  } catch (error) {
    onError?.(error)
    removeDraft(key, options)
    return null
  }
}

function writeDraft(key, data, options) {
  const { isEmpty, onError, storage, ttl } = options
  const store = resolveStorage(storage)
  if (!store) return null

  if (isEmpty(data)) {
    removeDraft(key, options)
    return null
  }

  const draft = {
    data,
    expiresAt: Date.now() + ttl,
    savedAt: Date.now()
  }

  try {
    store.setItem(key, JSON.stringify(draft))
    return draft
  } catch (error) {
    onError?.(error)
    return null
  }
}

function removeDraft(key, options) {
  const store = resolveStorage(options.storage)
  if (!store) return

  try {
    store.removeItem(key)
  } catch (error) {
    options.onError?.(error)
  }
}

function resolveStorage(storage) {
  if (typeof window === 'undefined') return null

  try {
    return typeof storage === 'function' ? storage() : storage
  } catch {
    return null
  }
}

function getDefaultStorage() {
  return window.localStorage
}

function isDraftEmpty(value) {
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (typeof value === 'number') return false
  if (typeof value === 'boolean') return value === false
  if (value instanceof Date) return Number.isNaN(value.getTime())
  if (Array.isArray(value)) return value.length === 0

  if (typeof value === 'object') {
    return Object.values(value).every(isDraftEmpty)
  }

  return false
}
