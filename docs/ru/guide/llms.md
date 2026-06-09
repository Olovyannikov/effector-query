# LLM и AI-агенты

effector-refetch поставляет машиночитаемую документацию и устанавливаемый скилл для агентов,
чтобы AI-инструменты писали идиоматичный, fork-корректный код с этой библиотекой.

## Скилл для агентов

[Claude Code скилл](https://github.com/Olovyannikov/effector-query/tree/main/skills) обучает
effect-first API, биндингам и fork-корректным идиомам (плюс чеклист типичных ошибок). Работает с
Claude Code и 70+ другими агентами (Cursor, Codex, OpenCode, …).

### Установка через CLI `skills` (рекомендуется)

С помощью [vercel-labs/skills](https://github.com/vercel-labs/skills):

```bash
# добавить скилл effector-refetch агентам в проекте
npx skills add Olovyannikov/effector-query

# сперва посмотреть, что есть в репозитории
npx skills add Olovyannikov/effector-query --list

# для конкретного агента или глобально для всех проектов
npx skills add Olovyannikov/effector-query -a claude-code
npx skills add Olovyannikov/effector-query -g
```

### Установка вручную

```bash
# из проекта, где пакет уже установлен
cp -R node_modules/effector-refetch/skills/effector-refetch .claude/skills/
```

Либо скопируйте [`skills/effector-refetch/SKILL.md`](https://github.com/Olovyannikov/effector-query/blob/main/skills/effector-refetch/SKILL.md)
в `.claude/skills/` проекта (или `~/.claude/skills/` для всех проектов). Это обычный Markdown с
YAML-фронтматтером — его прочитает любой загрузчик скиллов/системных промптов.

## llms.txt

По [соглашению llms.txt](https://llmstxt.org) сайт документации отдаёт два текстовых файла для
контекста LLM:

- **[`/llms.txt`](https://olovyannikov.github.io/effector-query/llms.txt)** — индекс: заголовок,
  описание и ссылки на все страницы документации.
- **[`/llms-full.txt`](https://olovyannikov.github.io/effector-query/llms-full.txt)** — полный
  текст документации одним файлом, готовый для вставки в контекст модели.

Укажите URL своему инструменту или скачайте файл:

```bash
curl -fsSL https://olovyannikov.github.io/effector-query/llms-full.txt -o effector-refetch-docs.txt
```

Оба файла перегенерируются при каждой сборке документации из английской версии.
