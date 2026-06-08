import { computed, type Ref } from 'vue';
import { useUnit } from 'effector-vue/composition';
import type { Query, QueryStatus } from './types';

export interface UseQueryVueResult<Params, Mapped, Error> {
  data: Ref<Mapped | null>;
  error: Ref<Error | null>;
  status: Ref<QueryStatus>;
  pending: Ref<boolean>;
  stale: Ref<boolean>;
  enabled: Ref<boolean>;
  params: Ref<Params | null>;
  isInitial: Ref<boolean>;
  isPending: Ref<boolean>;
  isDone: Ref<boolean>;
  isFail: Ref<boolean>;
  start: (params: Params) => void;
  refetch: (params: Params) => void;
  refresh: (params: Params) => void;
  reset: () => void;
  cancel: () => void;
}

/**
 * Vue binding for a Query. Wraps effector-vue's `useUnit` (scope-aware via the
 * EffectorScope plugin) and adds derived status flags. Does not auto-start.
 */
export function useQuery<Params, Result, Error, Mapped>(
  query: Query<Params, Result, Error, Mapped>,
): UseQueryVueResult<Params, Mapped, Error> {
  const u = useUnit(query) as unknown as {
    data: Ref<Mapped | null>;
    error: Ref<Error | null>;
    status: Ref<QueryStatus>;
    pending: Ref<boolean>;
    stale: Ref<boolean>;
    enabled: Ref<boolean>;
    params: Ref<Params | null>;
    start: (params: Params) => void;
    refetch: (params: Params) => void;
    refresh: (params: Params) => void;
    reset: () => void;
    cancel: () => void;
  };

  return {
    data: u.data,
    error: u.error,
    status: u.status,
    pending: u.pending,
    stale: u.stale,
    enabled: u.enabled,
    params: u.params,
    isInitial: computed(() => u.status.value === 'initial'),
    isPending: computed(() => u.status.value === 'pending'),
    isDone: computed(() => u.status.value === 'done'),
    isFail: computed(() => u.status.value === 'fail'),
    start: u.start,
    refetch: u.refetch,
    refresh: u.refresh,
    reset: u.reset,
    cancel: u.cancel,
  };
}
