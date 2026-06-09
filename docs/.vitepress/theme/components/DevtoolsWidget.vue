<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { createEffect, createEvent } from 'effector';
import { useUnit } from 'effector-vue/composition';
// import straight from source so the demo needs no build step
import {
  createQuery,
  connectQuery,
  invalidate,
  attachQueryLogger,
  type QueryLogEntry,
} from '../../../../src';

// ---- fake APIs (resolve, or reject when params.fail) ----
let seq = 0;
const delay = <T,>(ms: number, value: () => T, fail: boolean) =>
  new Promise<T>((res, rej) =>
    setTimeout(() => (fail ? rej(new Error('Request failed')) : res(value())), ms),
  );

const fetchUsersFx = createEffect(({ fail }: { fail: boolean }) =>
  delay(
    700,
    () => [
      { id: 1, name: 'Ada' },
      { id: 2, name: 'Linus' },
    ],
    fail,
  ),
);
const fetchTodosFx = createEffect(({ fail }: { fail: boolean }) =>
  delay(500, () => ({ open: 4, done: ++seq }), fail),
);
const fetchProfileFx = createEffect(({ fail }: { fail: boolean }) =>
  delay(900, () => ({ name: 'ada', plan: 'pro' }), fail),
);

const usersQuery = createQuery({ effect: fetchUsersFx, name: 'users', retry: 1 });
const todosQuery = createQuery({ effect: fetchTodosFx, name: 'todos', cache: true });
const profileQuery = createQuery({ effect: fetchProfileFx, name: 'profile' });

// connectQuery: a successful `users` load cascades into `profile` (watch both
// tabs light up in sequence). profile's params are derived from the users result.
connectQuery({ source: usersQuery, fn: () => ({ params: { fail: false } }), target: profileQuery });

// invalidate: one event refetches every query that has already run, with its
// last params (bypassing cache freshness) — the classic "data changed" signal.
const invalidateAll = createEvent<void>();
invalidate({ on: invalidateAll, refetch: [usersQuery, todosQuery, profileQuery] });

const order = ['users', 'todos', 'profile'] as const;
type Key = (typeof order)[number];

// reactive state for each query (useUnit must run in setup, once per query)
const states = {
  users: useUnit(usersQuery),
  todos: useUnit(todosQuery),
  profile: useUnit(profileQuery),
} as Record<Key, ReturnType<typeof useUnit>>;

// scope-bound triggers (flat shape — useUnit can't take nested objects)
const triggers = useUnit({
  usersStart: usersQuery.start,
  usersCancel: usersQuery.cancel,
  usersReset: usersQuery.reset,
  todosStart: todosQuery.start,
  todosCancel: todosQuery.cancel,
  todosReset: todosQuery.reset,
  profileStart: profileQuery.start,
  profileCancel: profileQuery.cancel,
  profileReset: profileQuery.reset,
  invalidateAll,
}) as unknown as Record<string, (p?: unknown) => void>;

const open = ref(false);
const active = ref<Key>('users');

const tabs = computed(() =>
  order.map((key) => ({
    key,
    status: states[key].status.value as string,
    pending: states[key].pending.value,
  })),
);
const detail = computed(() => {
  const s = states[active.value];
  return {
    status: s.status.value as string,
    pending: s.pending.value as boolean,
    params: s.params.value,
    data: s.data.value,
    error: s.error.value as Error | null,
  };
});

// per-query event log
const logs = reactive<Record<Key, QueryLogEntry[]>>({ users: [], todos: [], profile: [] });
const activeLog = computed(() => logs[active.value]);
let stops: Array<() => void> = [];
onMounted(() => {
  stops = order.map((key) =>
    attachQueryLogger(key === 'users' ? usersQuery : key === 'todos' ? todosQuery : profileQuery, {
      name: key,
      handler: (e) => {
        logs[key] = [...logs[key].slice(-12), e];
      },
    }),
  );
});
onUnmounted(() => stops.forEach((s) => s()));

const load = (fail: boolean) => triggers[`${active.value}Start`]({ fail });
const cancel = () => triggers[`${active.value}Cancel`]();
const reset = () => triggers[`${active.value}Reset`]();

const COLOR: Record<string, string> = {
  initial: '#868e96',
  pending: '#f08c00',
  done: '#2f9e44',
  fail: '#e03131',
};
const pretty = (v: unknown) => {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
};
</script>

