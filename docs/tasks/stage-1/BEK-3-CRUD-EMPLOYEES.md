### Employees API

**Owner** и **Engineer** имеют доступ к странице **Сотрудники**. Все эндпоинты работают с инженерами организации текущего membership вызывающего.

Контракт: `docs/openapi.yaml` и `docs/openapi/openapi.yaml` (tag Employees).

---

**GET `/api/employees`**  
Список активных инженеров организации (`role=engineer`, `status=active`).  
Доступно **Owner** и **Engineer**.  
Ответ: `Employee[]`.

---

**GET `/api/employees/{id}`**  
Карточка активного инженера по `id`.  
Доступно только **Owner**. Чужой org / owner / disabled → `404`.

---

**POST `/api/employees`**  
Создание инженера. Body: `{ email, name, password }` (пароль ≥ 8 символов).  
Создаёт `User` (`active`) + `Membership` (`engineer`/`active`).  
Доступно только **Owner**. Email занят → `409`.

---

**PATCH `/api/employees/{id}`**  
Частичное изменение: `name?`, `email?`, `password?` (хотя бы одно поле).  
Доступно только **Owner**.

---

**DELETE `/api/employees/{id}`**  
Soft-delete: `User.status=disabled`, `Membership.status=disabled`, сессии отозваны.  
Запись остаётся в БД, в list/get больше не отдаётся. Ответ `204`.  
Доступно только **Owner**. Нельзя удалить себя.
