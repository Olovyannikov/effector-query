# Core Patterns

## Contents
- API forms
- Key options
- Lifecycle signals
- Domain and composition patterns

## API Forms

```ts
import { persist, createPersist } from 'effector-storage/<adapter-or-core>'

persist({ store, key, ...options })
persist({ source, target, key, ...options })
```

- `store` form: easiest for straightforward two-way sync with one store.
- `source/target` form: use when persisted representation differs from target update path.

Use `createPersist(defaults)` to preconfigure shared options (`keyPrefix`, `pickup`, `context`, `contract`).

## Key Options

- `key`: storage key. If omitted, store/source name is used.
- `keyPrefix`: namespacing for all keys.
- `clock`: write only when this unit triggers.
- `pickup`: manual read trigger. Important: disables automatic initial read.
- `context`: runtime context passed to adapter `get/set`.
- `contract`: validates read values (`undefined` is always accepted).
- `done`, `fail`, `finally`: operation telemetry hooks.

## Lifecycle Signals

Operation channels include payload metadata:
- `key`, `keyPrefix`, `operation`
- `done`: successful `get`/`set`
- `fail`: failed `get`/`set`/`validate`
- `finally`: union of done/fail

If `fail` is not provided, errors go to `console.error`.

## Domain and Composition Patterns

Persist all stores in a domain:

```ts
app.onCreateStore((store) => persist({ store }))
```

Persist a partial view safely:

```ts
persist({
  source: $entity.map((x) => x.id),
  target: idChanged,
  key: 'entity-id',
})
```

Keep mapped values plain to reduce circular update risks.
