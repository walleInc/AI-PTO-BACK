# Бекенд ПТО-AI

NestJS + Prisma 8 + PostgreSQL.

## Быстрый старт (Docker)

Нужны Docker Desktop / Docker Engine и Docker Compose.

```bash
# 1) env для хоста (migrate / yarn start:dev снаружи контейнера)
cp .env.example .env

# 2) поднять Postgres + API (миграции применяются при старте api)
docker compose up -d --build

# 3) API
# http://localhost:3000
```

Остановить:

```bash
docker compose down
```

Полный локальный стек (ещё redis + minio):

```bash
docker compose --profile full up -d --build
```

## Переменные окружения

| Переменная     | Где нужна                 | Пример / значение                            |
| -------------- | ------------------------- | -------------------------------------------- |
| `DATABASE_URL` | Хост (`.env`)             | `postgresql://pto:pto@localhost:5433/ai_pto` |
| `DATABASE_URL` | Контейнер `api` (compose) | `postgresql://pto:pto@postgres:5432/ai_pto`  |
| `PORT`         | API                       | `3000`                                       |

Почему порт Postgres **5433** на хосте: часто уже занят локальный Postgres на `5432`. Внутри сети compose сервис `postgres` слушает `5432`, с хоста ходить нужно на `localhost:5433`.

Секреты: файл `.env` в git не коммитится. Для Docker API URL БД задаётся в `docker-compose.yml`, отдельный `.env` внутри контейнера не обязателен.

## Разработка без контейнера API

```bash
cp .env.example .env
docker compose up -d postgres
yarn
yarn prisma db migrate
yarn start:dev
```

## Полезные команды

```bash
yarn lint
yarn typecheck
yarn test
yarn prisma contract emit
yarn prisma db migrate
yarn prisma db verify
```
