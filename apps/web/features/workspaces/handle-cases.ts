import { HANDLE_MAX_LENGTH } from "@/features/workspaces/handle"

/**
 * The one input table behind M3.T2's "the UI and both server paths agree" acceptance.
 * It lives outside the test files so all three can import it without re-registering each
 * other's suites. `handle` is what `normalizeWorkspaceHandle` stores; `""` means the input
 * cannot yield a storable handle.
 */
export const HANDLE_TABLE = [
  { input: "Park Therapy", handle: "park-therapy" },
  { input: "Bako Studio", handle: "bako-studio" },
  { input: "  Park  Therapy  ", handle: "park-therapy" },
  { input: "--park--", handle: "park" },
  { input: "Park-Therapy", handle: "park-therapy" },
  // Already passes the database check constraint, yet is not what the rule derives: the
  // constraint permits repeated dashes and the rule collapses them. Without this row every
  // entry point could disagree here and no test would notice.
  { input: "ab--cd", handle: "ab-cd" },
  { input: "New Name!", handle: "new-name" },
  { input: "Bak\u00f3 St\u00fadi\u00f3", handle: "bak-st-di" },
  { input: "A & B", handle: "a-b" },
  { input: "123", handle: "123" },
  { input: "x".repeat(70), handle: "x".repeat(HANDLE_MAX_LENGTH) },
  { input: "Pa", handle: "" },
  { input: "!!!", handle: "" },
  { input: "", handle: "" },
]
