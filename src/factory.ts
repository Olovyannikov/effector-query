import type { Store } from 'effector';
import { createQuery } from './create-query';
import { createMutation } from './create-mutation';
import type {
  CacheConfig,
  ConcurrencyStrategy,
  CreateMutationConfig,
  CreateMutationHandlerConfig,
  CreateQueryConfig,
  CreateQueryHandlerConfig,
  Mutation,
  Query,
  RetryConfig,
} from './types';
import type { Barrier } from './barrier';

/** Policy options applied to every query/mutation built by a factory. */
export interface QueryFactoryDefaults {
  retry?: number | RetryConfig<any>;
  cache?: boolean | CacheConfig<any>;
  concurrency?: ConcurrencyStrategy | Store<ConcurrencyStrategy>;
  refetchInterval?: number | Store<number>;
  structuralSharing?: boolean;
  enabled?: Store<boolean>;
  debug?: boolean;
  barrier?: Barrier;
}

export interface QueryFactory {
  createQuery: typeof createQuery;
  createMutation: typeof createMutation;
  defaults: QueryFactoryDefaults;
}

/**
 * Bake shared defaults into `createQuery` / `createMutation`. Per-call options
 * override the defaults. This is the effector-flavored alternative to a global
 * `QueryClient` — e.g. make every query poll, or retry, by default:
 *
 *   const { createQuery } = createQueryFactory({ refetchInterval: 30_000, retry: 2 });
 *   const todos = createQuery({ effect: fetchTodosFx }); // polls + retries by default
 */
export function createQueryFactory(defaults: QueryFactoryDefaults = {}): QueryFactory {
  // mutations ignore query-only policies (cache / refetchInterval / enabled)
  const mutationDefaults = {
    retry: defaults.retry,
    concurrency: defaults.concurrency,
    debug: defaults.debug,
    barrier: defaults.barrier,
  };

  function factoryQuery<Params, Result, Error = unknown, Mapped = Result>(
    config:
      | CreateQueryConfig<Params, Result, Error, Mapped>
      | CreateQueryHandlerConfig<Params, Result, Error, Mapped>,
  ): Query<Params, Result, Error, Mapped> {
    return createQuery({ ...defaults, ...config } as never);
  }

  function factoryMutation<Params, Result, Error = unknown, Mapped = Result>(
    config:
      | CreateMutationConfig<Params, Result, Error, Mapped>
      | CreateMutationHandlerConfig<Params, Result, Error, Mapped>,
  ): Mutation<Params, Result, Error, Mapped> {
    return createMutation({ ...mutationDefaults, ...config } as never);
  }

  return {
    createQuery: factoryQuery as typeof createQuery,
    createMutation: factoryMutation as typeof createMutation,
    defaults,
  };
}
