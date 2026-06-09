---
'effector-refetch': patch
---

Deep devtools labelling: `name` (or `debug: true`) now labels every internal seam in the
effector inspector — `requested`, `proceed`, `toExec`, `lookupFx`, `toRun`, `rawDone`,
`acceptedDone`, `scheduleRetry`, `failed`, `finalFail`, `$runId`, `$attempts`, the lifecycle
events, and the poll/prefetch effects — not just the public entry points. Without a name the
internal units stay anonymous, so production inspector output is unchanged.
