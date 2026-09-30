-- Частичная уникальность набора требований.
-- NULL в customerProfileId означает нормативный набор по умолчанию.
-- В PostgreSQL обычный UNIQUE пропускает несколько NULL, поэтому индексы разделены.

CREATE UNIQUE INDEX IF NOT EXISTS requirement_set_default_uq
  ON "RequirementSet" ("objectTypeId", "workTypeId", "version")
  WHERE "customerProfileId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS requirement_set_profile_uq
  ON "RequirementSet" ("objectTypeId", "workTypeId", "customerProfileId", "version")
  WHERE "customerProfileId" IS NOT NULL;
