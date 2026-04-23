import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWizardDraft } from './wizard-draft.js'

const stepDefaults = {
  profile: { name: '', company: '' },
  import: { rows: [] }
}

describe('React useWizardDraft', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

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

    const { result } = renderHook(() =>
      useWizardDraft('students:wizard', stepDefaults)
    )

    expect(result.current.currentStep).toBe(2)
    expect(result.current.currentStepKey).toBe('import')
    expect(result.current.steps.profile).toEqual({
      company: '',
      name: 'Ada'
    })
    expect(result.current.restoredDraft).toBe(true)
  })

  it('persists current step and per-step data after the debounce delay', () => {
    const { result } = renderHook(() =>
      useWizardDraft('students:wizard', stepDefaults, { debounceMs: 100 })
    )

    act(() => {
      result.current.updateStep('profile', { name: 'Ada' })
      result.current.goNext()
    })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    const draft = JSON.parse(localStorage.getItem('students:wizard'))
    expect(draft.currentStep).toBe(2)
    expect(draft.steps.profile).toEqual({ company: '', name: 'Ada' })
    expect(draft.steps.import).toEqual({ rows: [] })
  })

  it('saves immediately and exposes when the draft was saved', () => {
    const { result } = renderHook(() =>
      useWizardDraft('students:wizard', stepDefaults)
    )

    act(() => {
      result.current.updateStep('profile', { name: 'Ada' })
    })

    let savedDraft
    act(() => {
      savedDraft = result.current.save()
    })

    const draft = JSON.parse(localStorage.getItem('students:wizard'))
    expect(savedDraft.steps.profile).toEqual({ company: '', name: 'Ada' })
    expect(draft.steps.profile).toEqual({ company: '', name: 'Ada' })
    expect(result.current.draftSavedAt).toBeInstanceOf(Date)
  })
})
