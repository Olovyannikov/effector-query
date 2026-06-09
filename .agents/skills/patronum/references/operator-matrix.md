# Patronum Operator Matrix (v2.x)

Use this as the primary lookup.
Groups follow Patronum docs taxonomy: `predicate`, `effect`, `timeouts`, `combination`, `debug`.

| Operator | Group | Use when | Typical call | Returns | Caveat |
| --- | --- | --- | --- | --- | --- |
| `and` | predicate | All stores must be truthy | `and($a, $b, $c)` | `Store<boolean>` | Store-only inputs |
| `or` | predicate | At least one store is truthy | `or($a, $b)` | `Store<boolean>` | Store-only inputs |
| `not` | predicate | Invert boolean-like store value | `not($flag)` | `Store<boolean>` | Input should be store |
| `some` | predicate | Any store matches predicate/value | `some({ stores, predicate })` | `Store<boolean>` | Predicate/value overloads |
| `every` | predicate | All stores match predicate/value | `every({ stores, predicate })` | `Store<boolean>` | Predicate/value overloads |
| `equals` | predicate | Compare store/value by strict equality | `equals($a, $b)` | `Store<boolean>` | Objects compare by reference |
| `empty` | predicate | Check `null`/`undefined` store state | `empty($value)` | `Store<boolean>` | Narrow use-case vs generic predicate |
| `either` | predicate | Select one of two values by condition | `either({ source, then, else })` | `Store<Then \| Else>` | Prefer explicit condition source |
| `condition` | predicate | Branch `then`/`else` from unit | `condition({ source, if, then, else })` | Same unit as source | `if` supports store/value/fn |
| `once` | predicate | Allow first trigger only | `once(unit)` | `Event<T>` | Source can still fire; result gates |
| `reset` | predicate | Reset stores by clock | `reset({ target, clock })` | `void` or `EventCallable<void>` | Clock optional in one overload |
| `pending` | effect | Aggregate effect pending as boolean | `pending([fx1, fx2])` | `Store<boolean>` | Strategy `some` vs `every` |
| `inFlight` | effect | Count currently pending effects | `inFlight({ effects })` | `Store<number>` | Numeric count, not boolean |
| `status` | effect | Track effect state enum | `status(effect)` | `Store<'initial' \| 'pending' \| 'done' \| 'fail'>` | `defaultValue` optional |
| `debounce` | timeouts | Emit after silence window | `debounce(source, timeout)` | `Event<T>` or target | Timeout can be store |
| `throttle` | timeouts | Emit at most once per timeout | `throttle(source, timeout)` | `Event<T>` or target | Different semantics from debounce |
| `delay` | timeouts | Shift trigger in time | `delay({ source, timeout })` | Delayed unit/target | `timeout` can be fn/store |
| `interval` | timeouts | Controlled periodic ticks | `interval({ timeout, start, stop })` | `{ tick, isRunning }` | `leading`/`trailing` change behavior |
| `time` | timeouts | Read current timestamp on clock | `time(clock)` | `Store<number>` (or generic) | `getNow` must be sync |
| `combineEvents` | combination | Wait until all events fire | `combineEvents({ events })` | `Event<shape>` | Supports array and object shapes |
| `splitMap` | combination | Split event payload by cases | `splitMap({ source, cases })` | Object of events | Case handlers may return `undefined` |
| `spread` | combination | Route object fields to targets | `spread({ source, targets })` | `void`/source-target wiring | Keys must align with payload shape |
| `reshape` | combination | Derive store object into stores | `reshape({ source, shape })` | Object of stores | Keep pure mapping fns |
| `snapshot` | combination | Read source value at clock | `snapshot({ source, clock })` | `Store` or sampled unit | Check overload for clock-less form |
| `format` | combination | Build formatted string store | `` format`Hi ${$name}` `` | `Store<string>` | Template and array overloads |
| `previous` | combination | Keep previous store value | `previous($store)` | `Store<T \| null>` | Initial previous is `null` by default |
| `readonly` | combination | Expose read-only unit facade | `readonly($store)` | Same shape as source | Intent is API surface protection |
| `debug` | debug | Log unit updates and traces | `debug($store, event, fx)` | side effects only | Prefer `patronum/debug`; scope support |

## Import Rules

- Root import: `import { debounce } from "patronum";`
- Per-operator import: `import { debounce } from "patronum/debounce";`
- Special note: `debug` is typically imported from `patronum/debug`.

## Version Notes (v2 default)

- In v2.x, shorthand forms are preferred where supported: `status(effect)`, `pending([fx])`, `time(clock)`, `debounce(source, timeout)`, `throttle(source, timeout)`.
- When handling older code, check `migration-notes.md`.
