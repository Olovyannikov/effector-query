import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'effector-query',
  description: 'Friendly query layer for effector, built on real effects',
  base: '/effector-query/',
  lastUpdated: true,
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/queries' },
      { text: 'Recipes', link: '/recipes/ssr-and-testing' },
      { text: 'Roadmap', link: 'https://github.com/Olovyannikov/effector-query/blob/main/ROADMAP.md' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Core concepts', link: '/guide/concepts' },
            { text: 'vs. farfetched', link: '/guide/vs-farfetched' },
            { text: 'Migration', link: '/guide/migration' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API',
          items: [
            { text: 'Queries', link: '/api/queries' },
            { text: 'Mutations & invalidation', link: '/api/mutations' },
            { text: 'HTTP & validation', link: '/api/http' },
            { text: 'Pagination', link: '/api/pagination' },
            { text: 'Framework bindings', link: '/api/bindings' },
            { text: 'Introspection', link: '/api/introspection' },
          ],
        },
      ],
      '/recipes/': [
        {
          text: 'Recipes',
          items: [
            { text: 'SSR & testing', link: '/recipes/ssr-and-testing' },
            { text: 'Optimistic updates', link: '/recipes/optimistic' },
            { text: 'List updates', link: '/recipes/list-updates' },
            { text: 'Shared request factory', link: '/recipes/shared-factory' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/Olovyannikov/effector-query' }],
    search: { provider: 'local' },
    editLink: {
      pattern: 'https://github.com/Olovyannikov/effector-query/edit/main/docs/:path',
    },
    footer: { message: 'MIT Licensed', copyright: '© 2026 Ilya Olovyannikov' },
  },
});
