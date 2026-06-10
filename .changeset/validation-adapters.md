---
'effector-refetch': minor
---

More validation adapters: `runtypesContract` (runtypes) and `ioTsContract` (io-ts, reads the Either
structurally — no fp-ts import), alongside the existing `zodContract` / `standardSchemaContract`.
Like the others they're structural (the library isn't imported — you pass your validator). Any
other library (superstruct, typed-contracts, hand-written guards) is a one-line `createContract`.
