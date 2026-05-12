import { createDeployHealthCheck } from "@/features/deploy/application"
import { createSupabaseDeployHealthProbe } from "@/features/deploy/supabase-health-probe"

export function createDeployHealthRuntime() {
  return createDeployHealthCheck({
    supabase: createSupabaseDeployHealthProbe(),
  })
}
