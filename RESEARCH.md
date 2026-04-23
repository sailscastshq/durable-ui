# Durable UI Research

Date: 2026-04-22

## What We Extracted

The first package pass ships only `useFormDraft` and `useWizardDraft` for React and Vue.

- Hagfish has Vue composables for local storage, query state, and form drafts in `assets/js/composables`.
- Hagfish uses local draft persistence for expense and client creation flows.
- The most painful durable-ui failure mode right now is losing user-entered form data, not URL filters or sidebar preferences.
- Query state and general storage helpers are intentionally left for later.
- Source is plain JavaScript. We are not using TypeScript for this package.

## Browser Contracts

- `localStorage` survives browser sessions, but can throw `SecurityError` or be blocked by browser policy, so durable helpers must fail safely instead of assuming storage exists.
- Stored drafts can expire, contain invalid JSON, or become stale after app changes.
- Draft helpers should remove invalid and expired drafts instead of crashing the app.

## React Contract

React gets hooks that stay close to normal React form usage:

- `useFormDraft(key, data, options)` watches the caller's form data and can restore through `options.onRestore`.
- `useWizardDraft(key, stepDefaults, options)` owns current step state, per-step data, and a single localStorage draft.
- Both hooks avoid browser APIs during server rendering.

## Vue Contract

Vue gets composables that stay close to normal Vue and Inertia usage:

- `useFormDraft(key, source, options)` accepts a ref, reactive object, or getter such as `() => form.data()`.
- `useWizardDraft(key, stepDefaults, options)` returns refs/computed refs and methods for wizard state.
- Source folders use the `progress/` concept with kebab-case names: `form-draft/` and `wizard-draft/`.

## Sources

- React `useEffect`: https://react.dev/reference/react/useEffect
- MDN `localStorage`: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
