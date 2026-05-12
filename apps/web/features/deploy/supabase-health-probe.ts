import type { DeployHealthProbe } from "@/features/deploy/application"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type RpcError = {
  message: string
  code?: string
  details?: string
  hint?: string
}

type DeployHealthRpcClient = {
  rpc(
    fn: "deploy_health_check",
    args: Record<string, never>
  ): PromiseLike<{ data: boolean | null; error: RpcError | null }>
}

export function createSupabaseDeployHealthProbe({
  client,
}: {
  client?: DeployHealthRpcClient
} = {}): DeployHealthProbe {
  return {
    async check() {
      const rpcClient =
        client ?? (createSupabaseAdminClient() as unknown as DeployHealthRpcClient)

      try {
        const { data, error } = await rpcClient.rpc("deploy_health_check", {})
        return error === null && data === true
      } catch {
        return false
      }
    },
  }
}