<template>
  <div class="eqw">
    <button v-if="!open" class="eqw__pill" @click="open = true">⚡ queries ({{ order.length }})</button>

    <template v-else>
      <div class="eqw__bar">
        <span class="eqw__bar-label">{{ active }}:</span>
        <button class="eqw__btn eqw__btn--ok" @click="load(false)">Load</button>
        <button class="eqw__btn eqw__btn--fail" @click="load(true)">Load (fail)</button>
        <button class="eqw__btn" @click="cancel()">Cancel</button>
        <button class="eqw__btn" @click="reset()">Reset</button>
        <span class="eqw__sep" />
        <button class="eqw__btn" @click="triggers.invalidateAll()">Invalidate all</button>
      </div>

      <div class="eqw__panel">
        <div class="eqw__head">
          <strong style="color: #ffd8a8">effector-refetch</strong>
          <span style="color: #868e96; margin-left: 6px">devtools</span>
          <button class="eqw__close" title="Close" @click="open = false">✕</button>
        </div>

        <div class="eqw__main">
          <!-- tabs / sidebar -->
          <div class="eqw__tabs">
            <button
              v-for="t in tabs"
              :key="t.key"
              class="eqw__tab"
              :class="{ 'eqw__tab--active': t.key === active }"
              @click="active = t.key"
            >
              <span class="eqw__dot" :style="{ background: COLOR[t.status] }" />
              <span class="eqw__tab-name">{{ t.key }}</span>
              <span v-if="t.pending" class="eqw__spin">•••</span>
            </button>
          </div>

          <!-- detail -->
          <div class="eqw__detail">
            <div class="eqw__row">
              <span class="eqw__dot" :style="{ background: COLOR[detail.status] }" />
              <strong>{{ active }}</strong>
              <span :style="{ color: COLOR[detail.status], marginLeft: '8px' }">{{ detail.status }}</span>
            </div>

            <div class="eqw__section">PARAMS</div>
            <pre class="eqw__pre">{{ pretty(detail.params) }}</pre>

            <div class="eqw__section">DATA</div>
            <pre class="eqw__pre">{{ pretty(detail.data) }}</pre>

            <template v-if="detail.error">
              <div class="eqw__section">ERROR</div>
              <pre class="eqw__pre" style="color: #ff8787">{{ detail.error.message }}</pre>
            </template>

            <div class="eqw__section">LOG</div>
            <div class="eqw__pre eqw__log">
              <span v-if="activeLog.length === 0" style="color: #5c5f66">no activity yet — click “Load”</span>
              <div
                v-for="(e, i) in activeLog"
                :key="i"
                :style="{ color: e.type === 'fail' ? '#ff8787' : '#c1c2c5' }"
              >
                <span style="color: #868e96">{{ e.type }}</span>
                <template v-if="e.attempt != null"> #{{ e.attempt }}</template>
                <template v-if="e.durationMs != null"> ({{ e.durationMs }}ms)</template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.eqw {
  font:
    13px/1.45 ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace;
}
.eqw__pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: none;
  border-radius: 999px;
  background: #1a1b1e;
  color: #ffd8a8;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
}
.eqw__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.eqw__bar-label {
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
}
.eqw__btn {
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  cursor: pointer;
}
.eqw__btn--ok {
  border-color: #2f9e44;
}
.eqw__btn--fail {
  border-color: #e03131;
}
.eqw__sep {
  width: 1px;
  align-self: stretch;
  background: var(--vp-c-divider);
  margin: 0 2px;
}
.eqw__panel {
  background: #1a1b1e;
  color: #e9ecef;
  border: 1px solid #2b2c30;
  border-radius: 10px;
  overflow: hidden;
}
.eqw__head {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #2b2c30;
}
.eqw__close {
  margin-left: auto;
  border: none;
  background: transparent;
  color: #868e96;
  cursor: pointer;
  font: inherit;
}
.eqw__main {
  display: flex;
  min-height: 280px;
}
.eqw__tabs {
  width: 150px;
  flex: 0 0 auto;
  border-right: 1px solid #2b2c30;
  padding: 6px 0;
}
.eqw__tab {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
  padding: 7px 12px;
  border: none;
  background: transparent;
  color: #e9ecef;
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.eqw__tab--active {
  background: #2b2c30;
}
.eqw__tab-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.eqw__spin {
  margin-left: auto;
  color: #f08c00;
}
.eqw__detail {
  flex: 1;
  padding: 12px;
  overflow: auto;
}
.eqw__row {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}
.eqw__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: 0 0 auto;
}
.eqw__section {
  color: #868e96;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 10px 0 4px;
}
.eqw__pre {
  margin: 0;
  padding: 8px;
  background: #101113;
  border-radius: 6px;
  color: #c1c2c5;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
.eqw__log {
  max-height: 140px;
  overflow: auto;
}
</style>
