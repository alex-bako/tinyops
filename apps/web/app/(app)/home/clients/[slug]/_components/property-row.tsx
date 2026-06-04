"use client"

import * as React from "react"
import { GripVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { PropertyIconView } from "@/components/property-icon"
import type { ClientProperty } from "@/features/clients/application/client-memory"

import { PropertyValueView } from "./property-value"

export type PropertyDragController = {
  dragId: string | null
  overId: string | null
  onStart: (id: string) => void
  onOver: (id: string) => void
  onDrop: (id: string) => void
  onEnd: () => void
}

export function PropertyRow({
  property,
  canManage,
  onStartEdit,
  onDelete,
  dnd,
}: {
  property: ClientProperty
  canManage: boolean
  onStartEdit: (id: string) => void
  onDelete: (id: string) => void
  dnd: PropertyDragController
}) {
  const [confirm, setConfirm] = React.useState(false)
  const [grip, setGrip] = React.useState(false)

  if (confirm) {
    return (
      <div className="flex items-center gap-3 rounded-xs bg-coral-500/[0.08] px-2.5 py-2">
        <span className="inline-flex items-center gap-1.5 text-[13px] text-coral-700">
          <Trash2Icon className="size-[13px]" /> Delete “{property.name}”?
        </span>
        <div className="ml-auto flex gap-1.5">
          <Button variant="tertiary" size="sm" onClick={() => setConfirm(false)}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(property.id)}>
            <Trash2Icon />
            Delete
          </Button>
        </div>
      </div>
    )
  }

  const isDragging = dnd.dragId === property.id
  const isDragOver = dnd.overId === property.id && dnd.dragId !== property.id

  return (
    <div
      className={cn(
        "group relative grid min-h-[30px] grid-cols-[160px_1fr] items-start gap-x-3 rounded-xs px-1.5 py-[5px] transition-colors hover:bg-[var(--tint-hover)]",
        isDragging && "opacity-40",
        isDragOver && "shadow-[inset_0_2px_0_var(--color-cobalt-500)]"
      )}
      draggable={grip}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move"
        dnd.onStart(property.id)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        dnd.onOver(property.id)
      }}
      onDrop={(event) => {
        event.preventDefault()
        dnd.onDrop(property.id)
        setGrip(false)
      }}
      onDragEnd={() => {
        dnd.onEnd()
        setGrip(false)
      }}
    >
      <span className="inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap text-[13.5px] text-muted-foreground">
        {canManage ? (
          <span
            title="Drag to reorder"
            className="absolute -left-3.5 top-[7px] inline-flex h-4 w-3.5 cursor-grab items-center justify-center text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-65 active:cursor-grabbing hover:!opacity-100"
            onMouseDown={() => setGrip(true)}
            onMouseUp={() => setGrip(false)}
            onMouseLeave={() => setGrip(false)}
          >
            <GripVerticalIcon className="size-[13px]" />
          </span>
        ) : null}
        <PropertyIconView icon={property.icon} className="opacity-70" />
        {property.name}
      </span>

      <span className="py-0.5 text-[13.5px] leading-[1.55]">
        <PropertyValueView value={property.value} />
      </span>

      {canManage ? (
        <span className="absolute right-1 top-[3px] flex gap-0.5 rounded-sm bg-[var(--tint-hover)] p-px opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            title="Edit property"
            aria-label="Edit property"
            className="inline-flex size-6 items-center justify-center rounded-xs text-muted-foreground hover:bg-background hover:text-foreground"
            onClick={() => onStartEdit(property.id)}
          >
            <PencilIcon className="size-[13px]" />
          </button>
          <button
            type="button"
            title="Delete property"
            aria-label="Delete property"
            className="inline-flex size-6 items-center justify-center rounded-xs text-muted-foreground hover:bg-background hover:text-coral-700"
            onClick={() => setConfirm(true)}
          >
            <Trash2Icon className="size-[13px]" />
          </button>
        </span>
      ) : null}
    </div>
  )
}
