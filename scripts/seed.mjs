// Сиды справочников: yarn db:seed
// Требует DATABASE_URL (корневой .env или переменная окружения).
// Работает на нативном Node (type stripping): импортирует TS-модули напрямую.

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (заполните .env или переменную окружения)");
  process.exit(1);
}

const { runSeed } = await import("../src/prisma/seed.ts");
const { db } = await import("../src/prisma/db.ts");

try {
  const result = await runSeed(db);
  console.log("Seed completed:", JSON.stringify(result, null, 2));
} catch (error) {
  console.error("Seed failed:", error);
  process.exitCode = 1;
} finally {
  if (typeof db.end === "function") {
    await db.end();
  }
}
