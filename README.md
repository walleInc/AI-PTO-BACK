# Бекенд ПТО-AI

NestJS + Prisma 8 + PostgreSQL. Auth: `AUTH_PROVIDER=local` (email/пароль) или `zitadel` (OIDC, Authorization Code + PKCE), сессия в cookie `ai_pto_session`.

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

Дополнительно MinIO (`--profile full`):

```bash
docker compose --profile full up -d --build
```

Локальный IdP (отдельный compose): см. [`zitadel/`](zitadel/). Конфиг стека ZITADEL — в `zitadel/.env`, OIDC-клиент Nest — в **корневом** `.env`.

## Auth (smoke без frontend)

Способ входа выбирается переменной `AUTH_PROVIDER`: `zitadel` (по умолчанию, OIDC, тяжёлый внешний IdP) или `local` (email и пароль из PostgreSQL, ZITADEL не нужен). Сессия в обоих режимах одна и та же: opaque-токен в cookie `ai_pto_session`, в таблице `Session` PostgreSQL хранится только его SHA-256. Роль и организация читаются из `Membership` на каждом запросе, поэтому смена роли, блокировка или удаление пользователя действуют сразу (ZITADEL только аутентифицирует, пользователь ищется в БД по email), а `/auth/me`, `/auth/logout`, `/protected` работают одинаково. Эндпоинты чужого режима отвечают `404`.

### Вариант 1: локальная авторизация (`AUTH_PROVIDER=local`)

Пароль хранится как scrypt-хэш в `User.passwordHash`. Регистрации нет, пользователей заводит скрипт (Node ≥ 22.18, `DATABASE_URL` в `.env`, миграции применены):

```bash
yarn user:create --email eng@example.com --password 'change-me' --name 'Иван Петров' --org-slug acme --org-name 'ACME' --role owner
```

Скрипт идемпотентен: существующие организация, пользователь и membership обновляются (так можно сменить пароль). `--role`: `owner` (по умолчанию) или `engineer`.

```bash
curl -i -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"email":"eng@example.com","password":"change-me"}' http://localhost:3000/api/auth/login
curl -b cookies.txt http://localhost:3000/api/auth/me
```

Неверный email, пароль, заблокированный пользователь и отсутствие активного membership дают один и тот же `401 invalid_credentials`.

### Вариант 2: ZITADEL (`AUTH_PROVIDER=zitadel`)

Пользователь, роль и организация берутся из нашей БД: после входа в ZITADEL пользователь ищется по email (должен быть подтверждён) среди `User`, поэтому сначала создай его через `yarn user:create`. Роли из токена ZITADEL не используются.

1. Подними ZITADEL (`zitadel/`) и заполни в корневом `.env`: `ZITADEL_ISSUER`, `ZITADEL_CLIENT_ID`, `ZITADEL_KEY_PATH` (JSON-ключ из Console → Application → Keys), `ZITADEL_REDIRECT_URI`.
2. В ZITADEL Application: Redirect URI = `http://localhost:3000/api/auth/callback`, Auth Method = Private Key JWT; желательно «Include user's profile info in the ID Token».
3. `yarn start:dev` (или API из compose).
4. Браузер: [http://localhost:3000/api/auth/login](http://localhost:3000/api/auth/login) → логин ZITADEL → `/api/auth/me`.
5. Проверка guard: `/api/protected`. Logout: `POST /api/auth/logout` с cookie `ai_pto_session`.

## Objects (stage-1)

Контракт: [`docs/openapi/openapi.yaml`](docs/openapi/openapi.yaml). Организация и роль берутся только из cookie-сессии, не из тела и не из query.

| Метод | Путь | Примечание |
| --- | --- | --- |
| `GET` | `/api/object-types` | Активные типы с группой |
| `GET` | `/api/work-types` | Активные виды работ |
| `GET` | `/api/counterparties` | Организации `kind=counterparty` |
| `GET` | `/api/objects` | Без `archived`, если нет `includeArchived=true` |
| `POST` | `/api/objects` | Тело `ObjectWrite`, статус `draft` |
| `GET` / `PATCH` | `/api/objects/{id}` | Чужой и несуществующий id → 404 |
| `POST` | `/api/objects/{id}/status` | Автомат статусов; запретный переход → 409 |
| `POST` | `/api/objects/{id}/archive` | Только роль `owner`; engineer → 403 |

Для create/update в БД нужны сиды справочников (`ObjectType`, `WorkType`, counterparties) и строка `User` с `id` = OIDC `sub` (`createdById`). Сидов в репозитории пока нет — без них справочники вернут `[]`, а create упадёт на FK.

## Проверка

Авто (линт, типы, юнит-тесты рядом с кодом в `src/**/*.spec.ts`):

```bash
yarn lint && yarn typecheck && yarn test
```

Ручной smoke после логина (`/api/auth/me`, cookie `ai_pto_session`):

1. `GET` справочники → взять `objectTypeId` и `workTypeIds`.
2. `POST /api/objects` → `201`, `status: draft`.
3. `GET /api/objects` → объект в списке; без флага archived не видны.
4. `POST /api/objects/{id}/status` с `{ "status": "active" }` → `200`.
5. `POST /api/objects/{id}/archive` под engineer → `403`; под owner → `200`, `status: archived`.

## Переменные окружения

| Переменная | Где нужна | Пример / значение |
| --- | --- | --- |
| `DATABASE_URL` | Хост (`.env`) | `postgresql://pto:pto@localhost:5433/ai_pto` |
| `DATABASE_URL` | Контейнер `api` (compose) | `postgresql://pto:pto@postgres:5432/ai_pto` |
| `PORT` | API | `3000` |
| `AUTH_PROVIDER` | API | `zitadel` (по умолчанию) или `local` |
| `ZITADEL_ISSUER` | API (только `zitadel`) | `http://localhost:8080` |
| `ZITADEL_CLIENT_ID` | API | Client ID приложения из Console |
| `ZITADEL_KEY_PATH` | API | путь к JSON-ключу, напр. `./secrets/zitadel-app-key.json` |
| `ZITADEL_REDIRECT_URI` | API | `http://localhost:3000/api/auth/callback` |

Почему порт Postgres **5433** на хосте: часто уже занят локальный Postgres на `5432`. Внутри сети compose сервис `postgres` слушает `5432`, с хоста ходить нужно на `localhost:5433`.

Секреты: `.env` и `secrets/` в git не коммитятся. Для Docker API `DATABASE_URL` задаётся в `docker-compose.yml`.

## Разработка без контейнера API

```bash
cp .env.example .env
# AUTH_PROVIDER=zitadel: заполни ZITADEL_* и положи ключ по ZITADEL_KEY_PATH
# AUTH_PROVIDER=local: ZITADEL не нужен, создай пользователя через `yarn user:create`
docker compose up -d postgres
docker compose -f zitadel/docker-compose.yml --env-file zitadel/.env up -d   # только для AUTH_PROVIDER=zitadel
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

