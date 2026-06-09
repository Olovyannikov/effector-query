import DefaultTheme from 'vitepress/theme';
import { defineClientComponent } from 'vitepress';
import './custom.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: { app: import('vue').App }) {
    // client-only: the live demos run effector + effector-vue in the browser
    app.component(
      'DevtoolsDemo',
      defineClientComponent(() => import('./components/DevtoolsDemo.vue')),
    );
    app.component(
      'DevtoolsWidget',
      defineClientComponent(() => import('./components/DevtoolsWidget.vue')),
    );
  },
};
