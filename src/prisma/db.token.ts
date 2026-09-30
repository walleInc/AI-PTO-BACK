import type { db } from "./db";

export const DB = Symbol("DB");
export type AppDb = typeof db;
