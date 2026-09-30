# AI-ПТО — Архитектура v0.2

**Статус:** решения v0.1 закрыты, это каноническая версия для Sprint 1  
**Дата:** 25.09.2026  
v0.2 сводит текст, ERD, UML, BPMN, Prisma и OpenAPI. Стек Founder OS (Next.js, FastAPI, Supabase как основной backend) больше не действует.

---

## 1. Продукт

AI-ПТО помогает инженеру ПТО проверять исполнительную документацию.

Цепочка продукта:

`Объект → виды работ → набор требований → пакет → документы → конвейер → замечания и чеклист → отчёт`

Отсутствующий документ — пункт чеклиста (`missing` / `partial` / `complete`), не Finding. Finding возникает только по уже загруженному документу.

Замечание AI — рекомендация. В официальный смысл отчёта попадает решение инженера. Текст отчёта содержит дисклеймер из поля `Report.disclaimer`.

Первый сквозной сценарий Sprint 1: один PDF АОСР, правило `aosr.date-after-journal`, SourceRef, Finding, строка отчёта.

---

## 2. Закрытые решения

| # | Было открыто | Решение v0.2 |
|---|---|---|
| 1 | Multi-organization в MVP? | Да. `Organization` + `Membership` с первого релиза |
| 2 | Группы и типы объектов | Каталог, не строка. Старт: `residential` / `industrial`, типы `apartment_building` / `production_building` |
| 3 | Виды работ | N:M. Старт: монолит, сварка, инженерные сети, электромонтаж, вентиляция |
| 4 | Как собирается RequirementSet | Пара `ObjectType + WorkType`. Если у объекта задан `customerProfileId` и есть набор этого профиля — берётся он, иначе набор с `customerProfileId = null`. Связь с объектом материализуется в `ObjectRequirementBinding` |
| 5 | Первые типы документов | Таблица `DocumentType`: aosr, general_work_log, concrete_log, welding_log, material_passport, as_built_scheme, test_report, other, unknown |
| 6 | Форматы MVP | PDF, DOCX, XLSX |
| 7 | OCR | Входит в MVP. Отдельная очередь `document-ocr`, только если у PDF нет текстового слоя |
| 8 | Срок хранения | Пока объект существует, включая `archived`. Физической чистки в MVP нет |
| 9 | Вход подрядчика | После MVP |
| 10 | admin / reviewer / viewer | После MVP. В MVP роли `owner` и `engineer` |
| 11 | Статус замечания AI | Рекомендация. Решение инженера пишется в Finding и FindingHistory |
| 12 | Версии нормативов | `NormativeSource` с `version`, `effectiveFrom`, `effectiveTo`. `RuleVersion` хранит ссылку. Старые Finding не переписываются |

Дополнительно:

- Авторизация браузера: сессия в HttpOnly Secure cookie. JWT в localStorage не используем. Сессия живёт в Redis и не является бизнес-состоянием.
- Дедуп SHA-256 уникален в паре `(organizationId, sha256)`. Совпадение снаружи арендатора не раскрывается.
- `Organization.kind`: `tenant` (workspace, membership) или `counterparty` (заказчик/подрядчик без кабинета).
- Персональные данные журналов остаются в Yandex Object Storage в РФ. Доступ только в рамках `organizationId`. Обучение модели на файлах заказчика без отдельного договора не делается.
- Владение модулями — карта ответственности, не штатное расписание. Один человек может закрывать несколько зон: домен, обработка, оболочка UI, документы UI, OCR/правила, ревью контрактов.

---

## 3. Стек

| Слой | Технология |
|---|---|
| API | NestJS, TypeScript, Prisma |
| База | PostgreSQL |
| Очереди и сессии | Redis, BullMQ |
| Файлы | Yandex Object Storage, signed URL |
| OCR-воркер | Отдельный Python-процесс на той же очереди Redis, PaddleOCR. Остальные воркеры — NestJS |
| UI | React, TypeScript, shadcn/ui, Tailwind, Zustand, TanStack Query, Zod, React Hook Form |

Почему OCR на Python: PaddleOCR не является библиотекой Node. API, домен и правила остаются в NestJS. Оба типа воркеров пишут в PostgreSQL и публикуют прогресс в Redis Pub/Sub. Канал `package:{id}` читает SSE Gateway.

