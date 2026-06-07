// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { allSettled, createEffect, fork } from 'effector';
import { Provider } from 'effector-react';
import { createQuery } from '../src';
import { useQuery } from '../src/react';

describe('useQuery (React binding)', () => {
  afterEach(() => cleanup());

  it('reflects query state and binds triggers to the scope', async () => {
    const fx = createEffect(async (id: number) => `user-${id}`);
    const query = createQuery({ effect: fx });

    function View() {
      const { data, status, isPending } = useQuery(query);
      return createElement(
        'div',
        null,
        createElement('span', { 'data-testid': 'status' }, isPending ? 'pending' : status),
        createElement('span', { 'data-testid': 'data' }, data ?? 'null'),
      );
    }

    const scope = fork();
    render(createElement(Provider, { value: scope }, createElement(View)));

    expect(screen.getByTestId('status').textContent).toBe('initial');
    expect(screen.getByTestId('data').textContent).toBe('null');

    await act(async () => {
      await allSettled(query.start, { scope, params: 7 });
    });

    expect(screen.getByTestId('status').textContent).toBe('done');
    expect(screen.getByTestId('data').textContent).toBe('user-7');
  });

  it('triggers fired from the component update the scoped state', async () => {
    const fx = createEffect(async (id: number) => id * 10);
    const query = createQuery({ effect: fx });

    let startFn: (id: number) => void = () => {};
    function View() {
      const { data, start } = useQuery(query);
      startFn = start;
      return createElement('span', { 'data-testid': 'data' }, String(data ?? 'null'));
    }

    const scope = fork();
    render(createElement(Provider, { value: scope }, createElement(View)));

    await act(async () => {
      startFn(4);
    });

    await waitFor(() => expect(screen.getByTestId('data').textContent).toBe('40'));
    expect(scope.getState(query.$data)).toBe(40);
  });
});
