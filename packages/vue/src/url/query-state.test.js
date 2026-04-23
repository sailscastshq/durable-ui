import { effectScope, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useQueryState } from './query-state.js'

describe('Vue useQueryState', () => {
  let scope

  beforeEach(() => {
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    scope?.stop()
    vi.restoreAllMocks()
    window.history.replaceState({}, '', '/')
  })

  function runScoped(callback) {
    scope = effectScope()
    return scope.run(callback)
  }

  it('reads the current query parameter and preserves unrelated params', async () => {
    window.history.replaceState(
      {},
      '',
      '/settings?page=2&tab=billing#details'
    )

    const tab = runScoped(() => useQueryState('tab', 'profile'))

    expect(tab.value).toBe('billing')

    tab.value = 'team'
    await nextTick()

    const params = new URLSearchParams(window.location.search)

    expect(tab.value).toBe('team')
    expect(params.get('page')).toBe('2')
    expect(params.get('tab')).toBe('team')
    expect(window.location.hash).toBe('#details')
  })

  it('removes the param when set back to the default and can replace history', async () => {
    window.history.replaceState(
      {},
      '',
      '/users?page=2&search=ada'
    )

    const replaceState = vi.spyOn(window.history, 'replaceState')
    const search = runScoped(() =>
      useQueryState('search', '', { history: 'replace' })
    )

    search.value = 'grace'
    await nextTick()

    expect(replaceState).toHaveBeenCalled()
    expect(new URLSearchParams(window.location.search).get('search')).toBe(
      'grace'
    )

    search.value = ''
    await nextTick()

    const params = new URLSearchParams(window.location.search)
    expect(search.value).toBe('')
    expect(params.get('search')).toBeNull()
    expect(params.get('page')).toBe('2')
  })

  it('supports updater functions', async () => {
    const tab = runScoped(() => useQueryState('tab', 'profile'))

    tab.value = (current) => (current === 'profile' ? 'billing' : 'profile')
    await nextTick()

    expect(tab.value).toBe('billing')
    expect(new URLSearchParams(window.location.search).get('tab')).toBe(
      'billing'
    )
  })

  it('responds to popstate navigation', async () => {
    window.history.replaceState({}, '', '/settings?tab=profile')

    const tab = runScoped(() => useQueryState('tab', 'profile'))

    window.history.pushState(
      window.history.state,
      '',
      '/settings?tab=billing'
    )
    window.dispatchEvent(new PopStateEvent('popstate'))
    await nextTick()

    expect(tab.value).toBe('billing')
  })
})
