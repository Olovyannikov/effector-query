# Основные идеи

## Эффект прежде всего

Query оборачивает ваш **реальный effector `Effect`**. Это не чёрный ящик с внутренним
исполнителем — ваш эффект остаётся полноценным юнитом: виден в devtools, композируется
через `attach`, дружит с fork для SSR и тестов.

```ts
const query = createQuery({ effect: myFx });
query.__.effect === myFx; // тот самый эффект
```

## Жизненный цикл и статус

`$status` идёт по `'initial' → 'pending' → 'done' | 'fail'`. Query предоставляет:

| стор/событие                   | значение                                            |
| ------------------------------ | --------------------------------------------------- |
| `$data`                        | последний (провалидированный, смапленный) результат |
| `$error`                       | последняя ошибка                                    |
| `$status`                      | `initial \| pending \| done \| fail`                |
| `$pending`                     | запрос (или ретрай) в полёте                        |
| `$stale`                       | текущие данные старше `staleAfter`                  |
| `$params`                      | последние параметры запуска                         |
| `finished.{done,fail,finally}` | события жизненного цикла                            |
| `aborted`                      | результат отброшен (concurrency / cancel / skip)    |

## Триггеры

- `start(params)` — запустить, учитывая cache / concurrency / enabled.
- `refresh(params)` / `refetch(params)` — запустить, минуя свежесть кэша.
- `reset()` — вернуть в initial, прервать in-flight.
- `cancel()` — прервать in-flight, данные оставить.

## Движок

Внутри query — граф обычных юнитов effector (`createStore` / `createEvent` / `sample`).
Вся машинерия (concurrency, retry, cache) живёт в движке и настраивается **операторами**;
inline-опции `createQuery` — сахар над ними. Значения конфига могут быть константами или
реактивными `Store` — см. [sourced-конфиг](/ru/api/queries#реактивный-sourced-конфиг).

## SSR и тесты

Поскольку под капотом это обычный effector, `fork()` + `allSettled()` работают как обычно —
без специальных тестовых утилит. См. [SSR и тесты](/ru/recipes/ssr-and-testing).
