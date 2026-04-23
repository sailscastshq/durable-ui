import { useEffect, useRef, useState } from 'react'

const defaultTtl = 7 * 24 * 60 * 60 * 1000
const defaultDebounce = 500

/**
 * Persist progress for a multi-step form or onboarding flow.
 *
 * @template {Record<string, object>} TSteps
 * @param {string} key Stable localStorage key for this wizard.
 * @param {TSteps} stepDefaults Default data for each step, keyed by step name.
 * @param {object} [options]
 * @param {boolean} [options.clearWhen=false] Remove the wizard draft when this becomes true, usually after final submit.
 * @param {number} [options.debounceMs=500] Delay writes until step data settles.
 * @param {boolean} [options.enabled=true] Disable automatic wizard writes when false.
 * @param {(error: unknown) => void} [options.onError] Called when storage read/write/remove fails.
 * @param {boolean} [options.restoreOnMount=true] Restore saved wizard progress immediately when found.
 * @param {Storage | (() => Storage)} [options.storage=window.localStorage] Custom storage target.
 * @param {number} [options.ttl=604800000] Wizard draft lifetime in milliseconds.
 * @returns {{
 *   allData: object,
 *   canGoBack: boolean,
 *   canGoNext: boolean,
 *   clear: () => void,
 *   currentStep: number,
 *   currentStepKey: string,
 *   discard: () => void,
 *   draft: { currentStep: number, expiresAt: number, savedAt: number, steps: TSteps } | null,
 *   draftSavedAt: Date | null,
 *   goBack: () => void,
 *   goNext: () => void,
 *   goToStep: (step: number | string) => void,
 *   hasDraft: boolean,
 *   replaceStep: (step: number | string, data: object | ((previous: object) => object)) => void,
 *   reset: () => void,
 *   restore: () => ({ currentStep: number, expiresAt: number, savedAt: number, steps: TSteps } | null),
 *   restoredDraft: boolean,
 *   save: () => ({ currentStep: number, expiresAt: number, savedAt: number, steps: TSteps } | null),
 *   stepKeys: string[],
 *   steps: TSteps,
 *   totalSteps: number,
 *   updateStep: (step: number | string, patch: object | ((previous: object) => object)) => void
 * }}
 */
