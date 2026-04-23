# Durable UI

Durable UI is a small set of framework-native utilities for form state that should survive real app life: refreshes, browser restarts, accidental navigation, and long multi-step flows.

The project is intentionally logic-only. It is separate from Klean UI, but Klean can use these utilities in generated durable patterns.

## Packages

- `@durable-ui/vue`: Vue composables.
- `@durable-ui/react`: React hooks.

## Progress

Progress durability protects private work the user has already done but has not submitted yet.

- `useFormDraft` preserves one form's private field values.
- `useWizardDraft` preserves multi-step progress, including the current step and per-step data.

## URL

URL durability keeps shareable view state in the address bar.

- `useQueryState` syncs one query parameter for tabs, filters, sorting, pagination, or modal state.

## Vue

```vue
<script setup>
import { useFormDraft, useQueryState, useWizardDraft } from '@durable-ui/vue'

const activeTab = useQueryState('tab', 'details')

const draft = useFormDraft('invoice:draft', () => form.data(), {
  clearWhen: () => form.recentlySuccessful,
  restore: (data) => Object.assign(form, data)
})

const wizard = useWizardDraft('invoice:wizard', {
  details: { client: null, notes: '' },
  lineItems: { items: [] }
})
</script>
```

## React

```jsx
import {
  useFormDraft,
  useQueryState,
  useWizardDraft
} from '@durable-ui/react'

const wizardSteps = {
  profile: { name: '', company: '' },
  billing: { plan: 'starter' }
}

function OnboardingForm({ form }) {
  const [activeTab, setActiveTab] = useQueryState('tab', 'profile')
  const draft = useFormDraft('onboarding:profile', form.data, {
    clearWhen: form.recentlySuccessful,
    onRestore: form.setData
  })

  const wizard = useWizardDraft('onboarding:wizard', wizardSteps)

  // Render your form with draft.restore(), draft.discard(),
  // wizard.updateStep(), wizard.goNext(), and wizard.clear().
  // Render your tabs with activeTab and setActiveTab.
}
```

## Naming

Source folders use kebab-case names such as `form-draft/` and `wizard-draft/` under the `progress/` concept.

Public exports stay ecosystem-native:

```js
import { useFormDraft, useQueryState, useWizardDraft } from '@durable-ui/vue'
import {
  useFormDraft,
  useQueryState,
  useWizardDraft
} from '@durable-ui/react'
```
