import { createEffect, type Effect } from 'effector';

export interface RequestContext {
  /**
   * AbortSignal for the request. Pass it to your HTTP client (ofetch/axios).
   * NOTE: effector effects are not auto-cancelled yet, so this signal does not
   * fire on `query.cancel` today — it's here for adapter compatibility and for
   * the real-cancellation work on the roadmap (0.3).
   */
  signal: AbortSignal;
}

/** Normalized request error: works across ofetch (FetchError) and axios (AxiosError). */
export class RequestError extends Error {
  readonly status?: number;
  readonly data?: unknown;
  readonly reason?: unknown;

  constructor(message: string, init?: { status?: number; data?: unknown; reason?: unknown }) {
    super(message);
    this.name = 'RequestError';
    this.status = init?.status;
    this.data = init?.data;
    this.reason = init?.reason;
  }
}

export function normalizeRequestError(err: unknown): RequestError {
  if (err instanceof RequestError) return err;
  const e = err as {
    message?: string;
    status?: number;
    statusCode?: number;
    data?: unknown;
    response?: { status?: number; data?: unknown };
  };
  const status = e?.response?.status ?? e?.status ?? e?.statusCode;
  const data = e?.response?.data ?? e?.data;
  const message = e?.message ?? 'Request failed';
  return new RequestError(message, { status, data, reason: err });
}

export interface CreateRequestFxOptions {
  name?: string;
  /** Normalize thrown errors into `RequestError` (default: true). */
  normalizeErrors?: boolean;
}

/**
 * Typed request-effect factory. Wrap any HTTP client into an effector Effect:
 *
 *   const getUserFx = createRequestFx<{ id: number }, User>(
 *     ({ id }, { signal }) => ofetch(`/api/users/${id}`, { signal }),
 *   );
 *   const userQuery = createQuery({ effect: getUserFx, cache: true });
 *
 * The resulting effect is a first-class effector unit — visible in devtools,
 * composable with `attach`, and usable as `createQuery({ effect })` /
 * `createMutation({ effect })`.
 */
export function createRequestFx<Params = void, Response = unknown>(
  handler: (params: Params, ctx: RequestContext) => Promise<Response> | Response,
  options: CreateRequestFxOptions = {},
): Effect<Params, Response, RequestError> {
  const { normalizeErrors = true, name } = options;
  return createEffect<Params, Response, RequestError>({
    name,
    handler: async (params) => {
      const controller = new AbortController();
      try {
        return await handler(params, { signal: controller.signal });
      } catch (err) {
        throw normalizeErrors ? normalizeRequestError(err) : (err as RequestError);
      }
    },
  });
}
