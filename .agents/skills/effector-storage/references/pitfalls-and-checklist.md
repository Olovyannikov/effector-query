# Pitfalls and Checklist

## Common Pitfalls

- Missing `key` and unnamed store/source causes runtime error.
- `source === target` is invalid for non-store units.
- Adding `pickup` disables automatic initial restore.
- Sync adapters may trigger `done/fail/finally` immediately during `persist` call.
- Query adapter can create noisy history without batching (`timeout`).
- Broadcast adapter can desync under high-frequency concurrent updates.
- Contract mismatch does not automatically revert persisted value.
- Unsubscribe/desist must be kept and used where lifecycle teardown is required.

## Pre-Delivery Checklist

- Adapter choice matches environment and durability needs.
- Key strategy is explicit (`key`, optional `keyPrefix`).
- Serialization is stable and tested for representative payloads.
- `fail`/`finally` handling is defined for operational visibility.
- For query sync, method and timeout are intentional.
- For SSR/universal apps, fallback strategy (`either`) is explicit.
- Teardown strategy (`Subscription`) is documented where relevant.
