import type { Client } from "@/features/clients/application/client-memory"

export type FilterId =
  | "all"
  | "active"
  | "overdue"
  | "sensitive"
  | "inactive"
  | "dnc"

export const FILTER_TABS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "overdue", label: "Overdue" },
  { id: "sensitive", label: "Sensitive" },
  { id: "inactive", label: "Inactive" },
  { id: "dnc", label: "Do not contact" },
]

export function matchesFilter(c: Client, filter: FilterId): boolean {
  switch (filter) {
    case "all":
      return true
    case "active":
      return c.status === "active"
    case "overdue":
      return c.flags.includes("overdue")
    case "sensitive":
      return c.status === "sensitive" || c.flags.includes("sensitive")
    case "inactive":
      return c.status === "inactive"
    case "dnc":
      return c.status === "dnc"
  }
}

export function countFor(rows: Client[], filter: FilterId): number {
  return rows.reduce((acc, c) => acc + (matchesFilter(c, filter) ? 1 : 0), 0)
}
