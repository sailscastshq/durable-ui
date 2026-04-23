import { computed, isRef, ref, toRaw, unref, watch } from 'vue'

const defaultTtl = 24 * 60 * 60 * 1000
const defaultDebounce = 500

/**
 * Persist form data as a restorable browser draft.
 *
 * `source` may be a ref, reactive object, or getter such as `() => form.data()`.
 *
 * @template T
 * @param {string} key Stable localStorage key for this draft.
 * @param {T | import('vue').Ref<T> | (() => T)} source Current form data source to persist.
 * @param {object} [options]
 * @param {boolean | import('vue').Ref<boolean> | (() => boolean)} [options.clearWhen=false] Remove the draft when this becomes true, usually after a successful submit.
 * @param {number} [options.debounceMs=500] Delay writes until input settles.
 * @param {boolean} [options.enabled=true] Disable automatic draft writes when false.
 * @param {(data: T) => boolean} [options.isEmpty] Return true when data should not be saved.
 * @param {(error: unknown) => void} [options.onError] Called when storage read/write/remove fails.
 * @param {(data: T) => void} [options.restore] Custom restore handler. If omitted, refs and mutable objects are restored directly.
 * @param {Storage | (() => Storage)} [options.storage=window.localStorage] Custom storage target.
 * @param {(data: T) => T} [options.transform] Normalize data before saving.
 * @param {number} [options.ttl=86400000] Draft lifetime in milliseconds.
 * @returns {{
 *   clear: () => void,
 *   discard: () => void,
 *   draft: import('vue').Ref<{ data: T, expiresAt: number, savedAt: number } | null>,
 *   draftSavedAt: import('vue').ComputedRef<Date | null>,
 *   hasDraft: import('vue').Ref<boolean>,
 *   restore: () => T | null,
 *   save: (data?: T) => ({ data: T, expiresAt: number, savedAt: number } | null)
 * }}
 */
export function useFormDraft(key, source, options = {}) {
  const {
    clearWhen = false,
    debounceMs = defaultDebounce,
    enabled = true,
    isEmpty = isDraftEmpty,
    onError,
    restore,
    storage = getDefaultStorage,
    transform = (value) => value,
    ttl = defaultTtl
  } = options

  const draft = ref(null)
  const hasDraft = ref(false)
  const draftSavedAt = computed(() =>
    draft.value?.savedAt ? new Date(draft.value.savedAt) : null
  )
  let timeout

  const savedDraft = readDraft(key, { isEmpty, onError, storage })
  draft.value = savedDraft
  hasDraft.value = Boolean(savedDraft)

  watch(
    () => readSource(source),
    (data) => {
      if (!enabled) return

      clearTimeout(timeout)
      timeout = setTimeout(() => {
        const nextDraft = writeDraft(key, transform(data), {
          isEmpty,
          onError,
          storage,
          ttl
        })
        draft.value = nextDraft
        hasDraft.value = Boolean(nextDraft)
      }, debounceMs)
    },
    { deep: true }
  )

  watch(
    () => readSource(clearWhen),
    (shouldClear) => {
      if (!shouldClear) return

      clearTimeout(timeout)
      removeDraft(key, { onError, storage })
      draft.value = null
      hasDraft.value = false
    }
  )

  function restoreSaved() {
    if (!draft.value) return null

    const data = draft.value.data
    if (restore) {
      restore(data)
    } else {
      writeSource(source, data)
    }

    hasDraft.value = false
    return data
  }

  function discard() {
    clearTimeout(timeout)
    removeDraft(key, { onError, storage })
    draft.value = null
    hasDraft.value = false
  }

  function clear() {
    discard()
  }

  function save(data = readSource(source)) {
    const nextDraft = writeDraft(key, transform(data), {
      isEmpty,
      onError,
      storage,
      ttl
    })
    draft.value = nextDraft
    hasDraft.value = Boolean(nextDraft)
    return nextDraft
  }

  return {
    clear,
    discard,
    draft,
    draftSavedAt,
    hasDraft,
    restore: restoreSaved,
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

function readSource(source) {
  if (typeof source === 'function') return source()
  return toRaw(unref(source))
}

function writeSource(source, data) {
  if (isRef(source)) {
    source.value = data
    return
  }

  if (source && typeof source === 'object') {
    Object.assign(source, data)
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
