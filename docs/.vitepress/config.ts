import { defineConfig } from 'vitepress';

const enSidebar = {
  '/guide/': [
    {
      text: 'Guide',
      items: [
        { text: 'Introduction', link: '/guide/introduction' },
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
};

const ruSidebar = {
  '/ru/guide/': [
    {
      text: 'Руководство',
      items: [
        { text: 'Введение', link: '/ru/guide/introduction' },
        { text: 'Быстрый старт', link: '/ru/guide/getting-started' },
        { text: 'Основные идеи', link: '/ru/guide/concepts' },
        { text: 'Сравнение с farfetched', link: '/ru/guide/vs-farfetched' },
        { text: 'Миграция', link: '/ru/guide/migration' },
      ],
    },
  ],
  '/ru/api/': [
    {
      text: 'API',
      items: [
        { text: 'Запросы', link: '/ru/api/queries' },
        { text: 'Мутации и инвалидация', link: '/ru/api/mutations' },
        { text: 'HTTP и валидация', link: '/ru/api/http' },
        { text: 'Пагинация', link: '/ru/api/pagination' },
        { text: 'Биндинги', link: '/ru/api/bindings' },
        { text: 'Интроспекция', link: '/ru/api/introspection' },
      ],
    },
  ],
  '/ru/recipes/': [
    {
      text: 'Рецепты',
      items: [
        { text: 'SSR и тесты', link: '/ru/recipes/ssr-and-testing' },
        { text: 'Оптимистичные апдейты', link: '/ru/recipes/optimistic' },
        { text: 'Апдейты списков', link: '/ru/recipes/list-updates' },
        { text: 'Общая фабрика запросов', link: '/ru/recipes/shared-factory' },
      ],
    },
  ],
};

export default defineConfig({
  title: 'effector-query',
  description: 'Friendly query layer for effector, built on real effects',
  base: '/effector-query/',
  lastUpdated: true,
  cleanUrls: true,
  themeConfig: {
    socialLinks: [{ icon: 'github', link: 'https://github.com/Olovyannikov/effector-query' }],
    search: { provider: 'local' },
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/introduction' },
          { text: 'API', link: '/api/queries' },
          { text: 'Recipes', link: '/recipes/ssr-and-testing' },
          { text: 'Roadmap', link: 'https://github.com/Olovyannikov/effector-query/blob/main/ROADMAP.md' },
        ],
        sidebar: enSidebar,
        editLink: {
          pattern: 'https://github.com/Olovyannikov/effector-query/edit/main/docs/:path',
        },
        footer: { message: 'MIT Licensed', copyright: '© 2026 Ilya Olovyannikov' },
      },
    },
    ru: {
      label: 'Русский',
      lang: 'ru',
      link: '/ru/',
      themeConfig: {
        nav: [
          { text: 'Руководство', link: '/ru/guide/introduction' },
          { text: 'API', link: '/ru/api/queries' },
          { text: 'Рецепты', link: '/ru/recipes/ssr-and-testing' },
          { text: 'Roadmap', link: 'https://github.com/Olovyannikov/effector-query/blob/main/ROADMAP.md' },
        ],
        sidebar: ruSidebar,
        editLink: {
          pattern: 'https://github.com/Olovyannikov/effector-query/edit/main/docs/:path',
          text: 'Редактировать эту страницу на GitHub',
        },
        docFooter: { prev: 'Назад', next: 'Далее' },
        outline: { label: 'На этой странице' },
        lastUpdatedText: 'Обновлено',
        returnToTopLabel: 'Наверх',
        sidebarMenuLabel: 'Меню',
        darkModeSwitchLabel: 'Тема',
        langMenuLabel: 'Сменить язык',
        footer: { message: 'Под лицензией MIT', copyright: '© 2026 Илья Оловянников' },
      },
    },
  },
});
