# RugbyMove UI components

Shared primitives extracted from the app's existing visual patterns. Every
component renders the same classes the pages already used, so adopting them
is a no-op visually — the win is one source of truth instead of copy-pasted
Tailwind strings.

## Design rules

- **Server-component-safe by default.** Everything here except
  `SubmitButton` is hook-free and renders fine in React Server Components.
  `SubmitButton` is the one `'use client'` component because it needs
  `useFormStatus` for pending state.
- **`className` always merges last** (via `cn`), so callers can extend or
  override any component for one-off layouts.
- **Accessibility is built in, not opt-in**: error banners are
  `role="alert"`, pending submits set `aria-busy`, buttons have visible
  focus rings, `Collapsible` is native `<details>` (keyboard/SR support
  with zero JS), decorative icons are `aria-hidden`.

## Components

| Component | Use for | Notes |
|---|---|---|
| `Button` | Plain buttons | `variant`: primary / secondary / danger / ghost; `size`: sm / md |
| `buttonVariants()` | Links that look like buttons | `<Link className={buttonVariants('secondary')}>` |
| `SubmitButton` | Submits in server-action forms | Auto loading state: disabled + spinner + `aria-busy` while pending |
| `Label` / `Input` / `Textarea` / `Select` | Form controls | Consistent focus styles; `Select` styles its options for the dark theme |
| `FormField` | Label + control + description | Pass `htmlFor` matching the control's `id`; `optional` adds the muted hint |
| `Badge` | Roles, categories, counts | `tone`: blue / green / red / purple / neutral |
| `Banner` | `?message=` / `?error=` feedback | `tone="error"` announces immediately (`role="alert"`) |
| `Collapsible` | Sidebar panels | Native `<details>`; `defaultOpen` to start expanded |
| `EmptyState` | Lists with no content | Pair the message with an `action` so users know what to do next |

## Usage

```tsx
import {
  Badge, Banner, Collapsible, EmptyState,
  FormField, Input, SubmitButton, buttonVariants,
} from '@/components/ui'

// Feedback after a server-action redirect
{searchParams.error && <Banner tone="error" className="mt-4">{searchParams.error}</Banner>}

// A settings form
<form action={updateOrg} className="space-y-4">
  <input type="hidden" name="org_id" value={orgId} />
  <FormField htmlFor="name" label="Name">
    <Input id="name" name="name" required maxLength={120} defaultValue={org.name} />
  </FormField>
  <FormField htmlFor="description" label="Description" optional>
    <Textarea id="description" name="description" rows={2} maxLength={2000} />
  </FormField>
  <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
</form>

// Link styled as a button
<Link href={`/portal/${id}`} className={buttonVariants('secondary')}>Player view</Link>
```

## Conventions for new components

1. Keep it hook-free unless it genuinely needs client state; if it does,
   isolate the `'use client'` part as its own file (the `SubmitButton`
   pattern) so pages stay server components.
2. Variants are typed string unions backed by a `Record<Variant, string>`
   class map — no string concatenation of class fragments.
3. Forward refs on anything a parent might focus or measure.
4. Document the intended usage with a JSDoc example on the component.
