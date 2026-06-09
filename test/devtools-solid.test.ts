// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import h from 'solid-js/h';
import { render } from 'solid-js/web';
import { createEffect } from 'effector';
import { createQuery } from '../src';
import { EffectorQueryDevtools } from '../src/devtools-solid';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe('EffectorQueryDevtools — Solid', () => {
  let dispose: (() => void) | undefined;
  let host: HTMLElement | undefined;

  afterEach(() => {
    dispose?.();
    host?.remove();
    dispose = undefined;
    host = undefined;
  });

  function mount(props: Record<string, unknown>) {
    host = document.createElement('div');
    document.body.appendChild(host);
    dispose = render(h(EffectorQueryDevtools, props), host);
    return host;
  }

  it('toggles open and reflects query status + data', async () => {
    const fx = createEffect((id: number) => Promise.resolve({ id, name: `user-${id}` }));
    const userQuery = createQuery({ effect: fx, name: 'user' });

    const el = mount({ queries: { user: userQuery } });

    // collapsed pill with the query count
    const toggle = el.querySelector('[data-testid="eq-devtools-toggle"]') as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    expect(toggle.textContent).toContain('queries (1)');

    // open
    toggle.click();
    await tick();
    expect(el.textContent).toContain('devtools');
    expect(el.textContent).toContain('initial');

    // run -> done + data
    userQuery.start(7);
    for (let i = 0; i < 40 && !el.textContent?.includes('done'); i++) await tick();
    expect(el.textContent).toContain('done');
    expect(el.textContent).toContain('user-7');
  });

  it('can start open and be closed', async () => {
    const q = createQuery({ effect: createEffect(() => Promise.resolve(1)), name: 'q' });
    const el = mount({ queries: { q }, initialIsOpen: true });

    expect(el.querySelector('[data-testid="eq-devtools-close"]')).toBeTruthy();
    (el.querySelector('[data-testid="eq-devtools-close"]') as HTMLButtonElement).click();
    await tick();
    expect(el.querySelector('[data-testid="eq-devtools-toggle"]')).toBeTruthy();
  });
});
