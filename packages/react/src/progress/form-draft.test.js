import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFormDraft } from './form-draft.js'

describe('React useFormDraft', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('saves non-empty form data after the debounce delay', () => {
    const { rerender } = renderHook(
      ({ data }) => useFormDraft('student:draft', data, { debounceMs: 100 }),
      { initialProps: { data: { name: '' } } }
    )

    rerender({ data: { name: 'Ada' } })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    const draft = JSON.parse(localStorage.getItem('student:draft'))
    expect(draft.data).toEqual({ name: 'Ada' })
    expect(draft.savedAt).toEqual(expect.any(Number))
    expect(draft.expiresAt).toBeGreaterThan(draft.savedAt)
  })

  it('restores an existing draft through onRestore', () => {
    localStorage.setItem(
      'student:draft',
      JSON.stringify({
        data: { name: 'Ada' },
        expiresAt: Date.now() + 1000,
        savedAt: Date.now()
      })
    )

    const onRestore = vi.fn()
    const { result } = renderHook(() =>
      useFormDraft('student:draft', { name: '' }, { onRestore })
    )

    expect(result.current.hasDraft).toBe(true)

    let restored
    act(() => {
      restored = result.current.restore()
    })

    expect(restored).toEqual({ name: 'Ada' })
    expect(onRestore).toHaveBeenCalledWith({ name: 'Ada' })
    expect(result.current.hasDraft).toBe(false)
  })

  it('removes the draft when clearWhen becomes true', () => {
    localStorage.setItem(
      'student:draft',
      JSON.stringify({
        data: { name: 'Ada' },
        expiresAt: Date.now() + 1000,
        savedAt: Date.now()
      })
    )

    const { rerender } = renderHook(
      ({ clearWhen }) =>
        useFormDraft('student:draft', { name: 'Ada' }, { clearWhen }),
      { initialProps: { clearWhen: false } }
    )

    rerender({ clearWhen: true })

    expect(localStorage.getItem('student:draft')).toBeNull()
  })
})
