import type { db } from "./db.js";

export const DB = Symbol("DB");
export type AppDb = typeof db;
