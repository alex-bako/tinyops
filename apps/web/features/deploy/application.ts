export type DeployHealthCheckName = "supabase"
export type DeployHealthCheckStatus = "ok" | "error"

export type DeployHealthResult =
  | {
      status: "ok"
      checks: Record<DeployHealthCheckName, "ok">
    }
  | {
      status: "unavailable"
      checks: Record<DeployHealthCheckName, "error">
    }

export type DeployHealthProbe = {
  check(): Promise<boolean>
}

export function createDeployHealthCheck({
  supabase,
}: {
  supabase: DeployHealthProbe
}) {
  return {
    async check(): Promise<DeployHealthResult> {
      try {
        if (await supabase.check()) {
          return { status: "ok", checks: { supabase: "ok" } }
        }
      } catch {
        // Health endpoints fail closed so deploy smoke tests stop bad releases.
      }

      return { status: "unavailable", checks: { supabase: "error" } }
    },
  }
}