Очереди: `document-extract`, `document-ocr`, `document-classify`, `document-parse`, `document-rules`, `document-explain`, `report-generate`.

Повтор стадии — до 3 попыток (`DocumentStageRun.attempt`). Дальше документ `failed`. Если хотя бы один документ пакета `done`, пакет `partial`. Если ни один — `failed`. Повтор ставит в очередь только упавшие документы и идемпотентен по id задачи.

---

## 4. Автоматы

Подробная диаграмма: `AI-PTO_UML_StateMachines_v0.2.puml`.

**Объект:** `draft → active ↔ on_hold → completed → archived`. В `archived` можно перейти из draft, active и on_hold. Обратного перехода из archived нет. Удаления нет.

**Пакет:** `uploading → queued` только когда у каждого документа `checksumVerified`. Дальше `processing → done | partial | failed`. Из `partial` и `failed` можно снова в `queued`.

**Стадия:** `pending → running → succeeded | failed`. Из `failed` обратно в `running`, пока attempt < 3. OCR без нужды переходит в `skipped`.

**Замечание:** `open → accepted | dismissed | fixed`. `dismissed` без комментария API отвергает. Возврат в `open` пишется в `FindingHistory`.

**Отчёт:** `queued → generating → ready | failed`. Scope выбирается при создании и не требует, чтобы все замечания были accepted. Scope `accepted` включает accepted, `errors` — open со severity error/critical, `all_open` — все open.

**Чеклист:** `missing` (foundCount = 0 при required), `partial` (0 < foundCount < requiredCount), `complete` (foundCount >= requiredCount). Связь с файлами — `ChecklistItemDocument`.

---

## 5. Модель данных

Канон: `prisma/schema.prisma` и `AI-PTO_ERD_v0.2.puml`.

Что добавлено относительно draft v0.1:

- `Organization.kind`
- `CustomerRequirementProfile` и `ConstructionObject.customerProfileId`
- `ObjectRequirementBinding` — какой RequirementSet действует на объекте для вида работ
- `DocumentType`; у документа и пункта требований внешний ключ, не два разных типа
- `FileAsset.organizationId`, уникальность `(organizationId, sha256)`
- `ChecklistItemDocument`
- поля Finding: message, explanation, expected, actual, normRef, comment, decidedBy
- `FindingSource`
- `AuditLog`, отдельно от `FindingHistory`
- `fileAssetId` и `documentTypeId` у документа необязательны до загрузки и классификации

Нормативный набор требований и набор заказчика различаются тем, заполнен ли `RequirementSet.customerProfileId`. Частичные уникальные индексы — в `prisma/partial-indexes.sql`.

Загрузка: `POST /objects/{id}/packages` создаёт пакет и документы в `awaiting_upload` и отдаёт signed URL. Клиент делает PUT, затем `POST .../documents/{id}/complete`. `start` при любом неподтверждённом файле отвечает 409.

Прогресс: воркер пишет `DocumentStageRun` в PostgreSQL и публикует событие в Redis. UI слушает `GET /packages/{id}/events` (SSE). Потеря события восстанавливается чтением пакета из PostgreSQL.

---

## 6. API и модули

Контракт: `openapi/openapi.yaml`.

Модули NestJS: Auth, Organizations, Objects, Requirements, Packages, Documents, Processing, Findings, Checklist, Reports, Rules, Normatives, Audit, SSE Gateway.

Frontend вызывает все продуктовые модули, включая чтение требований на карточке объекта. Zustand — только UI. React Query — серверное состояние.

Аудит пишется на: login, создание и архивацию объекта, старт пакета, ручную правку поля и типа, решение по замечанию, генерацию отчёта.

---

## 7. Что считать готовым к коду

- Один стек, записанный в этом файле
- ERD, Prisma и частичные индексы совпадают
- Роли MVP: owner, engineer
- Автоматы состояний записаны
- OpenAPI покрывает загрузку, confirm, start, SSE, решение по замечанию и отчёт
- BPMN содержит отказ загрузки, OCR, retry, partial/failed и отчёт по scope
- Подрядчик и роли admin/reviewer/viewer вынесены из MVP на диаграмме use case
