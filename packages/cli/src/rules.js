const urlSignals = [
  /useQueryState\s*\(/,
  /useSearchParams\s*\(/,
  /URLSearchParams\s*\(/,
  /window\.location\.search/,
  /location\.search/,
  /route\.query/,
  /router\.(?:push|replace)\s*\(\s*\{[^}]*query/s,
  /searchParams\b/,
  /queryParams\b/
]

const persistenceSignals = [
  /useFormDraft\s*\(/,
  /useWizardDraft\s*\(/,
  /localStorage\b/,
  /sessionStorage\b/,
  /indexedDB\b/,
  /\b(?:save|persist|restore)(?:Form)?Draft\b/i,
  /\bautosave\b/i,
  /\bautoSave\b/
]

const sourceRules = [
  inspectFormProgress,
  inspectViewState,
  inspectNavigationButtons,
  inspectAuthRedirects,
  inspectDialogContract,
  inspectBrowserStorage,
  inspectEffectCleanup,
  inspectDebouncedRequests
]

export function inspectSource(file) {
  return sourceRules.flatMap((rule) => rule(file)).filter(Boolean)
}

export function collectPositiveSignals(files) {
  const signals = [
    {
      id: 'form-drafts',
      title: 'Restorable form progress',
      patterns: [/useFormDraft\s*\(/, /useWizardDraft\s*\(/]
    },
    {
      id: 'url-state',
      title: 'URL-backed view state',
      patterns: urlSignals
    },
    {
      id: 'safe-storage',
      title: 'Guarded browser storage',
      matches: (source) =>
        /(?:local|session)Storage\b/.test(source) &&
        /\btry\s*\{/.test(source) &&
        /\bcatch\b/.test(source)
    },
    {
      id: 'dialog-contract',
      title: 'Keyboard-aware dialogs',
      patterns: [/<dialog\b/i, /(?:key|code)\s*===?\s*['"]Escape['"]/]
    },
    {
      id: 'request-cancellation',
      title: 'Cancelable browser requests',
      patterns: [/AbortController\s*\(/, /signal\s*:/]
    }
  ]

  return signals
    .map((signal) => {
      const count = files.filter((file) =>
        signal.matches
          ? signal.matches(file.source)
          : hasAny(file.source, signal.patterns)
      ).length
      return { id: signal.id, title: signal.title, files: count }
    })
    .filter((signal) => signal.files > 0)
}

function inspectFormProgress(file) {
  const source = file.source
  const hasForm =
    /<form\b/i.test(source) ||
    /(?:useForm|handleSubmit|onSubmit|@submit|v-model)\b/.test(source)
  if (!hasForm || hasAny(source, persistenceSignals)) return []

  const fieldCount = countMatches(
    source,
    /<(?:input|textarea|select)\b/gi
  )
  const registeredFieldCount = countMatches(source, /\bregister\s*\(/gi)
  const wizardMatch = matchFirst(
    source,
    /\b(?:currentStep|activeStep|stepIndex|wizardStep|goToStep)\b/i
  )

  if (!wizardMatch && Math.max(fieldCount, registeredFieldCount) < 3) return []

  const evidence = wizardMatch || matchFirst(source, /<form\b|\buseForm\s*\(/i)
  return [
    finding(file, evidence, {
      id: 'progress-without-draft',
      category: 'Progress',
      severity: wizardMatch ? 'high' : 'medium',
      title: wizardMatch
        ? 'Multi-step progress appears to live only in memory'
        : 'A substantial form has no visible draft strategy',
      why: wizardMatch
        ? 'A refresh, Back, or an auth interruption can reset both the fields and the current step.'
        : 'Users can lose meaningful input when the page reloads or navigation interrupts the task.',
      test: wizardMatch
        ? 'Enter data, advance to a later step, then refresh and use Back and Forward; verify the fields and current step are restored.'
        : 'Enter meaningful data, refresh the page, and verify the unfinished input is restored without resubmitting it.',
      fix: 'Persist a private, expiring draft and clear it only after a confirmed successful submission.'
    })
  ]
}

function inspectViewState(file) {
  if (hasAny(file.source, urlSignals)) return []

  const match = matchStateDeclaration(file, [
    'activeTab',
    'selectedTab',
    'activeView',
    'selectedView',
    'filter',
    'filters',
    'sort',
    'sortBy',
    'page',
    'currentPage',
    'query',
    'searchTerm'
  ])
  if (!match) return []

  const stateName = match[1]
  const isAmbiguousSearch = /^(?:query|searchTerm)$/i.test(stateName)

  return [
    finding(file, match, {
      id: 'view-state-outside-url',
      category: 'URL state',
      severity: isAmbiguousSearch ? 'review' : 'medium',
      title: isAmbiguousSearch
        ? 'Decide whether this search belongs in the URL'
        : 'Shareable view state appears to be trapped in memory',
      why: isAmbiguousSearch
        ? 'Page-level search should usually survive refresh and sharing, while transient lookup or command-palette text may correctly stay in memory.'
        : 'Refresh, Back, bookmarks, and shared links may not restore the view the user is looking at.',
      test: 'Change this view, copy the URL into a new tab, then use Back and Forward; verify each navigation restores the same view.',
      fix: isAmbiguousSearch
        ? 'If the search describes the page view, place it in URL query parameters. Keep transient lookup text local.'
        : 'Place navigational filters, tabs, sorting, pagination, and searches in URL query parameters.'
    })
  ]
}

function inspectNavigationButtons(file) {
  const match = matchFirst(
    file.source,
    /<button\b[^>]{0,400}(?:onClick|@click|v-on:click|on:click)\s*=\s*(?:\{[^}]{0,400}(?:navigate\s*\(|goto\s*\(|router\.(?:push|replace)\s*\(|(?:window\.)?location\.(?:href|assign|replace))[^}]*\}|["'][^"']{0,400}(?:navigate\s*\(|goto\s*\(|router\.(?:push|replace)\s*\(|(?:window\.)?location\.(?:href|assign|replace))[^"']*["'])/is
  )
  if (!match) return []

  return [
    finding(file, match, {
      id: 'navigation-rendered-as-button',
      category: 'Navigation',
      severity: 'high',
      title: 'Navigation is rendered as a button',
      why: 'Users lose link previews, open-in-new-tab, copy-link, keyboard, and browser navigation behavior.',
      test: 'Try to copy or open the destination in a new tab with the mouse and keyboard, then use Back; verify it behaves like a normal link.',
      fix: 'Render destination changes as an anchor or framework Link. Keep buttons for actions on the current page.'
    })
  ]
}

function inspectAuthRedirects(file) {
  const source = file.source
  const match = matchFirst(
    source,
    /(?:(?:navigate|redirect|goto|router\.(?:push|replace)|location\.(?:assign|replace))\s*\([^\n]{0,180}["']\/?(?:sign-in|signin|login|auth\/login)\b|(?:window\.)?location\.href\s*=\s*["']\/?(?:sign-in|signin|login|auth\/login)\b)/i
  )
  if (!match) return []

  const lineEnd = source.indexOf('\n', match.index)
  const redirectContext = source.slice(
    match.index,
    lineEnd === -1 ? undefined : lineEnd
  )
  const preservesIntent =
    /\b(?:returnTo|redirectTo|redirect_url|next|continue|intended|destination)\b/i.test(
      redirectContext
    ) ||
    /(?:[?&]from=|\bfrom\s*:)/i.test(redirectContext) ||
    /searchParams\.(?:set|append)\s*\(/.test(redirectContext)
  if (preservesIntent) return []

  return [
    finding(file, match, {
      id: 'auth-redirect-loses-intent',
      category: 'Navigation',
      severity: 'high',
      title: 'A sign-in redirect may forget the user\'s destination',
      why: 'After authentication, the user can land somewhere generic instead of returning to the work they requested.',
      test: 'Start from a protected deep link, complete sign-in, and verify the exact requested destination is restored.',
      fix: 'Carry a validated return destination through sign-in and restore it after authentication succeeds.'
    })
  ]
}

function inspectDialogContract(file) {
  const source = file.source
  const dialogMatch = matchFirst(
    source,
    /<[^>]+(?:role\s*=\s*["']dialog["']|aria-modal\s*=\s*["']?true)|<dialog\b/i
  )
  if (!dialogMatch) return []

  const usesNativeDialog = /<dialog\b/.test(source)
  const usesManagedDialog =
    /@(?:radix-ui|headlessui|reach\/dialog|ariakit)|react-aria|focus-trap/i.test(
      source
    )

  const missing = []
  if (!/(?:Escape|Esc|keydown|onKeyDown|@keydown\.esc|useEscape)/.test(source)) {
    missing.push('Escape dismissal')
  }
  if (
    !/(?:autoFocus|autofocus|initialFocus|returnFocus|restoreFocus|FocusTrap|focusTrap|\.focus\s*\()/.test(
      source
    )
  ) {
    missing.push('focus entry and return')
  }
  const findings = []

  if (!usesNativeDialog && !usesManagedDialog && missing.length > 0) {
    findings.push(
      finding(file, dialogMatch, {
        id: 'incomplete-dialog-contract',
        category: 'Components',
        severity: 'high',
        title: 'A custom dialog has an incomplete browser contract',
        why: `The implementation has no visible ${joinList(missing)} behavior.`,
        test: 'Open the dialog with the keyboard, press Escape, then close it and verify focus returns to the trigger.',
        fix: 'Use the native dialog element or a proven accessible dialog primitive, then test dismissal and focus restoration.'
      })
    )
  }

  const memoryMatch = matchStateDeclaration(file, [
    'isOpen',
    'open',
    'showModal',
    'modalOpen',
    'drawerOpen'
  ])
  if (memoryMatch && !hasAny(source, urlSignals)) {
    findings.push(
      finding(file, memoryMatch, {
        id: 'dialog-state-outside-url',
        category: 'State placement',
        severity: 'review',
        title: 'Decide whether this dialog should survive refresh',
        why: 'Memory is correct for a brief confirmation. A substantial create or edit workflow may need a URL so refresh and Back preserve intent.',
        test: 'Open the dialog on a specific record, then refresh and use Back and Forward; decide whether preserving or dismissing it matches the product contract.',
        fix: 'If the dialog represents navigable work, place its open state and record identity in the URL.'
      })
    )
  }

  return findings
}

function inspectBrowserStorage(file) {
  const match = matchFirst(file.source, /(?:local|session)Storage\.(?:getItem|setItem|removeItem)\s*\(/)
  if (!match) return []
  if (/\btry\s*\{/.test(file.source) && /\bcatch\b/.test(file.source)) return []

  return [
    finding(file, match, {
      id: 'unguarded-browser-storage',
      category: 'Persistence',
      severity: 'high',
      title: 'Browser storage is used without a failure boundary',
      why: 'Storage access and JSON parsing can fail because of browser policy, quota, private mode, or stale data.',
      test: 'Block storage access or load corrupt stored data, then open this screen; verify the UI remains usable and can recover.',
      fix: 'Guard reads and writes, validate stored data, expire stale drafts, and let the UI continue when storage is unavailable.'
    })
  ]
}

function inspectEffectCleanup(file) {
  if (isProcessLifetimeModule(file)) return []

  const listenerMatch = matchFirst(file.source, /\.addEventListener\s*\(/)
  if (listenerMatch && !/\.removeEventListener\s*\(/.test(file.source)) {
    return [
      finding(file, listenerMatch, {
        id: 'event-listener-without-cleanup',
        category: 'Lifecycle',
        severity: 'medium',
        title: 'An event listener has no visible cleanup',
        why: 'Remounts can duplicate browser behavior and leave stale state reacting after the screen is gone.',
        test: 'Navigate away and back several times, trigger the event once, and verify the handler runs once and no stale screen reacts.',
        fix: 'Remove the same listener during component or effect cleanup.'
      })
    ]
  }

  const intervalMatch = matchFirst(file.source, /\bsetInterval\s*\(/)
  if (intervalMatch && !/\bclearInterval\s*\(/.test(file.source)) {
    return [
      finding(file, intervalMatch, {
        id: 'interval-without-cleanup',
        category: 'Lifecycle',
        severity: 'medium',
        title: 'An interval has no visible cleanup',
        why: 'The timer can keep mutating stale UI after navigation or remounting.',
        test: 'Navigate away while the interval is active and verify it stops producing requests, logs, or UI updates.',
        fix: 'Keep the interval handle and clear it during component or effect cleanup.'
      })
    ]
  }

  return []
}

function isProcessLifetimeModule(file) {
  const source = file.source
  const isWorker =
    /(?:^|\/)(?:service[-_.]?worker|sw)\.[cm]?[jt]s$/i.test(
      file.relativePath
    ) ||
    (/\bself\.addEventListener\s*\(/.test(source) &&
      /\b(?:skipWaiting|clients\.claim|registration)\b/.test(source))
  const isClientBootstrap =
    /\b(?:createApp|createInertiaApp|createRoot|hydrateRoot)\s*\(/.test(
      source
    ) &&
    /(?:^|\/)(?:app|main|client|entry-client)\.[cm]?[jt]sx?$/i.test(
      file.relativePath
    )

  return isWorker || isClientBootstrap
}

function inspectDebouncedRequests(file) {
  const source = file.source
  const match = matchFirst(source, /\b(?:debounce|setTimeout)\s*\(/)
  if (!match || !/\b(?:fetch|axios\.|router\.(?:get|post)|form\.(?:get|post))\s*\(/.test(source)) {
    return []
  }
  if (/AbortController\s*\(|\bsignal\s*:|cancelToken|onCancelToken/.test(source)) {
    return []
  }

  return [
    finding(file, match, {
      id: 'debounced-request-without-cancellation',
      category: 'Async state',
      severity: 'medium',
      title: 'A delayed request has no visible cancellation path',
      why: 'Older responses can arrive after newer ones and replace the UI with stale results.',
      test: 'Type two queries quickly while delaying the first response; verify only the newest result renders, then navigate away and verify no late update occurs.',
      fix: 'Cancel the previous request before starting the next one and ignore superseded responses.'
    })
  ]
}

function finding(file, match, details) {
  const location = locate(file.source, match?.index ?? 0)
  return {
    ...details,
    file: file.relativePath,
    line: location.line,
    column: location.column,
    evidence: location.evidence
  }
}

function locate(source, index) {
  const before = source.slice(0, index)
  const line = before.split('\n').length
  const lineStart = before.lastIndexOf('\n') + 1
  const lineEnd = source.indexOf('\n', index)
  const rawLine = source.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim()
  return {
    line,
    column: index - lineStart + 1,
    evidence: rawLine.length > 140 ? `${rawLine.slice(0, 137)}...` : rawLine
  }
}

function matchFirst(source, pattern) {
  return pattern.exec(source)
}

function hasAny(source, patterns) {
  return patterns.some((pattern) => pattern.test(source))
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length
}

function matchStateDeclaration(file, names) {
  const alternatives = names.join('|')
  const patterns = [
    new RegExp(
      `const\\s*\\[\\s*(${alternatives})\\s*,[^\\]]+\\]\\s*=\\s*(?:useState|createSignal)\\s*\\(`,
      'i'
    ),
    new RegExp(
      `const\\s+(${alternatives})\\s*=\\s*(?:ref|reactive|shallowRef)\\s*\\(`,
      'i'
    )
  ]

  if (file.relativePath.endsWith('.svelte')) {
    patterns.push(new RegExp(`let\\s+(${alternatives})\\s*=`, 'i'))
  }

  return patterns.map((pattern) => matchFirst(file.source, pattern)).find(Boolean)
}

function joinList(items) {
  if (items.length < 2) return items[0]
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}
