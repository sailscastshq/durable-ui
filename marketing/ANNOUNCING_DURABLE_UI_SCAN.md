# Announcing Durable UI Scan

Your interface can pass every unit test and still forget what the user was doing.

A refresh wipes a form. Back loses a filter. Sign-in forgets the page the user asked for. A dialog traps focus. A slow response replaces newer results.

These are not styling bugs. They are broken browser contracts.

Today, I am announcing **Durable UI Scan**: a conservative, zero-dependency source scanner that finds fragile UI state before users do.

```sh
npx durable-ui scan
```

The scanner walks your application source and reports:

- the exact file, line, and source evidence;
- the likely consequence for the user;
- a disruptive browser test that reproduces the risk; and
- a practical implementation direction.

When static analysis cannot know the product decision, it says `REVIEW`. It does not pretend that every modal belongs in the URL or that every form must be persisted.

## What it catches today

- meaningful forms and multi-step flows with no visible draft strategy;
- shareable tabs, filters, sorting, pagination, and search held only in memory;
- buttons used for navigation instead of links;
- sign-in redirects that do not visibly preserve return intent;
- custom dialogs missing Escape or focus behavior;
- dialog workflows whose state may belong in the URL;
- browser storage without a visible failure boundary;
- listeners and intervals without visible cleanup; and
- delayed requests without a visible cancellation path.

## The ideal codebase today

Durable UI Scan is strongest on source-first web applications where UI behavior lives close to the component or page that renders it:

- React, Vue, Svelte, Next.js, Nuxt, Inertia, and Sails applications;
- JavaScript or TypeScript repositories using JSX, TSX, Vue SFCs, or Svelte components;
- product interfaces with forms, onboarding, checkout, search, dashboards, tables, filters, tabs, dialogs, and authenticated deep links;
- applications using browser storage, event listeners, timers, or debounced network requests; and
- teams that want useful review evidence without turning heuristic findings into CI failures.

It also scans Astro, HTML, and EJS for markup and browser-API signals. Today, those formats receive less state-placement coverage than React, Vue, and Svelte because the scanner deliberately avoids pretending regex-based analysis understands every framework abstraction.

The best input is authored source, not generated bundles, minified output, vendored code, or heavily abstracted design-system internals. By default the scanner skips common build, dependency, fixture, and test directories.

## Human output

```text
DURABLE UI  scan
acme-dashboard  48 files · React, Inertia · 126ms

2 high  ·  1 to review

HIGH  A sign-in redirect may forget the user's destination
src/pages/Account.tsx:18:5
  navigate('/login')
  Impact: After authentication, the user can land somewhere generic instead of returning to the work they requested.
  Browser test: Start from a protected deep link, complete sign-in, and verify the exact requested destination is restored.
  Recommendation: Carry a validated return destination through sign-in and restore it after authentication succeeds.

REVIEW  Decide whether this dialog should survive refresh
src/pages/Customers.tsx:42:3
  const [isOpen, setIsOpen] = useState(false)
  Impact: Memory is correct for a brief confirmation. A substantial create or edit workflow may need a URL so refresh and Back preserve intent.
  Browser test: Open the dialog on a specific record, then refresh and use Back and Forward; decide whether preserving or dismissing it matches the product contract.
  Recommendation: If the dialog represents navigable work, place its open state and record identity in the URL.
```

## JSON output

```json
{
  "schemaVersion": 1,
  "scannerVersion": "0.0.1",
  "root": "/workspace/acme-dashboard",
  "frameworks": ["React", "Inertia"],
  "filesScanned": 48,
  "filesSkipped": [],
  "elapsedMs": 126,
  "summary": {
    "total": 3,
    "high": 2,
    "medium": 0,
    "review": 1
  },
  "positiveSignals": [
    {
      "id": "url-state",
      "title": "URL-backed view state",
      "files": 6
    }
  ],
  "findings": [
    {
      "id": "auth-redirect-loses-intent",
      "category": "Navigation",
      "severity": "high",
      "title": "A sign-in redirect may forget the user's destination",
      "why": "After authentication, the user can land somewhere generic instead of returning to the work they requested.",
      "test": "Start from a protected deep link, complete sign-in, and verify the exact requested destination is restored.",
      "fix": "Carry a validated return destination through sign-in and restore it after authentication succeeds.",
      "file": "src/pages/Account.tsx",
      "line": 18,
      "column": 5,
      "evidence": "navigate('/login')"
    }
  ]
}
```

Use `--json` for editor and CI integrations, `--ignore` for project-specific generated folders, and `--no-course` for course-free human output.

Version 0.0.1 does not fail CI because of findings. A heuristic should start a browser test and a product conversation, not silently become policy.

Run it today:

```sh
npx durable-ui scan
```

Static signals. Real browser tests. Better UI contracts.

Learn the full decision framework in the Durable UI course: https://sailscasts.com/courses/durable-ui
