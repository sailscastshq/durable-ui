# Durable UI Scanner

Scan a web application for state and browser contracts that may become fragile under refresh, Back, sign-in interruptions, remounts, and real user navigation.

```sh
npx durable-ui scan
```

The scanner is deliberately conservative. It reports source evidence with file and line locations, the likely user impact, a disruptive browser test, and a recommended implementation direction. It labels uncertain state-placement decisions as `REVIEW` and does not fail CI in version 0.0.1.

## Checks

- substantial forms and multi-step flows with no visible draft strategy
- shareable tabs, filters, sorting, pagination, and searches held only in memory
- buttons that perform navigation instead of links
- sign-in redirects that do not visibly preserve the requested destination
- custom dialogs missing Escape or focus behavior
- custom dialog workflows whose state may belong in the URL
- browser storage access without a failure boundary
- browser listeners and intervals with no visible cleanup
- debounced requests with no visible cancellation path

## Options

```text
npx durable-ui scan [path]
npx durable-ui scan --json
npx durable-ui scan --ignore generated,fixtures
npx durable-ui scan --no-course
```

JSON output is intended for editor and CI integrations that will follow after the first release. Version 0.0.1 returns a non-zero exit code only when the command itself cannot run.

## What It Cannot Know

Static analysis cannot decide whether a modal is ephemeral, whether server autosave happens behind a custom helper, or whether a state transition feels correct in the browser. Treat findings as reproducible questions. The final test is still to use the application, refresh it, navigate Back and Forward, interrupt it with sign-in, and verify that work and intent survive.

Learn the full decision framework in the [Durable UI course](https://sailscasts.com/courses/durable-ui).