export function useWizardDraft(key, stepDefaults, options = {}) {
  const {
    clearWhen = false,
    debounceMs = defaultDebounce,
    enabled = true,
    onError,
    restoreOnMount = true,
    storage = getDefaultStorage,
    ttl = defaultTtl
  } = options

  const stepKeysRef = useRef(Object.keys(stepDefaults))
  const defaultsRef = useRef(clone(stepDefaults))
  const timeoutRef = useRef()
  const [currentStep, setCurrentStep] = useState(1)
  const [steps, setSteps] = useState(() => clone(stepDefaults))
  const [draft, setDraft] = useState(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [restoredDraft, setRestoredDraft] = useState(false)

  const totalSteps = stepKeysRef.current.length
  const currentStepKey = stepKeysRef.current[currentStep - 1]
  const allData = flattenSteps(steps)

  useEffect(() => {
    const savedDraft = readWizardDraft(key, {
      defaults: defaultsRef.current,
      onError,
      storage
    })

    if (!savedDraft) return

    setDraft(savedDraft)

    if (restoreOnMount) {
      applyDraft(savedDraft)
      setRestoredDraft(true)
      return
    }

    setHasDraft(true)
  }, [key, onError, restoreOnMount, storage])

  useEffect(() => {
    if (!enabled) return

    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      const savedDraft = writeWizardDraft(
        key,
        { currentStep, steps },
        { onError, storage, ttl }
      )
      setDraft(savedDraft)
    }, debounceMs)

    return () => clearTimeout(timeoutRef.current)
  }, [currentStep, debounceMs, enabled, key, onError, steps, storage, ttl])

  useEffect(() => {
    if (!clearWhen) return

    clearTimeout(timeoutRef.current)
    removeWizardDraft(key, { onError, storage })
    setDraft(null)
    setHasDraft(false)
    setRestoredDraft(false)
  }, [clearWhen, key, onError, storage])

  function applyDraft(savedDraft) {
    setSteps(savedDraft.steps)
    setCurrentStep(clampStep(savedDraft.currentStep, totalSteps))
    setHasDraft(false)
  }

  function restore() {
    if (!draft) return null

    applyDraft(draft)
    setRestoredDraft(true)
    return draft
  }

  function discard() {
    clearTimeout(timeoutRef.current)
    removeWizardDraft(key, { onError, storage })
    setDraft(null)
    setHasDraft(false)
    setRestoredDraft(false)
  }

  function clear() {
    discard()
  }

  function updateStep(step, patch) {
    const stepKey = resolveStepKey(step, stepKeysRef.current)
    if (!stepKey) return

    setSteps((previous) => ({
      ...previous,
      [stepKey]: {
        ...previous[stepKey],
        ...resolvePatch(patch, previous[stepKey])
      }
    }))
  }

  function replaceStep(step, data) {
    const stepKey = resolveStepKey(step, stepKeysRef.current)
    if (!stepKey) return

    setSteps((previous) => ({
      ...previous,
      [stepKey]: resolvePatch(data, previous[stepKey])
    }))
  }

  function goToStep(step) {
    setCurrentStep(clampStep(step, totalSteps))
  }

  function goNext() {
    setCurrentStep((step) => clampStep(step + 1, totalSteps))
  }

  function goBack() {
    setCurrentStep((step) => clampStep(step - 1, totalSteps))
  }

  function reset() {
    clearTimeout(timeoutRef.current)
    setCurrentStep(1)
    setSteps(clone(defaultsRef.current))
    setDraft(null)
    setHasDraft(false)
    setRestoredDraft(false)
    removeWizardDraft(key, { onError, storage })
  }

  function save() {
    const savedDraft = writeWizardDraft(
      key,
      { currentStep, steps },
      { onError, storage, ttl }
    )
    setDraft(savedDraft)
    return savedDraft
  }

  return {
    allData,
    canGoBack: currentStep > 1,
    canGoNext: currentStep < totalSteps,
    clear,
    currentStep,
    currentStepKey,
    discard,
    draft,
    draftSavedAt: draft?.savedAt ? new Date(draft.savedAt) : null,
    goBack,
    goNext,
    goToStep,
    hasDraft,
    replaceStep,
    reset,
    restore,
    restoredDraft,
    save,
    stepKeys: stepKeysRef.current,
    steps,
    totalSteps,
    updateStep
  }
}

function readWizardDraft(key, options) {
  const { defaults, onError, storage } = options
  const store = resolveStorage(storage)
  if (!store) return null

  try {
    const raw = store.getItem(key)
    if (!raw) return null

    const draft = JSON.parse(raw)
    if (!draft || typeof draft !== 'object' || !draft.steps) {
      removeWizardDraft(key, options)
      return null
    }

    if (draft.expiresAt && draft.expiresAt < Date.now()) {
      removeWizardDraft(key, options)
      return null
    }

    return {
      currentStep: draft.currentStep || 1,
      expiresAt: draft.expiresAt,
      savedAt: draft.savedAt,
      steps: mergeSteps(defaults, draft.steps)
    }
  } catch (error) {
    onError?.(error)
    removeWizardDraft(key, options)
    return null
  }
}

function writeWizardDraft(key, data, options) {
  const store = resolveStorage(options.storage)
  if (!store) return null

  const draft = {
    currentStep: data.currentStep,
    expiresAt: Date.now() + options.ttl,
    savedAt: Date.now(),
    steps: data.steps
  }

  try {
    store.setItem(key, JSON.stringify(draft))
    return draft
  } catch (error) {
    options.onError?.(error)
    return null
  }
}

function removeWizardDraft(key, options) {
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

function resolveStepKey(step, stepKeys) {
  if (typeof step === 'number') return stepKeys[step - 1]
  return stepKeys.includes(step) ? step : null
}

function clampStep(step, totalSteps) {
  const numericStep = Number(step)
  if (!Number.isFinite(numericStep)) return 1
  return Math.min(Math.max(Math.trunc(numericStep), 1), totalSteps)
}

function resolvePatch(patch, previous) {
  return typeof patch === 'function' ? patch(previous) : patch
}

function flattenSteps(steps) {
  return Object.values(steps).reduce(
    (data, stepData) => ({ ...data, ...stepData }),
    {}
  )
}

function mergeSteps(defaults, savedSteps) {
  return Object.fromEntries(
    Object.entries(defaults).map(([stepKey, defaultData]) => [
      stepKey,
      { ...defaultData, ...(savedSteps?.[stepKey] || {}) }
    ])
  )
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}
