import { effectScope, nextTick, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFormDraft } from './form-draft.js'

describe('Vue useFormDraft', () => {
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

  it('saves non-empty form data after the debounce delay', async () => {
    const form = reactive({ name: '' })

    runScoped(() =>
      useFormDraft('student:draft', () => ({ ...form }), { debounceMs: 100 })
    )

    form.name = 'Ada'
    await nextTick()

    vi.advanceTimersByTime(100)

    const draft = JSON.parse(localStorage.getItem('student:draft'))
    expect(draft.data).toEqual({ name: 'Ada' })
    expect(draft.savedAt).toEqual(expect.any(Number))
    expect(draft.expiresAt).toBeGreaterThan(draft.savedAt)
  })

  it('restores an existing draft into a reactive object', () => {
    localStorage.setItem(
      'student:draft',
      JSON.stringify({
        data: { name: 'Ada' },
        expiresAt: Date.now() + 1000,
        savedAt: Date.now()
      })
    )

    const form = reactive({ name: '' })
    const draft = runScoped(() => useFormDraft('student:draft', form))

    expect(draft.hasDraft.value).toBe(true)
    expect(draft.restore()).toEqual({ name: 'Ada' })
    expect(form.name).toBe('Ada')
    expect(draft.hasDraft.value).toBe(false)
  })

  it('removes the draft when clearWhen becomes true', async () => {
    localStorage.setItem(
      'student:draft',
      JSON.stringify({
        data: { name: 'Ada' },
        expiresAt: Date.now() + 1000,
        savedAt: Date.now()
      })
    )

    const clearWhen = ref(false)
    runScoped(() =>
      useFormDraft('student:draft', { name: 'Ada' }, { clearWhen })
    )

    clearWhen.value = true
    await nextTick()

    expect(localStorage.getItem('student:draft')).toBeNull()
  })
})
