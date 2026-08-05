import { describe, expect, it } from 'vitest'

import { inspectSource } from './rules.js'

describe('Durable UI scan rules', () => {
  it('finds progress that can disappear on refresh', () => {
    const findings = inspect(`
      export function Apply() {
        const [currentStep, setCurrentStep] = useState(1)
        return <form onSubmit={submit}>
          <input name="name" />
          <input name="email" />
          <textarea name="notes" />
        </form>
      }
    `)

    expect(findings).toContain('progress-without-draft')
  })

  it('does not treat a small form as substantial by counting names twice', () => {
    expect(
      inspect(`<form><input name="first" /><input name="last" /></form>`)
    ).not.toContain('progress-without-draft')
  })

  it('does not flag progress with an explicit draft strategy', () => {
    const findings = inspect(`
      export function Apply() {
        const wizard = useWizardDraft('application', steps)
        return <form><input name="name" /><input name="email" /><input name="role" /></form>
      }
    `)

    expect(findings).not.toContain('progress-without-draft')
  })

  it('finds shareable view state held only in memory', () => {
    expect(
      inspect(`const [activeTab, setActiveTab] = useState('retention')`)
    ).toContain('view-state-outside-url')
    expect(
      inspect(`const [activeTab, setActiveTab] = useQueryState('tab', 'retention')`)
    ).not.toContain('view-state-outside-url')
    expect(inspect(`const page = usePage()`)).not.toContain(
      'view-state-outside-url'
    )
  })

  it('marks generic search state for review because it may be transient', () => {
    const [finding] = inspectSource({
      relativePath: 'CommandPalette.vue',
      source: `const query = ref('')`
    })

    expect(finding.id).toBe('view-state-outside-url')
    expect(finding.severity).toBe('review')
  })

  it('finds navigation implemented as a button', () => {
    expect(
      inspect(`<button onClick={() => navigate('/billing')}>Billing</button>`)
    ).toContain('navigation-rendered-as-button')
    expect(inspect(`<Link href="/billing">Billing</Link>`)).not.toContain(
      'navigation-rendered-as-button'
    )
    expect(
      inspect(`<button on:click={() => goto('/billing')}>Billing</button>`, 'Example.svelte')
    ).toContain('navigation-rendered-as-button')
  })

  it('finds sign-in redirects that lose intent', () => {
    expect(inspect(`navigate('/login')`)).toContain('auth-redirect-loses-intent')
    expect(
      inspect(`import { navigate } from './router.js'; navigate('/login')`)
    ).toContain('auth-redirect-loses-intent')
    expect(
      inspect(`import { NextResponse } from 'next/server'; redirect('/login')`)
    ).toContain('auth-redirect-loses-intent')
    expect(inspect(`window.location.href = '/login'`)).toContain(
      'auth-redirect-loses-intent'
    )
    expect(
      inspect(`navigate('/login?returnTo=' + encodeURIComponent(location.pathname))`)
    ).not.toContain('auth-redirect-loses-intent')
    expect(
      inspect(`navigate('/login', { state: { from: location.pathname } })`)
    ).not.toContain('auth-redirect-loses-intent')
  })

  it('finds incomplete custom dialogs and memory-only dialog state', () => {
    const findings = inspect(`
      const [isOpen, setIsOpen] = useState(false)
      return isOpen ? <section role="dialog" aria-modal="true">Edit visit</section> : null
    `)

    expect(findings).toContain('incomplete-dialog-contract')
    expect(findings).toContain('dialog-state-outside-url')
  })

  it('reviews memory-owned state even when the dialog contract is complete', () => {
    const completeCustom = inspect(`
      const [isOpen, setIsOpen] = useState(false)
      return <section role="dialog" onKeyDown={(event) => event.key === 'Escape' && close()}>
        <input autoFocus />
      </section>
    `)
    const native = inspect(`
      const [isOpen, setIsOpen] = useState(false)
      return isOpen ? <dialog open>Edit visit</dialog> : null
    `)
    const managed = inspect(`
      import * as Dialog from '@radix-ui/react-dialog'
      const [isOpen, setIsOpen] = useState(false)
      return <Dialog.Root open={isOpen} />
    `)

    expect(completeCustom).toContain('dialog-state-outside-url')
    expect(completeCustom).not.toContain('incomplete-dialog-contract')
    expect(native).toContain('dialog-state-outside-url')
    expect(native).not.toContain('incomplete-dialog-contract')
    expect(managed).toContain('dialog-state-outside-url')
    expect(managed).not.toContain('incomplete-dialog-contract')
  })

  it('finds unguarded browser storage', () => {
    expect(inspect(`localStorage.setItem('draft', JSON.stringify(data))`)).toContain(
      'unguarded-browser-storage'
    )
    expect(
      inspect(`try { localStorage.setItem('draft', value) } catch (error) { report(error) }`)
    ).not.toContain('unguarded-browser-storage')
  })

  it('finds browser effects without cleanup', () => {
    expect(inspect(`window.addEventListener('popstate', sync)`)).toContain(
      'event-listener-without-cleanup'
    )
    expect(
      inspect(`window.addEventListener('popstate', sync); window.removeEventListener('popstate', sync)`)
    ).not.toContain('event-listener-without-cleanup')
  })

  it('does not require component cleanup for process-lifetime modules', () => {
    expect(
      inspect(
        `createInertiaApp({ setup() {} }); window.addEventListener('load', boot); setInterval(refresh, 1000)`,
        'assets/js/app.js'
      )
    ).toEqual([])
    expect(
      inspect(
        `self.addEventListener('install', activate); self.skipWaiting()`,
        'assets/sw.js'
      )
    ).toEqual([])
  })

  it('finds delayed requests that cannot cancel stale responses', () => {
    expect(
      inspect(`setTimeout(() => fetch('/search?q=' + query), 300)`)
    ).toContain('debounced-request-without-cancellation')
    expect(
      inspect(`const controller = new AbortController(); setTimeout(() => fetch('/search', { signal: controller.signal }), 300)`)
    ).not.toContain('debounced-request-without-cancellation')
  })

  it('provides a disruptive browser test for every finding', () => {
    const findings = inspectSource({
      relativePath: 'Example.jsx',
      source: `
        const [currentStep, setCurrentStep] = useState(2)
        return <form>
          <input name="name" />
          <input name="email" />
          <input name="role" />
        </form>
      `
    })

    expect(findings.length).toBeGreaterThan(0)
    for (const finding of findings) {
      expect(finding.test).toEqual(expect.any(String))
      expect(finding.test.length).toBeGreaterThan(20)
    }
  })
})

function inspect(source, relativePath = 'Example.jsx') {
  return inspectSource({ relativePath, source }).map(
    (finding) => finding.id
  )
}
