# Локальная разработка

Хотите дорабатывать сам **effector-refetch** (а не просто его использовать)? Вот как поднять репозиторий.

## Требования

- **Node ≥ 22.13** (требование закреплённого pnpm).
- **pnpm 11.5.1** — версия закреплена через `packageManager`. Проще всего через Corepack:

```bash
corepack enable
```

## Клонирование и установка

```bash
git clone https://github.com/Olovyannikov/effector-query.git
cd effector-query
pnpm install
```

## Скрипты

| скрипт            | что делает                                              |
| ----------------- | ------------------------------------------------------- |
| `pnpm build`      | Сборка библиотеки (`dist/`) — все точки входа + `.d.ts` |
| `pnpm typecheck`  | `tsc --noEmit`                                          |
| `pnpm lint`       | ESLint (вкл. `eslint-plugin-effector`)                  |
| `pnpm format`     | Prettier (запись; `format:check` — только проверка)     |
| `pnpm test`       | Прогон тестов Vitest (`test:watch` — в watch-режиме)    |
| `pnpm size`       | Проверка бюджета бандла (size-limit)                    |
| `pnpm docs:dev`   | Запуск этой документации локально                       |
| `pnpm docs:build` | Сборка доки (заодно проверка битых ссылок)              |
| `pnpm changeset`  | Запись changeset для изменения (управляет релизами)     |

## Как внести изменение

1. Ветка от `main`.
2. Изменение с тестом (набор гоняется под `fork`/`allSettled` ради scope-безопасности).
3. Прогоните гейт: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
4. Добавьте changeset: `pnpm changeset` (выберите `patch`/`minor`/`major` и напишите строку — она
   попадёт в changelog).
5. Откройте PR. При мерже в `main` CI открывает PR «Version Packages»; его мерж публикует в npm.

## Проверка на приложении

Запускайте примеры прямо из исходников (без сборки) через [tsx](https://github.com/privatenumber/tsx):

```bash
npx tsx examples/graphql.ts
```

Либо `pnpm build` и `pnpm pack` — получите tarball, который можно `pnpm add` в другой проект.
