// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { allSettled, createEffect, fork, type Scope } from 'effector';
import { EffectorScopePlugin } from 'effector-vue';
import { createQuery } from '../src';
import { EffectorQueryDevtools } from '../src/devtools-vue';

function mountWithScope(props: Record<string, unknown>, scope: Scope) {
  return mount(EffectorQueryDevtools, {
    props: props as never,
    global: { plugins: [EffectorScopePlugin({ scope }) as never] },
    attachTo: document.body,
  });
}

describe('EffectorQueryDevtools — Vue', () => {
  it('toggles open and shows query status + data', async () => {
    const fx = createEffect(async (id: number) => ({ id, name: `user-${id}` }));
    const userQuery = createQuery({ effect: fx, name: 'user' });

    const scope = fork();
    const wrapper = mountWithScope({ queries: { user: userQuery } }, scope);

    // collapsed: a toggle pill with the query count
    const toggle = wrapper.find('[data-testid="eq-devtools-toggle"]');
    expect(toggle.text()).toContain('queries (1)');

    // open the panel
    await toggle.trigger('click');
    expect(wrapper.text()).toContain('devtools');
    expect(wrapper.text()).toContain('initial');

    // run the query -> panel reflects done + data
    await allSettled(userQuery.start, { scope, params: 7 });
    await nextTick();

    expect(wrapper.text()).toContain('done');
    expect(wrapper.text()).toContain('user-7');
  });

  it('can start open and be closed', async () => {
    const q = createQuery({ effect: createEffect(async () => 1), name: 'q' });
    const scope = fork();
    const wrapper = mountWithScope({ queries: { q }, initialIsOpen: true }, scope);

    expect(wrapper.find('[data-testid="eq-devtools-close"]').exists()).toBe(true);
    await wrapper.find('[data-testid="eq-devtools-close"]').trigger('click');
    expect(wrapper.find('[data-testid="eq-devtools-toggle"]').exists()).toBe(true);
  });

  it('switches the selected query', async () => {
    const a = createQuery({ effect: createEffect(async () => 'AAA'), name: 'alpha' });
    const b = createQuery({ effect: createEffect(async () => 'BBB'), name: 'beta' });
    const scope = fork();
    const wrapper = mountWithScope({ queries: { alpha: a, beta: b }, initialIsOpen: true }, scope);

    await allSettled(b.start, { scope, params: undefined });
    await nextTick();

    // rows for both queries
    const rows = wrapper.findAll('button').filter((btn) => /alpha|beta/.test(btn.text()));
    expect(rows.length).toBe(2);

    // select beta -> its data shows
    const betaRow = rows.find((r) => r.text().includes('beta'))!;
    await betaRow.trigger('click');
    await nextTick();
    expect(wrapper.text()).toContain('BBB');
  });
});
