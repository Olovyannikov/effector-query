# Patronum Pitfalls and Caveats

## 1. Mixing old and new signatures

- Problem: combining legacy object forms and modern shorthand inconsistently.
- Rule: for v2.x, prefer shorthand where available (`status(effect)`, `pending([fx])`, `time(clock)`, `debounce(source, timeout)`, `throttle(source, timeout)`).

## 2. Wrong module naming

- Problem: writing `patronum/splitMap` instead of `patronum/split-map`.
- Rule: module names are kebab-case, exports are camelCase.

## 3. Confusing `pending` and `inFlight`

- `pending` -> boolean aggregate.
- `inFlight` -> numeric count.
- Choose by UI need; do not substitute one for the other.

## 4. `pending({ of: "every" })` semantics

- `every` means all tracked effects must be pending simultaneously.
- Many users expect "any"; that is `some` (default).

## 5. `condition` branch assumptions

- `if` accepts store, literal, or predicate function.
- Objects in literal comparison are checked by reference identity.

## 6. `debounce` vs `throttle`

- `debounce`: emit after inactivity window.
- `throttle`: emit at most once per interval.
- Wrong choice changes UX behavior significantly.

## 7. `interval` edge flags

- `leading: true` fires immediate tick on `start`.
- `trailing: true` can fire final tick on `stop`.
- Mention both when describing polling behavior.

## 8. `time({ getNow })` sync requirement

- `getNow` must be synchronous.
- Async function breaks intended sampling semantics.

## 9. `splitMap` case handlers

- Handlers are mappers, not pure predicates.
- Return `undefined` to skip case emission.

## 10. `spread` key mismatch

- Payload keys and `targets` keys must align.
- Mismatch leads to silent non-updates or wrong wiring.

## 11. `debug` in scoped apps

- For SSR/forked scopes, prefer scope registration for readable logs.
- Mention that `debug` is generally imported from `patronum/debug`.

## 12. Overusing Patronum where plain Effector is clearer

- If task is a one-liner with native `sample`/`combine`, do not force complex operator composition.
- Prioritize readability and predictable behavior.
