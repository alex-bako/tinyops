import { canManageProperties } from "@/features/clients/application/properties-policy"
import type {
  ClientPropertyValue,
  PropertyIcon,
  PropertyType,
} from "@/features/clients/domain/client-profile"
import type { WorkspaceRole } from "@/features/workspaces/types"

export type ClientPropertyWorkspace = {
  id: string
  role: WorkspaceRole
}

export type CreatedClientProperty = {
  id: string
}

/** A validated property write — name trimmed, value normalized for its type. */
export type ClientPropertyDraft = {
  name: string
  icon: PropertyIcon
  type: PropertyType
  value: ClientPropertyValue
}

export type ClientPropertyWriterPort = {
  create(input: ClientPropertyDraft & {
    workspaceId: string
    clientId: string
  }): Promise<CreatedClientProperty>
  update(input: ClientPropertyDraft & {
    workspaceId: string
    id: string
  }): Promise<void>
  delete(input: { workspaceId: string; id: string }): Promise<void>
  reorder(input: {
    workspaceId: string
    clientId: string
    orderedIds: string[]
  }): Promise<void>
}

export type ClientPropertyActionError =
  | "not_authenticated"
  | "property_manage_forbidden"
  | "invalid_property"
  | "property_not_found"
  | "property_action_failed"

export type ClientPropertyActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: ClientPropertyActionError }

/** Raw, untrusted property input as it arrives from a client component. */
export type ClientPropertyInput = {
  name: string
  icon: PropertyIcon
  type: PropertyType
  value: ClientPropertyValue
}

export type ClientPropertiesCommandApplication = ReturnType<
  typeof createClientPropertiesCommandApplication
>

export function createClientPropertiesCommandApplication({
  workspace,
  writer,
}: {
  workspace: ClientPropertyWorkspace
  writer: ClientPropertyWriterPort
}) {
  async function runManaged<T>(
    operation: () => Promise<T>
  ): Promise<ClientPropertyActionResult<T>> {
    if (!canManageProperties(workspace.role)) {
      return { error: "property_manage_forbidden" }
    }

    try {
      return { data: await operation() }
    } catch (error) {
      return { error: mapClientPropertyActionError(error) }
    }
  }

  return {
    async createProperty(
      input: { clientId: string } & ClientPropertyInput
    ): Promise<ClientPropertyActionResult<CreatedClientProperty>> {
      return runManaged(() => {
        const draft = requireDraft(input)
        return writer.create({
          workspaceId: workspace.id,
          clientId: input.clientId,
          ...draft,
        })
      })
    },

    async updateProperty(
      input: { id: string } & ClientPropertyInput
    ): Promise<ClientPropertyActionResult<undefined>> {
      return runManaged(async () => {
        const draft = requireDraft(input)
        await writer.update({ workspaceId: workspace.id, id: input.id, ...draft })
        return undefined
      })
    },

    async deleteProperty(
      input: { id: string }
    ): Promise<ClientPropertyActionResult<undefined>> {
      return runManaged(async () => {
        await writer.delete({ workspaceId: workspace.id, id: input.id })
        return undefined
      })
    },

    async reorderProperties(
      input: { clientId: string; orderedIds: string[] }
    ): Promise<ClientPropertyActionResult<undefined>> {
      return runManaged(async () => {
        await writer.reorder({
          workspaceId: workspace.id,
          clientId: input.clientId,
          orderedIds: input.orderedIds,
        })
        return undefined
      })
    },
  }
}

/**
 * Validates and normalizes an incoming property: the name must be non-empty,
 * and the value is trimmed/cleaned for its type. Throws "invalid_property" so
 * the gate's catch maps it to the action error.
 */
function requireDraft(input: ClientPropertyInput): ClientPropertyDraft {
  const name = input.name.trim()
  if (!name) throw new Error("invalid_property")
  return {
    name,
    icon: input.icon,
    type: input.type,
    value: normalizeValue(input.type, input.value),
  }
}

function normalizeValue(
  type: PropertyType,
  value: ClientPropertyValue
): ClientPropertyValue {
  if (type === "tags") {
    const values =
      value.kind === "tags"
        ? Array.from(
            new Set(
              value.values.map((tag) => tag.trim()).filter((tag) => tag.length > 0)
            )
          )
        : []
    return { kind: "tags", values }
  }
  if (type === "status") {
    const label = value.kind === "status" ? value.label.trim() : ""
    const statusKind = value.kind === "status" ? value.statusKind : "neutral"
    return { kind: "status", statusKind, label }
  }
  // text | date
  const text =
    value.kind === "text" || value.kind === "date" ? value.text.trim() : ""
  return type === "date" ? { kind: "date", text } : { kind: "text", text }
}

function mapClientPropertyActionError(error: unknown): ClientPropertyActionError {
  if (error instanceof Error && isClientPropertyActionError(error.message)) {
    return error.message
  }
  return "property_action_failed"
}

function isClientPropertyActionError(
  value: string
): value is ClientPropertyActionError {
  return (
    value === "invalid_property" ||
    value === "property_not_found" ||
    value === "property_action_failed"
  )
}
