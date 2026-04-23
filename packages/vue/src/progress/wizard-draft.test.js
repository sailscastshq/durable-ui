import { effectScope, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWizardDraft } from './wizard-draft.js'

const stepDefaults = {
  profile: { name: '', company: '' },
  import: { rows: [] }
}

describe('Vue useWizardDraft', () => {
  let scope

  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    scope?.stop()
    vi.useRealTimers()
    localStorage.clear()
  })

  function runScoped(callback) {
    scope = effectScope()
    return scope.run(callback)
  }

  it('restores saved progress and merges it with current defaults', () => {
    localStorage.setItem(
      'students:wizard',
      JSON.stringify({
        currentStep: 2,
        expiresAt: Date.now() + 1000,
        savedAt: Date.now(),
        steps: {
          profile: { name: 'Ada' }
        }
      })
    )

    const wizard = runScoped(() => useWizardDraft('students:wizard', stepDefaults))

    expect(wizard.currentStep.value).toBe(2)
    expect(wizard.currentStepKey.value).toBe('import')
    expect(wizard.steps.value.profile).toEqual({
      company: '',
      name: 'Ada'
    })
    expect(wizard.restoredDraft.value).toBe(true)
  })

  it('persists current step and per-step data after the debounce delay', async () => {
    const wizard = runScoped(() =>
      useWizardDraft('students:wizard', stepDefaults, { debounceMs: 100 })
    )

    wizard.updateStep('profile', { name: 'Ada' })
    wizard.goNext()
    await nextTick()

    vi.advanceTimersByTime(100)

    const draft = JSON.parse(localStorage.getItem('students:wizard'))
    expect(draft.currentStep).toBe(2)
    expect(draft.steps.profile).toEqual({ company: '', name: 'Ada' })
    expect(draft.steps.import).toEqual({ rows: [] })
  })

  it('saves immediately and exposes when the draft was saved', async () => {
    const wizard = runScoped(() =>
      useWizardDraft('students:wizard', stepDefaults)
    )

    wizard.updateStep('profile', { name: 'Ada' })
    await nextTick()

    const savedDraft = wizard.save()

    const draft = JSON.parse(localStorage.getItem('students:wizard'))
    expect(savedDraft.steps.profile).toEqual({ company: '', name: 'Ada' })
    expect(draft.steps.profile).toEqual({ company: '', name: 'Ada' })
    expect(wizard.draftSavedAt.value).toBeInstanceOf(Date)
  })
})
