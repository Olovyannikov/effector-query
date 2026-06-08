import { describe, it, expect } from 'vitest';
import { allSettled, createEffect, fork } from 'effector';
import {
  createContract,
  createQuery,
  standardSchemaContract,
  ValidationError,
  zodContract,
} from '../src';

describe('validation', () => {
  it('contract: valid response passes through', async () => {
    const contract = createContract<{ id: number }>({
      isData: (raw) => typeof (raw as any)?.id === 'number',
    });
    const fx = createEffect(async () => ({ id: 1 }));
    const q = createQuery({ effect: fx, contract });
    const scope = fork();
    await allSettled(q.start, { scope });
    expect(scope.getState(q.$status)).toBe('done');
    expect(scope.getState(q.$data)).toEqual({ id: 1 });
  });

  it('contract: invalid response becomes a ValidationError', async () => {
    const contract = createContract<{ id: number }>({
      isData: (raw) => typeof (raw as any)?.id === 'number',
      getErrorMessages: () => ['id must be a number'],
    });
    const fx = createEffect(async () => ({ id: 'oops' }) as any);
    const q = createQuery({ effect: fx, contract });
    const scope = fork();
    await allSettled(q.start, { scope });
    expect(scope.getState(q.$status)).toBe('fail');
    const err = scope.getState(q.$error) as ValidationError;
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.validationErrors).toEqual(['id must be a number']);
    expect(scope.getState(q.$data)).toBeNull();
  });

  it('validate fn: false / string[] mark the response invalid', async () => {
    const fx = createEffect(async (n: number) => n);
    const q = createQuery({
      effect: fx,
      validate: ({ result }) => (result > 0 ? true : ['must be positive']),
    });
    const scope = fork();
    await allSettled(q.start, { scope, params: 5 });
    expect(scope.getState(q.$status)).toBe('done');

    await allSettled(q.start, { scope, params: -1 });
    expect(scope.getState(q.$status)).toBe('fail');
    expect((scope.getState(q.$error) as ValidationError).validationErrors).toEqual(['must be positive']);
  });

  it('zodContract works with a zod-like schema (structural)', async () => {
    // minimal zod-like stub
    const schema = {
      safeParse: (raw: unknown) =>
        typeof (raw as any)?.name === 'string'
          ? { success: true as const, data: raw as { name: string } }
          : {
              success: false as const,
              error: { issues: [{ path: ['name'], message: 'Expected string' }] },
            },
    };
    const contract = zodContract(schema);
    const fx = createEffect(async (ok: boolean) => (ok ? { name: 'Rick' } : { name: 42 }) as any);
    const q = createQuery({ effect: fx, contract });
    const scope = fork();

    await allSettled(q.start, { scope, params: true });
    expect(scope.getState(q.$data)).toEqual({ name: 'Rick' });

    await allSettled(q.start, { scope, params: false });
    expect((scope.getState(q.$error) as ValidationError).validationErrors).toEqual(['name: Expected string']);
  });

  it('standardSchemaContract works with a Standard Schema (sync)', async () => {
    const schema = {
      '~standard': {
        validate: (value: unknown) =>
          typeof value === 'number'
            ? { value }
            : { issues: [{ message: 'not a number' }] },
      },
    };
    const contract = standardSchemaContract<number>(schema);
    const fx = createEffect(async (ok: boolean) => (ok ? 7 : 'x') as any);
    const q = createQuery({ effect: fx, contract });
    const scope = fork();

    await allSettled(q.start, { scope, params: true });
    expect(scope.getState(q.$data)).toBe(7);

    await allSettled(q.start, { scope, params: false });
    expect((scope.getState(q.$error) as ValidationError).validationErrors).toEqual(['not a number']);
  });

  it('validation failures are retryable', async () => {
    let calls = 0;
    const fx = createEffect(async () => {
      calls++;
      return calls; // 1 (invalid), 2 (valid)
    });
    const q = createQuery({
      effect: fx,
      validate: ({ result }) => result >= 2,
      retry: { times: 3, delay: 0 },
    });
    const scope = fork();
    await allSettled(q.start, { scope });
    expect(calls).toBe(2);
    expect(scope.getState(q.$status)).toBe('done');
    expect(scope.getState(q.$data)).toBe(2);
  });
});
