# Auto-refetch & polling

## Polling — `refetchInterval`

Refetch on a timer while the query is started and enabled:

```ts
const stats = createQuery({ effect: fetchStatsFx, refetchInterval: 5000 }); // every 5s
stats.start();
```

After each settle (success or failure) the query waits `refetchInterval` ms, then
`refresh`es with the last params (bypassing cache). It's paused while `$enabled` is
`false`, stops on `reset`, and is fork-correct (each scope polls independently). The
interval can be reactive — pass a `Store<number>` and change it live (e.g. faster while
a tab is active):

```ts
createQuery({ effect: fx, refetchInterval: $pollMs });
```

## On window focus / reconnect

Opt-in, browser-only, tree-shakeable:

```ts
import { refetchOnWindowFocus, refetchOnReconnect } from 'effector-refetch';

const stop1 = refetchOnWindowFocus(userQuery);
const stop2 = refetchOnReconnect(userQuery);
// call stop1() / stop2() to detach
```

Both refetch with the query's last params, only if it has run and is enabled. They read
the no-scope store, so they're meant for a single-client app; for scoped apps, drive
`query.refetch` yourself with `scopeBind`.

## Offline / network mode

`createNetworkBarrier()` is a [barrier](/recipes/auth-barrier) that **locks while the browser is
offline** and unlocks on reconnect. Gate queries with it and their runs pause when the connection
drops, then resume automatically when it returns — no per-query wiring:

```ts
import { createNetworkBarrier, refetchOnReconnect } from 'effector-refetch';

const offline = createNetworkBarrier();

const userQuery = createQuery({ effect: fetchUserFx, barrier: offline });
// or apply it to a whole group: createQueryFactory({ barrier: offline })

offline.$online; // Store<boolean> — drive an "offline" banner
refetchOnReconnect(userQuery); // optional: also refresh already-loaded data
offline.stop(); // detach the online/offline listeners on teardown
```

A run started while offline sits in `pending` (the effect body isn't entered) until the network
returns. Browser-only — on the server the barrier stays open (online).

## Compose with patronum

A query's triggers are plain effector events, so you can drive them with any
[patronum](https://patronum.effector.dev/operators/) operator — no special API needed:

```ts
import { interval, debounce, throttle } from 'patronum';

// debounced search-as-you-type
debounce({ source: queryChanged, timeout: 300, target: searchQuery.start });

// custom polling with start/stop control
const { tick } = interval({ timeout: 10_000, start: pageOpened, stop: pageClosed });
sample({ clock: tick, source: searchQuery.$params, target: searchQuery.refetch });

// throttle a refresh button
throttle({ source: refreshClicked, timeout: 1000, target: dashboard.refresh });
```

Use the built-in `refetchInterval` for the common case; reach for patronum when you want
explicit start/stop, debounce or throttle semantics.
