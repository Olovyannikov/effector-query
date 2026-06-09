# Migration Notes (legacy to v2-focused usage)

Use these notes when user code references old Patronum API forms.

## General rule

- Prefer modern v2-style shorthand as primary recommendation.
- Show legacy-to-modern mapping only when codebase indicates pre-v2 patterns.

## Frequent mappings

### `debounce`

- Legacy: `debounce({ source, timeout })`
- Modern shorthand: `debounce(source, timeout)`
- Target overload still available: `debounce({ source, timeout, target })`

### `throttle`

- Legacy: `throttle({ source, timeout })`
- Modern shorthand: `throttle(source, timeout)`
- Target overload still available: `throttle({ source, timeout, target })`

### `pending`

- Legacy common: `pending({ effects: [fx1, fx2], of: "some" })`
- Modern shorthand for default strategy: `pending([fx1, fx2])`
- Keep object form when `of` must be explicit.

### `status`

- Legacy common: `status({ effect, defaultValue })`
- Modern shorthand: `status(effect)`
- Keep object form when custom `defaultValue` is required.

### `time`

- Legacy common: `time({ clock, getNow, initial })`
- Modern shorthand: `time(clock)` for default behavior.
- Keep object form for custom clock reader and initial state.

## Historical large breaking shift

Older pre-1.0 patterns often used positional arguments where modern forms use object configs (for example `splitMap`, `reshape`, `combineEvents`, `spread`, and others).
When such code appears, provide direct before/after rewrite with current signature.

## Migration response pattern

1. Identify legacy signature in user snippet.
2. Provide modern replacement.
3. Mention behavior parity and any caveat.
4. Keep snippet compact and runnable.
