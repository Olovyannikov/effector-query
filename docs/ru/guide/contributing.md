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

## PR-превью и канарейка

На каждый pull request автоматически поднимаются два стенда:

- **Превью доки** — сайт собирается и публикуется в `gh-pages` под `…/pr-preview/pr-<N>/`;
  бот комментирует живой URL в PR (удаляется при закрытии).
- **Канарейка пакета** — [pkg.pr.new](https://pkg.pr.new) публикует превью-сборку, которую можно
  поставить прямо из PR: `npm i https://pkg.pr.new/Olovyannikov/effector-query@<sha>` (без
  засорения npm). Бот комментирует точную команду.

Так ревьюер может открыть ссылку на доку и `npm i` канарейку в реальное приложение до мержа.

## Continuous integration (GitHub Actions)

Пять воркфлоу в `.github/workflows/`:

| Воркфлоу         | Триггер       | Что делает                                                                 |
| ---------------- | ------------- | -------------------------------------------------------------------------- |
| `ci.yml`         | push / PR     | typecheck · lint · test · build · size-limit                               |
| `release.yml`    | push в `main` | changesets: открывает PR «Version Packages»; при его мерже публикует в npm |
| `docs.yml`       | push в `main` | собирает доку и деплоит её в ветку `gh-pages` (root)                       |
| `pr-preview.yml` | pull_request  | собирает доку PR в `gh-pages` `pr-preview/pr-<N>/` + комментит URL         |
| `pkg-pr-new.yml` | push / PR     | публикует канарейку через pkg.pr.new                                       |

### Что нужно включить в репозитории один раз

Эти настройки включает мейнтейнер вручную (Actions сам их не настроит):

1. **Pages** — Settings → Pages → Source: **Deploy from a branch** → `gh-pages` / `(root)`.
   (`docs.yml` деплоит туда с `clean-exclude: pr-preview`, чтобы превью PR не затирались.)
2. **Права воркфлоу** — Settings → Actions → General → **Read and write permissions** и
   **Allow GitHub Actions to create and approve pull requests** (для PR «Version Packages»).
3. **Секрет `NPM_TOKEN`** — классический **Automation**-токен (обходит 2FA) или Granular с
   правом read+write на пакеты. Управляет публикацией в `release.yml`.
4. **GitHub App pkg.pr.new** — установите [`pkg-pr-new`](https://github.com/apps/pkg-pr-new) на
   репозиторий, чтобы канарейка публиковалась (до этого шаг — no-op / non-blocking).

Генераторы доки (`scripts/gen-api.mjs`, `scripts/gen-llms.mjs`) запускаются внутри `docs:build`,
поэтому и `docs.yml`, и `pr-preview.yml` всегда отдают свежий API-референс и `llms.txt`.
