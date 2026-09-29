# Бекенд ПТО-AI

NestJS + Prisma 8 + PostgreSQL + Redis. Auth: ZITADEL OIDC (Authorization Code + PKCE, Private Key JWT), сессия в cookie `ai_pto_session`.

## Быстрый старт (Docker)

Нужны Docker Desktop / Docker Engine и Docker Compose.

```bash
# 1) env для хоста (migrate / yarn start:dev снаружи контейнера)
cp .env.example .env

# 2) поднять Postgres + Redis + API (миграции применяются при старте api)
docker compose up -d --build

# 3) API
# http://localhost:3000
```

Остановить:

```bash
docker compose down
```

Дополнительно MinIO (`--profile full`):

```bash
docker compose --profile full up -d --build
```

Локальный IdP (отдельный compose): см. [`zitadel/`](zitadel/). Конфиг стека ZITADEL — в `zitadel/.env`, OIDC-клиент Nest — в **корневом** `.env`.

## Auth (smoke без frontend)

1. Подними ZITADEL (`zitadel/`) и заполни в корневом `.env`: `ZITADEL_ISSUER`, `ZITADEL_CLIENT_ID`, `ZITADEL_KEY_PATH` (JSON-ключ из Console → Application → Keys), `ZITADEL_REDIRECT_URI`.
2. В ZITADEL Application: Redirect URI = `http://localhost:3000/api/auth/callback`, Auth Method = Private Key JWT; желательно «Include user's profile info in the ID Token».
3. `yarn start:dev` (или API из compose).
4. Браузер: [http://localhost:3000/api/auth/login](http://localhost:3000/api/auth/login) → логин ZITADEL → `/api/auth/me`.
5. Проверка guard: `/api/protected`. Logout: `POST /api/auth/logout` с cookie `ai_pto_session`.

## Переменные окружения

| Переменная | Где нужна | Пример / значение |
| --- | --- | --- |
| `DATABASE_URL` | Хост (`.env`) | `postgresql://pto:pto@localhost:5433/ai_pto` |
| `DATABASE_URL` | Контейнер `api` (compose) | `postgresql://pto:pto@postgres:5432/ai_pto` |
| `REDIS_URL` | Хост / API | `redis://localhost:6379` (в compose: `redis://redis:6379`) |
| `PORT` | API | `3000` |
| `ZITADEL_ISSUER` | API | `http://localhost:8080` |
| `ZITADEL_CLIENT_ID` | API | Client ID приложения из Console |
| `ZITADEL_KEY_PATH` | API | путь к JSON-ключу, напр. `./secrets/zitadel-app-key.json` |
| `ZITADEL_REDIRECT_URI` | API | `http://localhost:3000/api/auth/callback` |

Почему порт Postgres **5433** на хосте: часто уже занят локальный Postgres на `5432`. Внутри сети compose сервис `postgres` слушает `5432`, с хоста ходить нужно на `localhost:5433`.

Секреты: `.env` и `secrets/` в git не коммитятся. Для Docker API `DATABASE_URL` / `REDIS_URL` задаются в `docker-compose.yml`.

## Разработка без контейнера API

```bash
cp .env.example .env
# заполни ZITADEL_* и положи ключ по ZITADEL_KEY_PATH
docker compose up -d postgres redis
docker compose -f zitadel/docker-compose.yml --env-file zitadel/.env up -d
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

