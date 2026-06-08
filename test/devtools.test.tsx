// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { act, cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { allSettled, createEffect, fork } from 'effector';
import { Provider } from 'effector-react';
import { createQuery } from '../src';
import { EffectorQueryDevtools } from '../src/devtools';

describe('EffectorQueryDevtools', () => {
  afterEach(() => cleanup());

  it('toggles open and shows query status + data', async () => {
    const fx = createEffect(async (id: number) => ({ id, name: `user-${id}` }));
    const userQuery = createQuery({ effect: fx, name: 'user' });

    const scope = fork();
    render(
      <Provider value={scope}>
        <EffectorQueryDevtools queries={{ user: userQuery }} />
      </Provider>,
    );

    // collapsed: a toggle pill with the query count
    expect(screen.getByTestId('eq-devtools-toggle').textContent).toContain('queries (1)');

    // open the panel
    fireEvent.click(screen.getByTestId('eq-devtools-toggle'));
    expect(screen.getByText('devtools')).toBeTruthy();
    // status shown (initial)
    expect(screen.getByText('initial')).toBeTruthy();

    // run the query -> panel reflects done + data
    await act(async () => {
      await allSettled(userQuery.start, { scope, params: 7 });
    });

    await waitFor(() => expect(screen.getAllByText('done').length).toBeGreaterThan(0));
    expect(screen.getByText(/"name": "user-7"/)).toBeTruthy();
  });

  it('can start open and be closed', () => {
    const q = createQuery({ effect: createEffect(async () => 1), name: 'q' });
    const scope = fork();
    render(
      <Provider value={scope}>
        <EffectorQueryDevtools queries={{ q }} initialIsOpen />
      </Provider>,
    );
    expect(screen.getByTestId('eq-devtools-close')).toBeTruthy();
    fireEvent.click(screen.getByTestId('eq-devtools-close'));
    expect(screen.getByTestId('eq-devtools-toggle')).toBeTruthy();
  });
});
