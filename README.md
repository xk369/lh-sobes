# LOFT HALL Interviews MVP

Мини-приложение для записи на собеседования LOFT HALL. Локально может работать
на JSON-файле, а в production подключается к общей PostgreSQL-базе центра
стажировок через `INTERVIEW_STORAGE_MODE=postgres`.

## Что покрыто

- кандидат как слой выше стажировки;
- компактная форма кандидата: ФИО, Telegram, телефон;
- запись на доступную дату или ожидание новой даты;
- запрос подтверждения участия перед собеседованием;
- журнал рекрутера с быстрыми отметками `Пришел` / `Не пришел`;
- группировка кандидатов по явке;
- отправка ресурсов пришедшим кандидатам;
- отметка кандидата, который ушел после собеседования;
- завершение даты собеседования;
- поиск по ФИО, Telegram, Telegram ID и телефону;
- кабинет рекрута только для разрешенных Telegram ID;
- аналитика за период и выгрузка XLSX;
- PostgreSQL runtime для общей цепочки `собес -> кандидат -> стажировка`.

## Запуск

```bash
npm start
```

По умолчанию сервер стартует на `http://127.0.0.1:3210`.

Для запуска за nginx или для внешнего доступа можно задать переменные:

```bash
HOST=127.0.0.1 PORT=3210 npm start
```

Для прямого теста в локальной сети:

```bash
HOST=0.0.0.0 PORT=3210 npm start
```

Для production-режима с общей базой:

```bash
INTERVIEW_STORAGE_MODE=postgres DATABASE_URL=postgres://... npm start
```

## Проверка

```bash
npm test
```

Healthcheck:

```bash
curl http://127.0.0.1:3210/api/health
```

Публичная кандидатская часть работает без логина. Полный журнал, архив, очистка данных и действия рекрута доступны только Telegram ID из whitelist; публичный `/api/state` не отдает список кандидатов.

## Docker

```bash
docker compose up -d --build
```

Compose запускает сервис `lh-sobes` и публикует его только на localhost сервера:

```text
127.0.0.1:3700 -> container:3000
```

## Данные

В JSON-режиме рабочий файл `data/interviews.json` не коммитится. В
PostgreSQL-режиме источником правды становятся таблицы `candidate_profiles`,
`interview_slots`, `interview_participants`, `candidate_resource_deliveries`,
`candidate_link_clicks`, `candidate_events` и связанные interview-поля в
`notifications`.
