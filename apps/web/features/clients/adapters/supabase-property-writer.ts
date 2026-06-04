import type {
  ClientPropertyWriterPort,
  CreatedClientProperty,
} from "@/features/clients/application/client-properties"
import { clientPropertyValueToStored } from "@/features/clients/domain/client-profile"
import type { Json } from "@/lib/database.types"

type WriteResult<T> = Promise<{
  data: T | null
  error: { message: string } | null
}>

type MutateResult = { error: { message: string } | null }

type PropertyInsert = {
  workspace_id: string
  client_id: string
  name: string
  icon: string
  type: string
  value: Json
  position: number
}

type PropertyUpdate = {
  name?: string
  icon?: string
  type?: string
  value?: Json
  position?: number
  updated_at?: string
}

type PropertyMutateBuilder = PromiseLike<MutateResult> & {
  eq(column: string, value: unknown): PropertyMutateBuilder
}

type PropertyWriterQuery = {
  insert(values: PropertyInsert): {
    select(columns: string): {
      single(): WriteResult<{ id: string }>
    }
  }
  update(values: PropertyUpdate): PropertyMutateBuilder
  delete(): PropertyMutateBuilder
}

export type SupabaseClientPropertyWriterClient = {
  from(table: string): unknown
}

export function createSupabaseClientPropertyWriter({
  client,
}: {
  client: SupabaseClientPropertyWriterClient
}): ClientPropertyWriterPort {
  return {
    async create({
      workspaceId,
      clientId,
      name,
      icon,
      type,
      value,
    }): Promise<CreatedClientProperty> {
      // New rows sort last: Date.now() dwarfs the small index positions a
      // reorder writes, so a freshly added property always lands at the end.
      const { data, error } = await clientProperties(client)
        .insert({
          workspace_id: workspaceId,
          client_id: clientId,
          name,
          icon,
          type,
          value: clientPropertyValueToStored(value),
          position: Date.now(),
        })
        .select("id")
        .single()

      if (error || !data) {
        throw new Error("property_action_failed", { cause: error ?? undefined })
      }
      return { id: data.id }
    },

    // Update/delete/reorder are gated to owner/admin in the application layer
    // before they reach here, so RLS always permits the write. We don't chain
    // .select(): under RLS an UPDATE/DELETE ... RETURNING can come back empty
    // even when the row changed, which would read as a false miss. A null error
    // means the write executed.
    async update({ workspaceId, id, name, icon, type, value }) {
      const { error } = await clientProperties(client)
        .update({
          name,
          icon,
          type,
          value: clientPropertyValueToStored(value),
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", workspaceId)
        .eq("id", id)

      if (error) throw new Error("property_action_failed", { cause: error })
    },

    async delete({ workspaceId, id }) {
      const { error } = await clientProperties(client)
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("id", id)

      if (error) throw new Error("property_action_failed", { cause: error })
    },

    async reorder({ workspaceId, clientId, orderedIds }) {
      const results = await Promise.all(
        orderedIds.map((id, index) =>
          clientProperties(client)
            .update({ position: index })
            .eq("workspace_id", workspaceId)
            .eq("client_id", clientId)
            .eq("id", id)
        )
      )
      for (const { error } of results) {
        if (error) throw new Error("property_action_failed", { cause: error })
      }
    },
  }
}

function clientProperties(
  client: SupabaseClientPropertyWriterClient
): PropertyWriterQuery {
  return client.from("client_properties") as PropertyWriterQuery
}
