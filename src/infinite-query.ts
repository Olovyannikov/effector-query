import { createEffect, createEvent, createStore, sample, type Effect, type EventCallable, type Event, type Store } from 'effector';
import { createQuery } from './create-query';
import type { ConcurrencyStrategy, QueryStatus } from './types';

export interface GetNextPageParamCtx<PageParam, Page> {
  lastPage: Page;
  allPages: Page[];
  lastPageParam: PageParam;
  allPageParams: PageParam[];
}

interface BaseInfiniteConfig<Params, PageParam, Page> {
  initialPageParam: PageParam;
  /** Return the next page param, or `null` / `undefined` when there are no more pages. */
  getNextPageParam: (ctx: GetNextPageParamCtx<PageParam, Page>) => PageParam | null | undefined;
  concurrency?: ConcurrencyStrategy;
  name?: string;
}

export interface CreateInfiniteQueryConfig<Params, PageParam, Page>
  extends BaseInfiniteConfig<Params, PageParam, Page> {
  /** Effect fetching a single page. */
  effect: Effect<{ params: Params; pageParam: PageParam }, Page, unknown>;
}
export interface CreateInfiniteQueryHandlerConfig<Params, PageParam, Page>
  extends BaseInfiniteConfig<Params, PageParam, Page> {
  handler: (ctx: { params: Params; pageParam: PageParam }) => Promise<Page> | Page;
}

export interface InfiniteQuery<Params, PageParam, Page, Error = unknown> {
  /** Load the first page (resets accumulated pages). */
  start: EventCallable<Params>;
  /** Load and append the next page (no-op when there is none, or while loading). */
  fetchNext: EventCallable<void>;
  reset: EventCallable<void>;

  $pages: Store<Page[]>;
  /** Alias of `$pages`. */
  $data: Store<Page[]>;
  $pageParams: Store<PageParam[]>;
  $hasNextPage: Store<boolean>;
  $status: Store<QueryStatus>;
  $pending: Store<boolean>;
  $error: Store<Error | null>;
  $params: Store<Params | null>;

  finished: {
    done: Event<{ params: Params; page: Page }>;
    fail: Event<{ params: Params; error: Error }>;
  };

  '@@unitShape': () => {
    pages: Store<Page[]>;
    data: Store<Page[]>;
    hasNextPage: Store<boolean>;
    status: Store<QueryStatus>;
    pending: Store<boolean>;
    error: Store<Error | null>;
    start: EventCallable<Params>;
    fetchNext: EventCallable<void>;
    reset: EventCallable<void>;
  };
}

interface PageReq<Params, PageParam> {
  params: Params;
  pageParam: PageParam;
  mode: 'reset' | 'append';
}
interface InfiniteState<PageParam, Page> {
  pages: Page[];
  pageParams: PageParam[];
  nextPageParam: PageParam | null;
  hasNextPage: boolean;
}

/**
 * Cursor/offset pagination that accumulates pages. `start` loads the first page
 * (resetting), `fetchNext` appends the next one (driven by `getNextPageParam`).
 * Built on `createQuery`, so the page fetch gets concurrency / cancellation.
 */
export function createInfiniteQuery<Params, PageParam, Page, Error = unknown>(
  config:
    | CreateInfiniteQueryConfig<Params, PageParam, Page>
    | CreateInfiniteQueryHandlerConfig<Params, PageParam, Page>,
): InfiniteQuery<Params, PageParam, Page, Error> {
  const { initialPageParam, getNextPageParam } = config;

  const call = (req: PageReq<Params, PageParam>): Promise<Page> =>
    'effect' in config
      ? (config.effect as (a: { params: Params; pageParam: PageParam }) => Promise<Page>)({
          params: req.params,
          pageParam: req.pageParam,
        })
      : Promise.resolve(config.handler({ params: req.params, pageParam: req.pageParam }));

  const pageFx = createEffect<PageReq<Params, PageParam>, Page, Error>((req) => call(req) as Promise<Page>);
  const pageQuery = createQuery<PageReq<Params, PageParam>, Page, Error>({
    effect: pageFx,
    concurrency: config.concurrency ?? 'TAKE_LATEST',
    name: config.name,
  });

  const start = createEvent<Params>();
  const fetchNext = createEvent<void>();
  const reset = createEvent<void>();

  const $params = createStore<Params | null>(null).on(start, (_p, params) => params).reset(reset);

  const initial: InfiniteState<PageParam, Page> = {
    pages: [],
    pageParams: [],
    nextPageParam: null,
    hasNextPage: false,
  };
  const $infinite = createStore<InfiniteState<PageParam, Page>>(initial)
    .on(pageQuery.finished.done, (state, { params: req, result: page }) => {
      const pages = req.mode === 'reset' ? [page] : [...state.pages, page];
      const pageParams = req.mode === 'reset' ? [req.pageParam] : [...state.pageParams, req.pageParam];
      const next = getNextPageParam({
        lastPage: page,
        allPages: pages,
        lastPageParam: req.pageParam,
        allPageParams: pageParams,
      });
      return { pages, pageParams, nextPageParam: next ?? null, hasNextPage: next != null };
    })
    .reset([reset, start]);

  const $pages = $infinite.map((s) => s.pages);
  const $pageParams = $infinite.map((s) => s.pageParams);
  const $hasNextPage = $infinite.map((s) => s.hasNextPage);

  // load first page
  sample({
    clock: start,
    fn: (params): PageReq<Params, PageParam> => ({ params, pageParam: initialPageParam, mode: 'reset' }),
    target: pageQuery.start,
  });

  // append next page when available and idle
  sample({
    clock: fetchNext,
    source: { params: $params, inf: $infinite, pending: pageQuery.$pending },
    filter: ({ params, inf, pending }) => inf.hasNextPage && !pending && params !== null,
    fn: ({ params, inf }): PageReq<Params, PageParam> => ({
      params: params as Params,
      pageParam: inf.nextPageParam as PageParam,
      mode: 'append',
    }),
    target: pageQuery.start,
  });

  const finishedDone = createEvent<{ params: Params; page: Page }>();
  const finishedFail = createEvent<{ params: Params; error: Error }>();
  sample({
    clock: pageQuery.finished.done,
    fn: ({ params: req, result: page }) => ({ params: req.params, page }),
    target: finishedDone,
  });
  sample({
    clock: pageQuery.finished.fail,
    fn: ({ params: req, error }) => ({ params: req.params, error }),
    target: finishedFail,
  });

  return {
    start,
    fetchNext,
    reset,

    $pages,
    $data: $pages,
    $pageParams,
    $hasNextPage,
    $status: pageQuery.$status,
    $pending: pageQuery.$pending,
    $error: pageQuery.$error,
    $params,

    finished: { done: finishedDone, fail: finishedFail },

    '@@unitShape': () => ({
      pages: $pages,
      data: $pages,
      hasNextPage: $hasNextPage,
      status: pageQuery.$status,
      pending: pageQuery.$pending,
      error: pageQuery.$error,
      start,
      fetchNext,
      reset,
    }),
  };
}
