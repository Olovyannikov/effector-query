# Selecting slices

Sometimes a component needs only a **slice** of a query's data and should re-render only when
that slice changes (TanStack calls this `select`). There's nothing to add — a query's `$data` is a
plain effector store, so the native primitives already do it.

::: tip select vs `mapData`
`mapData` reshapes the data for the **whole query** (every consumer sees the mapped value).
A slice is **per-consumer**: each component derives its own view without touching the query.
Reach for `mapData` when the shape is global, for a slice when it's local.
:::

## In a component — `useStoreMap`

Every binding ships `useStoreMap`: it subscribes to a derived value and only updates when that
value actually changes.

```ts
// React — effector-react
import { useStoreMap } from 'effector-react';
const name = useStoreMap(userQuery.$data, (u) => u?.name ?? '');

// Solid — effector-solid (returns an accessor — call it: name())
import { useStoreMap } from 'effector-solid';
const name = useStoreMap(userQuery.$data, (u) => u?.name ?? '');
```

```ts
// Vue — effector-vue/composition (config form; returns a ComputedRef — name.value)
import { useStoreMap } from 'effector-vue/composition';
const name = useStoreMap({ store: userQuery.$data, fn: (u) => u?.name ?? '' });
```

Need params in the selector key (e.g. pick one item by id)? Pass `keys`:
`useStoreMap({ store, keys: [id], fn: (list, [id]) => list.find((x) => x.id === id) })`
(React/Solid take the short `useStoreMap(store, fn)` form too).

## Headless / model code

Outside a component, derive a store once with `.map` — it updates only when the slice changes:

```ts
const $userName = userQuery.$data.map((u) => u?.name ?? null);
```

This is the building block the bindings use; create it at module scope (not per render) and
subscribe to it anywhere.
