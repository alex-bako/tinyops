import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

function repoFile(...segments: string[]) {
  return readFileSync(path.join(process.cwd(), "..", "..", ...segments), "utf8")
}

const migration = repoFile(
  "supabase",
  "migrations",
  "20260509000000_auth_invites_profiles.sql"
)
const config = repoFile("supabase", "config.toml")
const seed = repoFile("supabase", "seed.sql")

describe("invite enforcement database contract", () => {
  it("enables RLS on invite and profile tables", () => {
    expect(migration).toMatch(
      /alter table public\.auth_invites enable row level security;/
    )
    expect(migration).toMatch(
      /alter table public\.profiles enable row level security;/
    )
  })

  it("keeps invite and profile email constraints normalized", () => {
    expect(migration).toMatch(
      /constraint auth_invites_email_normalized check \(\s*email = lower\(btrim\(email\)\)\s*and position\('@' in email\) > 1\s*\)/m
    )
    expect(migration).toMatch(
      /constraint profiles_email_normalized check \(\s*email = lower\(btrim\(email\)\)\s*and position\('@' in email\) > 1\s*\)/m
    )
  })

  it("enables the before-user-created hook against the invite function", () => {
    expect(config).toMatch(
      /\[auth\.hook\.before_user_created\]\s*enabled = true\s*uri = "pg-functions:\/\/postgres\/public\/enforce_invited_user"/m
    )
  })

  it("allows invited users by returning an empty hook response", () => {
    expect(migration).toMatch(
      /if exists \(\s*select 1\s*from public\.auth_invites\s*where email = event_email\s*\) then\s*return '\{\}'::jsonb;\s*end if;/m
    )
  })

  it("rejects missing or uninvited emails with a hook error", () => {
    expect(migration).toContain("'http_code', 403")
    expect(migration).toContain("'message', 'Invite required.'")
    expect(migration.match(/jsonb_build_object\(\s*'error'/g)).toHaveLength(2)
  })

  it("grants hook execution only to the Supabase auth admin role", () => {
    expect(migration).toMatch(
      /grant execute on function public\.enforce_invited_user\(jsonb\) to supabase_auth_admin;/
    )
    expect(migration).toMatch(
      /revoke execute on function public\.enforce_invited_user\(jsonb\) from authenticated, anon, public;/
    )
  })

  it("seeds a normalized invite email", () => {
    const email = seed.match(/values \('([^']+)'\)/)?.[1]

    expect(email).toBe("anna@example.co")
    expect(email).toBe(email?.trim().toLowerCase())
    expect(email).toContain("@")
  })
})
