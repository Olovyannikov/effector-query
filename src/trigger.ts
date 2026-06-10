import { createEvent, type Event, type EventCallable } from 'effector';

/**
 * The `@@trigger` protocol (from [withease], shared with farfetched): a unit
 * that other libraries can react to without importing it. An object implements
 * it by exposing a `'@@trigger'()` method returning three units:
 *
 *  - `fired`    — the event consumers listen to (the trigger activated);
 *  - `setup`    — consumers call it to start the trigger;
 *  - `teardown` — consumers call it to stop the trigger.
 *
 * effector-refetch queries and mutations implement it (`fired` = `finished.done`),
 * so they can drive farfetched's `keepFresh({ triggers })` — and our own
 * {@link keepFresh} accepts any `@@trigger` object in return.
 *
 * [withease]: https://withease.effector.dev/protocols/trigger.html
 */
export interface Trigger {
  '@@trigger': () => {
    fired: Event<unknown>;
    setup: EventCallable<void>;
    teardown: EventCallable<void>;
  };
}

/** True when `value` implements the `@@trigger` protocol. */
export function isTrigger(value: unknown): value is Trigger {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { '@@trigger'?: unknown })['@@trigger'] === 'function'
  );
}

/**
 * Build a memoized `@@trigger` implementation around `source`. `fired` is the
 * `source` event itself — for a scoped unit (like a query) the trigger fires
 * whenever the unit fires, in whatever scope, so it stays fork-correct.
 *
 * `setup`/`teardown` are real events provided for protocol compatibility, but
 * they do **not** gate firing: a query has no external resource to start/stop —
 * it runs on its own (scoped) lifecycle. The same object is returned on every
 * call.
 */
export function makeTrigger<T>(
  source: Event<T>,
  name?: string,
): () => { fired: Event<T>; setup: EventCallable<void>; teardown: EventCallable<void> } {
  let built: { fired: Event<T>; setup: EventCallable<void>; teardown: EventCallable<void> } | null = null;
  return () => {
    if (built) return built;
    const setup = createEvent<void>(name ? `${name}.setup` : undefined);
    const teardown = createEvent<void>(name ? `${name}.teardown` : undefined);
    built = { fired: source, setup, teardown };
    return built;
  };
}
