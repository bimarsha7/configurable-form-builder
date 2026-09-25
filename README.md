# ConfigurableFormBuilder

A React component for building a form: add fields, configure them, nest groups,
preview the form live, and export or import the configuration as JSON.

Built with **React 19 + TypeScript + Vite**. It uses no state-management library,
no form library and no UI framework (all styling is plain CSS).

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + integration tests (Vitest + Testing Library)
npm run build      # type-check + production build
npm run lint       # oxlint
```

Requires Node 20.19+ (tested on Node 24).

## Features (mapped to the brief)

| Requirement | Where |
| --- | --- |
| **1. Field types**: `text`, `number`, `group` (groups nest recursively) | `types/form.ts`, `components/builder/*` |
| **2a. Common props**: label, required | `FieldEditor.tsx` |
| **2b. Type-specific**: number `min`/`max` (optional), group `children` | `NumberBoundsEditor.tsx`, `FieldEditor.tsx` |
| **2c. Delete, and move up/down within the same group** | `lib/tree.ts` (`removeField`, `moveField`) |
| **3a. Preview updates immediately** | `PreviewPanel.tsx` reads the same context as the builder |
| **3b. Required validation** | `lib/validation.ts` |
| **3c. Predictable handling of invalid input** | see "Invalid number input" below |
| **4a. Export JSON** (modal with textarea, copy, download) | `json/ExportDialog.tsx` |
| **4b. Import JSON** (paste, or load a file) with validation | `json/ImportDialog.tsx`, `lib/schema.ts` |
| **5. Only Context, custom hooks, memo/useCallback/useMemo** | `state/*`, `hooks/*` |
| **Bonus: no UI framework** | `index.css` (design tokens, light/dark mode) |
| **Extra: theme switcher** (System / Light / Dark, remembered) | `hooks/useTheme.ts`, `ThemeSwitcher.tsx` |

## Architecture

```
src/
  types/form.ts            Discriminated-union config model (FieldConfig, FormConfig)
  lib/
    tree.ts                Pure, immutable tree operations (add/update/remove/move)
    schema.ts              Parses and validates imported JSON
    validation.ts          Preview validation and typed submission output
  state/
    builderReducer.ts      useReducer state machine; the reducer is pure
    contexts.ts            Separate State and Actions contexts
    BuilderProvider.tsx    Wires the reducer to the contexts; stable action object
    hooks.ts               useBuilderState / useBuilderActions / useFormConfig
  hooks/
    usePreviewForm.ts      Values, touched fields, errors and submit for the preview
    usePersistedConfig.ts  Saves the config to localStorage (demo convenience)
    useTheme.ts            Theme preference (system/light/dark), persisted and applied to <html>
  components/
    ConfigurableFormBuilder.tsx   Public component: toolbar, two panels, dialogs
    ThemeSwitcher.tsx      App-level System / Light / Dark control (native radios)
    builder/               Structure editor (recursive FieldList ↔ FieldEditor)
    preview/               Live preview (recursive PreviewFields)
    json/                  Export / import dialogs
    ui/                    Modal (native <dialog>), Icon
```

### Key decisions

- **One source of truth.** The config tree lives in a single `useReducer`, and the
  builder and preview both read it through Context. The preview is simply another
  view of the same state, so it can't fall out of sync.
- **Tree operations are pure functions with structural sharing.** They are kept out
  of the components and unit-tested separately. Only the nodes on the path to a
  change are recreated, and a no-op returns the same reference. This is what makes
  `React.memo` on `FieldEditor` effective: editing one field re-renders only the
  cards on its path, not the whole tree.
- **Split contexts.** Actions sit in their own context. They are created once with
  `useMemo` over `dispatch`, so they never change, and components that only
  dispatch never re-render because the state changed.
- **The reducer is deterministic.** Ids are generated in the action creator, not in
  the reducer, so StrictMode's double invocation can't create mismatched ids.
- **The config is a discriminated union.** `min`/`max` exist only on number fields
  and `children` only on groups. TypeScript enforces this, and so does `applyPatch`
  at runtime.
- **The component is reusable.** `<ConfigurableFormBuilder initialConfig onChange />`
  doesn't depend on the app around it. Persisting to localStorage happens in
  `App.tsx` through `onChange`.

### Validation semantics

- **Required text/number field:** it must hold a non-whitespace value.
- **Required group:** at least one field inside it (at any depth) must be filled.
  Required fields inside a group are always enforced, whether or not the group
  itself is required.
- **Min / max:** these are inclusive. The builder won't commit `min > max`. It shows
  the error, keeps the last valid value, and reverts the input when it loses focus.
  So an exported config always passes import validation.
- **When errors appear:** after a field loses focus, or after a submit attempt.
  A failed submit moves focus to the first invalid control.

### Invalid number input

Number fields in the preview are rendered as `type="text"` with `inputMode="decimal"`,
not as `type="number"`. Native number inputs behave differently from browser to
browser: Chrome blocks letters, while Firefox accepts them but reports `value === ""`.
That means input like `12abc` would either be impossible to type or silently read
as empty. Here the raw text is kept exactly as typed and parsed with a strict
pattern that rejects hex, `Infinity` and trailing characters. The user then sees a
clear "Enter a valid number." message. Mobile users still get a numeric keyboard.
On submit, values are converted to real numbers or `null`.

### Import

- It accepts the exported shape `{ "version": 1, "fields": [...] }` or a bare array
  of fields.
- The import is all-or-nothing: any error rejects the whole file, and each error is
  reported with a path (e.g. `fields[2].children[0].label: must be a string`).
- It checks field types, label and required types, finite `min`/`max` with
  `min <= max`, duplicate ids, and the nesting depth (at most 32 levels). Unknown
  keys are stripped. Missing ids are generated, with a notice.

### Accessibility

The preview is a real form. Groups render as `<fieldset>`/`<legend>`. Inputs have
proper labels, `aria-invalid`, `aria-required` and `aria-describedby` pointing to
hints and errors. Every icon button has a descriptive name (e.g. *Move "Street" up*).
When moving a field disables the button that was clicked, focus moves to the other
button. Dialogs use the native `<dialog>`, which provides focus containment and
Escape to close. The page respects `prefers-reduced-motion`.

### Theming

A System / Light / Dark switcher sits in the page header. "System" (the default)
follows the OS setting and updates live when it changes; an explicit choice
overrides it and is saved to localStorage. The resolved theme is written to
`<html data-theme>`, and the CSS defines the dark tokens once under
`:root[data-theme='dark']`. A small inline script in `index.html` applies the saved
theme before first paint, so there is no flash of the wrong theme on reload. The
switcher lives in `App.tsx`, not inside `ConfigurableFormBuilder`, so the component
stays themeable by whatever app hosts it.

## Tests

`npm test` runs 47 tests:

- `lib/tree.test.ts`: every tree operation, including structural sharing and the
  edge cases for moving.
- `lib/schema.test.ts`: export/import round trip, error paths, duplicate ids,
  min > max, depth limit.
- `lib/validation.test.ts`: number parsing, required and group semantics, submission
  output.
- `components/ConfigurableFormBuilder.test.tsx`: user-level flows. These cover adding
  and nesting fields, live preview, required and invalid-number validation,
  reordering and deleting, the min/max guard, and export → import.
- `components/ThemeSwitcher.test.tsx`: following the system theme (including live
  changes), overriding and persisting a choice, ignoring invalid stored values.

## Possible next steps

Undo/redo (the reducer makes this straightforward), drag-and-drop reordering,
moving fields between groups, more field types, and virtualising very large forms.
