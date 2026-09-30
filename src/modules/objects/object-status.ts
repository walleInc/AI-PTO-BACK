export type ObjectStatus = "draft" | "active" | "on_hold" | "completed" | "archived";

const ALLOWED_TRANSITIONS: Readonly<Record<ObjectStatus, readonly ObjectStatus[]>> = {
  draft: ["active"],
  active: ["on_hold", "completed"],
  on_hold: ["active", "completed"],
  completed: [],
  archived: [],
};

export function canTransitionObjectStatus(from: ObjectStatus, to: ObjectStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function todayDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
