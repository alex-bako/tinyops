"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Section, SectionHead } from "@workspace/ui/components/section"

import type { ClientProperty } from "@/features/clients/application/client-memory"

import { PropertyEditor } from "./property-editor"
import { PropertyRow, type PropertyDragController } from "./property-row"
import { useProperties, type PropertyInput } from "./use-property-collection"

export function PropertiesSection({
  clientId,
  initialProperties,
  canManage,
}: {
  clientId: string
  initialProperties: ClientProperty[]
  canManage: boolean
}) {
  const { items, create, update, remove, reorder } = useProperties({
    clientId,
    initialProperties,
  })

  const [editId, setEditId] = React.useState<string | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [overId, setOverId] = React.useState<string | null>(null)

  const startAdd = () => {
    setEditId(null)
    setAdding(true)
  }
  const startEdit = (id: string) => {
    setAdding(false)
    setEditId(id)
  }
  const cancel = () => {
    setAdding(false)
    setEditId(null)
  }

  const submitAdd = (input: PropertyInput) => {
    create(input)
    cancel()
  }
  const submitEdit = (id: string, input: PropertyInput) => {
    update(id, input)
    cancel()
  }
  const handleDelete = (id: string) => {
    remove(id)
    cancel()
  }

  const dnd: PropertyDragController = {
    dragId,
    overId,
    onStart: setDragId,
    onOver: setOverId,
    onDrop: (id) => {
      if (dragId && dragId !== id) reorder(dragId, id)
      setDragId(null)
      setOverId(null)
    },
    onEnd: () => {
      setDragId(null)
      setOverId(null)
    },
  }

  const count = `${items.length} ${items.length === 1 ? "field" : "fields"}`

  return (
    <Section divider>
      <SectionHead
        title="Properties"
        count={count}
        actions={
          canManage ? (
            <Button variant="tertiary" size="sm" onClick={adding ? cancel : startAdd}>
              <PlusIcon />
              Add property
            </Button>
          ) : null
        }
      />

      <div className="-mx-1.5 flex flex-col">
        {items.map((property) =>
          editId === property.id ? (
            <PropertyEditor
              key={property.id}
              mode="edit"
              property={property}
              onSubmit={(input) => submitEdit(property.id, input)}
              onCancel={cancel}
              onDelete={() => handleDelete(property.id)}
            />
          ) : (
            <PropertyRow
              key={property.id}
              property={property}
              canManage={canManage}
              onStartEdit={startEdit}
              onDelete={remove}
              dnd={dnd}
            />
          )
        )}
      </div>

      {adding ? (
        <PropertyEditor mode="add" property={null} onSubmit={submitAdd} onCancel={cancel} />
      ) : canManage ? (
        <button
          type="button"
          onClick={startAdd}
          className="mt-1 inline-flex items-center gap-1.5 rounded-xs px-1.5 py-[5px] text-[13px] text-muted-foreground/60 transition-colors hover:bg-[var(--tint-hover)] hover:text-muted-foreground"
        >
          <PlusIcon className="size-[13px] opacity-80" />
          Add a property
        </button>
      ) : items.length === 0 ? (
        <p className="px-1.5 py-[5px] text-[13px] italic text-muted-foreground/60">
          No properties yet.
        </p>
      ) : null}
    </Section>
  )
}
