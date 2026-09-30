# AI-ПТО — архитектура v0.2

Каноническая версия для Sprint 1.

## Читать сначала

- `AI-PTO_Project_Documentation_v0.2.md` — закрытые решения, стек, автоматы, модель.
- `prisma/schema.prisma` — схема PostgreSQL.
- `prisma/partial-indexes.sql` — уникальность наборов требований.
- `openapi/openapi.yaml` — контракт API 0.2.0.

## Диаграммы

- `AI-PTO_ERD_v0.2.puml` — логическая модель, совпадает с Prisma.
- `AI-PTO_UML_StateMachines_v0.2.puml` — объект, пакет, стадия, замечание, отчёт.
- `AI-PTO_UML_UseCases_v0.2.puml` — MVP: owner и engineer. Подрядчик вынесен за релиз.
- `AI-PTO_UML_Sequence_PackageProcessing_v0.2.puml` — confirm загрузки, OCR, retry, SSE.
- `AI-PTO_UML_Component_v0.2.puml` — модули Nest, Python OCR-воркер, Rule Engine, SSE.
- `AI-PTO_BPMN_DocumentProcessing_v0.2.bpmn` — ветки отказа, retry, partial/failed, отчёт по scope.

PlantUML открывается в совместимом рендере. BPMN — в редакторе BPMN 2.0.

## Стек

NestJS, Prisma, PostgreSQL, Redis, BullMQ, React. Файлы — Yandex Object Storage. OCR — Python-воркер на общей очереди Redis (PaddleOCR).
