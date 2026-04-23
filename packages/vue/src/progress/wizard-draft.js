import { computed, ref, watch } from 'vue'

const defaultTtl = 7 * 24 * 60 * 60 * 1000
const defaultDebounce = 500

/**
 * Persist progress for a multi-step form or onboarding flow.
 *
 * @template {Record<string, object>} TSteps
 * @param {string} key Stable localStorage key for this wizard.
 * @param {TSteps} stepDefaults Default data for each step, keyed by step name.
 * @param {object} [options]
 * @param {boolean | import('vue').Ref<boolean> | (() => boolean)} [options.clearWhen=false] Remove the wizard draft when this becomes true, usually after final submit.
 * @param {number} [options.debounceMs=500] Delay writes until step data settles.
 * @param {boolean} [options.enabled=true] Disable automatic wizard writes when false.
 * @param {(error: unknown) => void} [options.onError] Called when storage read/write/remove fails.
 * @param {boolean} [options.restoreOnMount=true] Restore saved wizard progress immediately when found.
 * @param {Storage | (() => Storage)} [options.storage=window.localStorage] Custom storage target.
 * @param {number} [options.ttl=604800000] Wizard draft lifetime in milliseconds.
 * @returns {{
 *   allData: import('vue').ComputedRef<object>,
 *   canGoBack: import('vue').ComputedRef<boolean>,
 *   canGoNext: import('vue').ComputedRef<boolean>,
 *   clear: () => void,
 *   currentStep: import('vue').Ref<number>,
 *   currentStepKey: import('vue').ComputedRef<string>,
 *   discard: () => void,
 *   draft: import('vue').Ref<{ currentStep: number, expiresAt: number, savedAt: number, steps: TSteps } | null>,
 *   draftSavedAt: import('vue').ComputedRef<Date | null>,
 *   goBack: () => void,
 *   goNext: () => void,
 *   goToStep: (step: number | string) => void,
 *   hasDraft: import('vue').Ref<boolean>,
 *   replaceStep: (step: number | string, data: object | ((previous: object) => object)) => void,
 *   reset: () => void,
 *   restore: () => ({ currentStep: number, expiresAt: number, savedAt: number, steps: TSteps } | null),
 *   restoredDraft: import('vue').Ref<boolean>,
 *   save: () => ({ currentStep: number, expiresAt: number, savedAt: number, steps: TSteps } | null),
 *   stepKeys: string[],
 *   steps: import('vue').Ref<TSteps>,
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

  const stepKeys = Object.keys(stepDefaults)
  const defaults = clone(stepDefaults)
  const currentStep = ref(1)
  const steps = ref(clone(stepDefaults))
  const draft = ref(null)
  const hasDraft = ref(false)
  const restoredDraft = ref(false)
  let timeout

  const totalSteps = stepKeys.length
  const currentStepKey = computed(() => stepKeys[currentStep.value - 1])
  const allData = computed(() => flattenSteps(steps.value))
  const canGoBack = computed(() => currentStep.value > 1)
  const canGoNext = computed(() => currentStep.value < totalSteps)
  const draftSavedAt = computed(() =>
    draft.value?.savedAt ? new Date(draft.value.savedAt) : null
  )

  const savedDraft = readWizardDraft(key, { defaults, onError, storage })
  if (savedDraft) {
    draft.value = savedDraft

    if (restoreOnMount) {
      applyDraft(savedDraft)
      restoredDraft.value = true
    } else {
      hasDraft.value = true
    }
  }

  watch(
    [currentStep, steps],
    () => {
      if (!enabled) return

      clearTimeout(timeout)
      timeout = setTimeout(() => {
        draft.value = writeWizardDraft(
          key,
          { currentStep: currentStep.value, steps: steps.value },
          { onError, storage, ttl }
        )
      }, debounceMs)
    },
    { deep: true }
  )

  watch(
    () => readSource(clearWhen),
    (shouldClear) => {
      if (!shouldClear) return

      clearTimeout(timeout)
      removeWizardDraft(key, { onError, storage })
      draft.value = null
      hasDraft.value = false
      restoredDraft.value = false
    }
  )

  function applyDraft(savedDraftToApply) {
    steps.value = savedDraftToApply.steps
    currentStep.value = clampStep(savedDraftToApply.currentStep, totalSteps)
    hasDraft.value = false
  }

  function restore() {
    if (!draft.value) return null

    applyDraft(draft.value)
    restoredDraft.value = true
    return draft.value
  }

  function discard() {
    clearTimeout(timeout)
    removeWizardDraft(key, { onError, storage })
    draft.value = null
    hasDraft.value = false
    restoredDraft.value = false
  }

  function clear() {
    discard()
  }

  function updateStep(step, patch) {
    const stepKey = resolveStepKey(step, stepKeys)
    if (!stepKey) return

    steps.value = {
      ...steps.value,
      [stepKey]: {
        ...steps.value[stepKey],
        ...resolvePatch(patch, steps.value[stepKey])
      }
    }
  }

  function replaceStep(step, data) {
    const stepKey = resolveStepKey(step, stepKeys)
    if (!stepKey) return

    steps.value = {
      ...steps.value,
      [stepKey]: resolvePatch(data, steps.value[stepKey])
    }
  }

  function goToStep(step) {
    currentStep.value = clampStep(step, totalSteps)
  }

  function goNext() {
    goToStep(currentStep.value + 1)
  }

  function goBack() {
    goToStep(currentStep.value - 1)
  }

  function reset() {
    clearTimeout(timeout)
    currentStep.value = 1
    steps.value = clone(defaults)
    draft.value = null
    hasDraft.value = false
    restoredDraft.value = false
    removeWizardDraft(key, { onError, storage })
  }

  function save() {
    const nextDraft = writeWizardDraft(
      key,
      { currentStep: currentStep.value, steps: steps.value },
      { onError, storage, ttl }
    )
    draft.value = nextDraft
    return nextDraft
  }

  return {
    allData,
    canGoBack,
    canGoNext,
    clear,
    currentStep,
    currentStepKey,
    discard,
    draft,
    draftSavedAt,
    goBack,
    goNext,
    goToStep,
    hasDraft,
    replaceStep,
    reset,
    restore,
    restoredDraft,
    save,
    stepKeys,
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

function readSource(source) {
  if (typeof source === 'function') return source()
  return source?.value ?? source
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
