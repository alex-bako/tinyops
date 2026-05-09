import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

function supabaseFile(name: string) {
  return readFileSync(path.join(process.cwd(), "lib/supabase", name), "utf8")
}

describe("Supabase adapter import boundaries", () => {
  it("keeps the browser adapter on public env only", () => {
    const source = supabaseFile("browser.ts")

    expect(source).toContain("@/lib/supabase/public-env")
    expect(source).not.toContain("@/lib/supabase/server-env")
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY")
  })

  it("keeps the admin adapter on server env only", () => {
    const source = supabaseFile("admin.ts")

    expect(source).toContain("@/lib/supabase/server-env")
    expect(source).not.toContain("@/lib/supabase/public-env")
  })
})
