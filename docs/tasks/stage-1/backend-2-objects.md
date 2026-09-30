# Бэкенд 2. CRUD строительных объектов

Модуль: Objects. Зависит от миграции, сидов и `GET /auth/me` бэкенда 1. Все запросы читают организацию из сессии, не из тела и не из query.

## Сделать

1. `GET /api/object-types` — активные типы вместе с группой.
2. `GET /api/work-types` — активные виды работ.
3. `GET /api/counterparties` — организации `kind=counterparty`.
4. `GET /api/objects` — объекты текущей организации, без `archived`, если не передан `includeArchived=true`. В элементе списка: id, code, name, address, status, тип, заказчик, подрядчик, виды работ.
5. `POST /api/objects` — тело `ObjectWrite` из OpenAPI. Объект создаётся в `draft`, `organizationId` берётся из сессии, `createdById` — из пользователя. `code` уникален внутри организации. Виды работ пишутся в `ObjectWorkType`.
6. `GET /api/objects/{id}` — карточка. Чужой и несуществующий id отвечают одинаково, 404.
7. `PATCH /api/objects/{id}` — те же поля, что у создания. Код, занятый другим объектом этой организации, — 409. Архивный объект не редактируется, 409.
8. `POST /api/objects/{id}/status` — только переходы `draft → active`, `active → on_hold`, `on_hold → active`, `active → completed`, `on_hold → completed`. Из `archived` перехода нет. При переходе в `completed` проставить `actualEndDate` текущей датой, если поле пустое.
9. `POST /api/objects/{id}/archive` — только роль `owner`. Инженер получает 403. Поля `status=archived` и `archivedAt` выставляются вместе. Повторный вызов — 409.
10. На создание, изменение, смену статуса и архивацию писать `AuditLog`: actor, action, entityType=`construction_object`, entityId, organizationId.
11. Заказчик и подрядчик, если переданы, должны быть организациями `kind=counterparty`. Иначе 422.

`customerProfileId` и пересчёт `ObjectRequirementBinding` на этом этапе не реализуются: профилей требований ещё нет. Поле в запросе игнорируется.

## Не делать

Пакеты, загрузку файлов, документы, замечания, чеклист, отчёты, BullMQ.

## Готово, когда

Инженер создаёт и меняет объект только в своей организации. Владелец архивирует его, инженер на архивации получает 403. Незаконный переход статуса получает 409. Список без флага не показывает архив.
