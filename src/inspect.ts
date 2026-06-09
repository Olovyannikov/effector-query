import type { Query } from './types';

export type QueryLogType =
  | 'start'
  | 'run'
  | 'done'
  | 'fail'
  | 'aborted'
  | 'cache-hit'
  | 'cache-miss'
  | 'retry';

export interface QueryLogEntry {
  query: string;
  type: QueryLogType;
  params?: unknown;
  attempt?: number;
  error?: unknown;
  /** Milliseconds from the last `run` to this `done`/`fail`. */
  durationMs?: number;
}

export interface QueryLoggerOptions {
  /** Label for the `query` field. Default: 'query'. */
  name?: string;
  /** Receives each entry. Default: console.log. */
  handler?: (entry: QueryLogEntry) => void;
  /** Clock, overridable in tests. Default: () => Date.now(). */
  now?: () => number;
}

/**
 * Subscribe to a query's lifecycle and emit structured log entries
 * (start → run → done/fail/abort, plus cache hit/miss and retries) with
 * per-run duration. Returns an unsubscribe function.
 *
 *   const stop = attachQueryLogger(todosQuery, { name: 'todos' });
 */
export function attachQueryLogger(
  query: Query<any, any, any, any>,
  options: QueryLoggerOptions = {},
): () => void {
  const {
    name = 'query',
    handler = (e) => console.log('[effector-query]', e),
    now = () => Date.now(),
  } = options;
  const { inspect } = query.__;

  let runAt: number | null = null;
  const emit = (entry: QueryLogEntry) => handler(entry);

  const subs = [
    inspect.start.watch(({ params }) => emit({ query: name, type: 'start', params })),
    inspect.run.watch(({ params, attempt }) => {
      runAt = now();
      emit({ query: name, type: 'run', params, attempt });
    }),
    inspect.cacheHit.watch(({ params }) => emit({ query: name, type: 'cache-hit', params })),
    inspect.cacheMiss.watch(({ params }) => emit({ query: name, type: 'cache-miss', params })),
    inspect.retry.watch(({ params, attempt, error }) =>
      emit({ query: name, type: 'retry', params, attempt, error }),
    ),
    inspect.done.watch(({ params }) =>
      emit({ query: name, type: 'done', params, durationMs: runAt == null ? undefined : now() - runAt }),
    ),
    inspect.fail.watch(({ params, error }) =>
      emit({
        query: name,
        type: 'fail',
        params,
        error,
        durationMs: runAt == null ? undefined : now() - runAt,
      }),
    ),
    inspect.aborted.watch(({ params }) => emit({ query: name, type: 'aborted', params })),
  ];

  return () => subs.forEach((s) => s.unsubscribe());
}
