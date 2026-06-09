# Adapter Matrix

## Contents
- Quick selection
- Adapter-specific notes
- Key-area synchronization model

## Quick Selection

- `local`: browser, persistent, cross-tab sync via `storage` events.
- `session`: browser, tab-scoped persistence.
- `query`: URL query synchronization (state reflection and navigation behavior).
- `broadcast`: cross-context sync without durable persistence.
- `storage`: generic synchronous `Storage`-compatible adapter factory.
- `asyncStorage`: generic async key-value adapter factory.
- `memory`: in-memory persistence, useful for tests.
- `nil`: no-op adapter (`noop=true`).
- `log`: no-op adapter with debug logging (`noop=true`).

## Adapter-Specific Notes

### `local` / `session`
- Options: `sync`, `serialize`, `deserialize`, `timeout`, `def`.
- `local` defaults `sync: true`, `session` defaults `sync: false`.
- `timeout` throttles writes and flushes on unload/desist.

### `query`
- Options: `method`, `state`, `serialize`, `deserialize`, `timeout`, `def`.
- Default method is `pushState`.
- `timeout` batches updates globally; shortest timeout wins.

### `broadcast`
- Option: `channel`.
- Useful for tabs/workers synchronization where values should not be written to local/session storage.
- Not durable; possible race/desync under very frequent updates.

### `storage` / `asyncStorage`
- Use when integrating non-standard storage implementations.
- `storage`: sync `getItem/setItem` APIs.
- `asyncStorage`: async `getItem/setItem` APIs.

### `memory`, `nil`, `log`
- `memory`: deterministic test adapter.
- `nil` and `log`: explicit no-op adapters, useful with `either` fallback.

## Key-Area Synchronization Model

Stores persisted with the same effective key and same adapter key-area are internally synchronized even without direct wiring.
