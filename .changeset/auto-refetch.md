---
'effector-query': minor
---

Automatic refetching (1.1): `refetchInterval` polling option on `createQuery`
(number or reactive `Store<number>`, paused while disabled, stops on reset,
fork-correct), plus opt-in browser operators `refetchOnWindowFocus` and
`refetchOnReconnect`. New "Auto-refetch & polling" recipe, including composing
with patronum (`interval` / `debounce` / `throttle`).
