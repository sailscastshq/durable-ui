import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useQueryState } from './query-state.js'

describe('React useQueryState', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.history.replaceState({}, '', '/')
  })

  it('reads the current query parameter and preserves unrelated params', () => {
    window.history.replaceState(
      {},
      '',
      '/settings?page=2&tab=billing#details'
    )

    const { result } = renderHook(() => useQueryState('tab', 'profile'))

    expect(result.current[0]).toBe('billing')

    act(() => {
      result.current[1]('team')
    })

    const params = new URLSearchParams(window.location.search)

    expect(result.current[0]).toBe('team')
    expect(params.get('page')).toBe('2')
    expect(params.get('tab')).toBe('team')
    expect(window.location.hash).toBe('#details')
  })

  it('removes the param when set back to the default and can replace history', () => {
    window.history.replaceState(
      {},
      '',
      '/users?page=2&search=ada'
    )

    const replaceState = vi.spyOn(window.history, 'replaceState')
    const { result } = renderHook(() =>
      useQueryState('search', '', { history: 'replace' })
    )

    act(() => {
      result.current[1]('grace')
    })

    expect(replaceState).toHaveBeenCalled()
    expect(new URLSearchParams(window.location.search).get('search')).toBe(
      'grace'
    )

    act(() => {
      result.current[1]('')
    })

    const params = new URLSearchParams(window.location.search)
    expect(result.current[0]).toBe('')
    expect(params.get('search')).toBeNull()
    expect(params.get('page')).toBe('2')
  })

  it('supports functional updates', () => {
    const { result } = renderHook(() => useQueryState('tab', 'profile'))

    act(() => {
      result.current[1]((current) =>
        current === 'profile' ? 'billing' : 'profile'
      )
    })

    expect(result.current[0]).toBe('billing')
    expect(new URLSearchParams(window.location.search).get('tab')).toBe(
      'billing'
    )
  })

  it('responds to popstate navigation', () => {
    window.history.replaceState({}, '', '/settings?tab=profile')

    const { result } = renderHook(() => useQueryState('tab', 'profile'))

    act(() => {
      window.history.pushState(
        window.history.state,
        '',
        '/settings?tab=billing'
      )
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(result.current[0]).toBe('billing')
  })
})
