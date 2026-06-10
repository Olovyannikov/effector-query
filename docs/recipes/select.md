# Selecting slices

Sometimes a component needs only a **slice** of a query's data and should re-render only when
that slice changes (TanStack calls this `select`). There's nothing to add — a query's `$data` is a
plain effector store, so the native primitives already do it.

::: tip select vs `mapData`
`mapData` reshapes the data for the **whole query** (every consumer sees the mapped value).
A slice is **per-consumer**: each component derives its own view without touching the query.
Reach for `mapData` when the shape is global, for a slice when it's local.
:::

## React / Solid — `useStoreMap`

`useStoreMap` subscribes to a derived value and only re-renders when it actually changes:

```ts
// React — effector-react
import { useStoreMap } from 'effector-react';
const name = useStoreMap(userQuery.$data, (u) => u?.name ?? '');

// Solid — effector-solid (returns an accessor)
import { useStoreMap } from 'effector-solid';
const name = useStoreMap(userQuery.$data, (u) => u?.name ?? '');
// use name()
```

Need params in the selector key? Use the full form: `useStoreMap({ store, keys: [id], fn })`.

## Vue — `computed`

effector-vue has no `useStoreMap`, but `computed` over the bound ref is equivalent:

```ts
import { useUnit } from 'effector-vue/composition';
import { computed } from 'vue';

const data = useUnit(userQuery.$data);
const name = computed(() => data.value?.name ?? '');
```

## Headless / model code

Outside a component, derive a store once with `.map` — it updates only when the slice changes:

```ts
const $userName = userQuery.$data.map((u) => u?.name ?? null);
```

This is the building block the bindings use; create it at module scope (not per render) and
subscribe to it anywhere.
