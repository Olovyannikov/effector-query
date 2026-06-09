<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { createEffect } from 'effector';
import { useUnit } from 'effector-vue/composition';
// import straight from source so the demo needs no build step
import { createQuery, attachQueryLogger, type QueryLogEntry } from '../../../../src';

let seq = 0;
// fake API: resolves (or rejects) after a short delay
const fakeApiFx = createEffect(
  (shouldFail: boolean) =>
    new Promise<{ id: number; at: string }>((resolve, reject) =>
      setTimeout(() => {
        if (shouldFail) reject(new Error('Request failed'));
        else resolve({ id: ++seq, at: new Date().toLocaleTimeString() });
      }, 650),
    ),
);

const demo = createQuery({ effect: fakeApiFx, retry: 1, name: 'demo', cache: true });

const { data, error, status, pending } = useUnit(demo);

const log = ref<QueryLogEntry[]>([]);
let stop: (() => void) | undefined;
onMounted(() => {
  stop = attachQueryLogger(demo, {
    name: 'demo',
    handler: (e) => {
      log.value = [...log.value.slice(-12), e];
    },
  });
});
onUnmounted(() => stop?.());

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

const triggers = useUnit({
  start: demo.start,
  cancel: demo.cancel,
  reset: demo.reset,
});
const clearLog = () => (log.value = []);
</script>

<template>
  <div class="eqd">
    <div class="eqd__bar">
      <button class="eqd__btn eqd__btn--ok" @click="triggers.start(false)">Load</button>
      <button class="eqd__btn eqd__btn--fail" @click="triggers.start(true)">Load (fail)</button>
      <button class="eqd__btn" @click="triggers.cancel()">Cancel</button>
      <button class="eqd__btn" @click="triggers.reset()">Reset</button>
      <button class="eqd__btn" @click="clearLog()">Clear log</button>
    </div>

    <div class="eqd__panel">
      <div class="eqd__head">
        <strong style="color: #ffd8a8">effector-refetch</strong>
        <span style="color: #868e96; margin-left: 6px">devtools</span>
      </div>
      <div class="eqd__body">
        <div class="eqd__row">
          <span class="eqd__dot" :style="{ background: COLOR[status] }" />
          <strong>demo</strong>
          <span :style="{ color: COLOR[status], marginLeft: '8px' }">{{ status }}</span>
          <span v-if="pending" style="margin-left: auto; color: #f08c00">•••</span>
        </div>

        <div class="eqd__section">DATA</div>
        <pre class="eqd__pre">{{ pretty(data) }}</pre>

        <template v-if="error">
          <div class="eqd__section">ERROR</div>
          <pre class="eqd__pre" style="color: #ff8787">{{ (error as Error).message }}</pre>
        </template>

        <div class="eqd__section">LOG</div>
        <div class="eqd__pre eqd__log">
          <span v-if="log.length === 0" style="color: #5c5f66">no activity yet — click “Load”</span>
          <div v-for="(e, i) in log" :key="i" :style="{ color: e.type === 'fail' ? '#ff8787' : '#c1c2c5' }">
            <span style="color: #868e96">{{ e.type }}</span>
            <template v-if="e.attempt != null"> #{{ e.attempt }}</template>
            <template v-if="e.durationMs != null"> ({{ e.durationMs }}ms)</template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.eqd {
  font:
    13px/1.45 ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace;
}
.eqd__bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.eqd__btn {
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  cursor: pointer;
}
.eqd__btn--ok {
  border-color: #2f9e44;
}
.eqd__btn--fail {
  border-color: #e03131;
}
.eqd__panel {
  background: #1a1b1e;
  color: #e9ecef;
  border: 1px solid #2b2c30;
  border-radius: 10px;
  overflow: hidden;
}
.eqd__head {
  padding: 8px 12px;
  border-bottom: 1px solid #2b2c30;
}
.eqd__body {
  padding: 12px;
}
.eqd__row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.eqd__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-right: 8px;
}
.eqd__section {
  color: #868e96;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 10px 0 4px;
}
.eqd__pre {
  margin: 0;
  padding: 8px;
  background: #101113;
  border-radius: 6px;
  color: #c1c2c5;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
.eqd__log {
  max-height: 150px;
  overflow: auto;
}
</style>
