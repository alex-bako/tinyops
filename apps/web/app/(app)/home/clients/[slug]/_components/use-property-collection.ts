"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import type {
  ClientProperty,
  ClientPropertyValue,
  PropertyIcon,
  PropertyType,
} from "@/features/clients/application/client-memory"

import {
  createPropertyAction,
  deletePropertyAction,
  reorderPropertiesAction,
  updatePropertyAction,
} from "../actions"

/** A property write as the editor produces it (no id/position yet). */
export type PropertyInput = {
  name: string
  icon: PropertyIcon
  type: PropertyType
  value: ClientPropertyValue
}

export type PropertyCollection = {
  items: ClientProperty[]
  create: (input: PropertyInput) => void
  update: (id: string, input: PropertyInput) => void
  remove: (id: string) => void
  reorder: (fromId: string, toId: string) => void
}

const TEMP_PREFIX = "temp-"

function tempId(): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(performance.now())}`
  return `${TEMP_PREFIX}${id}`
}

/**
 * Optimistic CRUD + reorder for client properties. Each mutation applies to a
 * local working copy immediately, then runs its server action and refreshes;
 * once no mutations are in flight, the server's truth (delivered via
 * `initialProperties`) is adopted wholesale. Failures revert to that truth and
 * surface a toast. New rows carry a `temp-` id and are excluded from reorder
 * persistence until the refresh assigns them a real one.
 */
export function useProperties({
  clientId,
  initialProperties,
}: {
  clientId: string
  initialProperties: ClientProperty[]
}): PropertyCollection {
  const { refresh } = useRouter()

  const [items, setItems] = React.useState<ClientProperty[]>(initialProperties)
  const pending = React.useRef(0)
  const serverTruth = React.useRef(initialProperties)

  // Adopt fresh server data only when nothing is in flight, so an unrelated
  // refresh can't clobber an optimistic change mid-mutation.
  React.useEffect(() => {
    serverTruth.current = initialProperties
    if (pending.current === 0) setItems(initialProperties)
  }, [initialProperties])

  const run = React.useCallback(
    (
      optimistic: (prev: ClientProperty[]) => ClientProperty[],
      action: () => Promise<{ error?: string }>,
      errorMessage: string
    ) => {
      pending.current += 1
      setItems(optimistic)
      void (async () => {
        let failed = false
        try {
          const result = await action()
          failed = Boolean(result.error)
        } catch {
          failed = true
        } finally {
          pending.current -= 1
        }
        if (failed) {
          toast.error(errorMessage)
          if (pending.current === 0) setItems(serverTruth.current)
          return
        }
        refresh()
      })()
    },
    [refresh]
  )

  const create = React.useCallback(
    (input: PropertyInput) => {
      const optimisticItem: ClientProperty = {
        id: tempId(),
        name: input.name,
        icon: input.icon,
        type: input.type,
        value: input.value,
        position: Number.MAX_SAFE_INTEGER,
      }
      run(
        (prev) => [...prev, optimisticItem],
        () => createPropertyAction({ clientId, ...input }),
        "Couldn’t add property"
      )
    },
    [clientId, run]
  )

  const update = React.useCallback(
    (id: string, input: PropertyInput) => {
      run(
        (prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...input } : item)),
        () => updatePropertyAction({ id, ...input }),
        "Couldn’t save property"
      )
    },
    [run]
  )

  const remove = React.useCallback(
    (id: string) => {
      run(
        (prev) => prev.filter((item) => item.id !== id),
        () => deletePropertyAction({ id }),
        "Couldn’t delete property"
      )
    },
    [run]
  )

  // The reorder action needs the post-move order up front (reading it lazily
  // inside the action would see pre-move state). Compute `next` from the
  // committed items, then feed the *same* array to the optimistic update and
  // the persisted ids so they can never disagree.
  const itemsRef = React.useRef(items)
  React.useEffect(() => {
    itemsRef.current = items
  }, [items])

  const reorder = React.useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return
      const prev = itemsRef.current
      const from = prev.findIndex((item) => item.id === fromId)
      const to = prev.findIndex((item) => item.id === toId)
      if (from === -1 || to === -1) return
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved!)
      // Temp rows have no server position yet; the refresh that lands their
      // real id will settle the final order.
      const orderedIds = next
        .map((item) => item.id)
        .filter((id) => !id.startsWith(TEMP_PREFIX))
      run(
        () => next,
        () => reorderPropertiesAction({ clientId, orderedIds }),
        "Couldn’t reorder properties"
      )
    },
    [clientId, run]
  )

  return { items, create, update, remove, reorder }
}
