# Patronum Recipes (v2.x)

Use this file for task-first operator selection.

## Input and UI timing

### Debounced search input

- Use `debounce` when only the latest user input should trigger API call.

```ts
import { createEvent } from "effector";
import { debounce } from "patronum/debounce";

const queryChanged = createEvent<string>();
const querySettled = debounce(queryChanged, 300);
```

### Click guard against spam

- Use `throttle` when repeated clicks should be rate-limited.

```ts
import { createEvent } from "effector";
import { throttle } from "patronum/throttle";

const clicked = createEvent<void>();
const safeClick = throttle(clicked, 1000);
```

## Loading and effect lifecycle

### Global loading indicator

- Use `pending` for boolean state and `inFlight` for numeric counters.

```ts
import { createEffect } from "effector";
import { pending, inFlight } from "patronum";

const loadUserFx = createEffect(async () => ({}));
const loadPostsFx = createEffect(async () => []);

const $isLoading = pending([loadUserFx, loadPostsFx]);
const $requestsCount = inFlight({ effects: [loadUserFx, loadPostsFx] });
```

### Status badge for one effect

```ts
import { createEffect } from "effector";
import { status } from "patronum/status";

const submitFx = createEffect(async () => "ok");
const $status = status(submitFx);
```

## Predicate logic over stores

### Composite access checks

```ts
import { and, or, not } from "patronum";

const $canOpenPanel = and($isLoggedIn, or($isAdmin, not($isBlocked)));
```

### Branch events with else path

```ts
import { condition } from "patronum/condition";

condition({
  source: formSubmitted,
  if: $isValid,
  then: submitFx,
  else: showValidationError,
});
```

## Data shaping and routing

### Route payload fields to targets

```ts
import { spread } from "patronum/spread";

spread({
  source: userLoaded,
  targets: {
    id: $userId,
    name: $userName,
  },
});
```

### Split one event into typed cases

```ts
import { splitMap } from "patronum/split-map";

const routed = splitMap({
  source: messageReceived,
  cases: {
    user: (msg) => (msg.kind === "user" ? msg : undefined),
    system: (msg) => (msg.kind === "system" ? msg : undefined),
  },
});
```

### Wait for all events

```ts
import { combineEvents } from "patronum/combine-events";

const ready = combineEvents({
  events: {
    config: configLoaded,
    profile: profileLoaded,
  },
});
```

## Time and polling

### Controlled interval with start and stop

```ts
import { interval } from "patronum/interval";

const { tick, isRunning } = interval({
  timeout: 5000,
  start: startPolling,
  stop: stopPolling,
});
```

### Timestamp refresh on any clock

```ts
import { time } from "patronum/time";

const $now = time(refreshTriggered);
```

## Debug and diagnostics

### Basic debug output

```ts
import { debug } from "patronum/debug";

debug($store, eventTriggered, someFx);
```

### Trace mode for causal chains

```ts
import { debug } from "patronum/debug";

debug({ trace: true }, $store, someFx);
```
