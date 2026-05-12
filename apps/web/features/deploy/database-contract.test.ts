import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

function migrationSource() {
  const migrationsDir = path.join(
    process.cwd(),
    "..",
    "..",
    "supabase",
    "migrations"
  )
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(migrationsDir, file), "utf8"))
    .join("\n")
}

describe("deploy database contract", () => {
  it("exposes deploy health through a service-role-only RPC", () => {
    const migration = migrationSource()

    expect(migration).toMatch(/function public\.deploy_health_check\(\)/)
    expect(migration).toMatch(/returns boolean/)
    expect(migration).toMatch(/security definer/)
    expect(migration).toMatch(/set search_path = public/)
    expect(migration).toMatch(/perform 1 from public\.workspaces limit 1/)
    expect(migration).toMatch(
      /grant execute on function public\.deploy_health_check\(\)\s+to service_role;/
    )
    expect(migration).toMatch(
      /revoke execute on function public\.deploy_health_check\(\)\s+from anon, authenticated, public;/
    )
  })
})
