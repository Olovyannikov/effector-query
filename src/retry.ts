import type { DelayFn } from './types';

export interface DelayOptions {
  /** Add +/- jitter as a fraction of the computed delay, e.g. 0.5 => ±50%. */
  randomize?: { spread: number; random?: () => number };
}

function applyJitter(value: number, opts?: DelayOptions): number {
  if (!opts?.randomize) return value;
  const { spread, random = Math.random } = opts.randomize;
  const delta = value * spread * (random() * 2 - 1);
  return Math.max(0, value + delta);
}

/** delay = base * attempt (attempt is 1-based). */
export function linearDelay(base: number, opts?: DelayOptions): DelayFn {
  return (attempt) => applyJitter(base * attempt, opts);
}

/** delay = base * 2^(attempt-1). */
export function exponentialDelay(base: number, opts?: DelayOptions): DelayFn {
  return (attempt) => applyJitter(base * 2 ** (attempt - 1), opts);
}
