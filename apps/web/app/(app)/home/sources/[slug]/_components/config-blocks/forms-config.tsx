"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PlugIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Form, FormRow } from "@workspace/ui/components/form-row"

import { disconnectDataSourceAction } from "@/features/data-sources/actions"
import type { DataSource } from "@/lib/sources"

import { DsSection, DsSectionHead } from "../ds-section"
import { FileRow } from "../file-row"
import { SourceSyncButton } from "../source-sync-button"

function FormsConfig({ source }: { source: DataSource }) {
  const connections = source.forms?.connections ?? []
  return (
    <DsSection>
      <DsSectionHead
        title="Forms"
        hint="Connected Google Forms response imports."
      />
      <Form>
        <FormRow label="Connected forms">
          <div className="flex flex-col gap-0.5">
            {connections.length > 0 ? (
              connections.map((connection) => (
                <FileRow
                  key={connection.sourceRowId}
                  name={connection.displayName}
                  meta={[
                    connection.connectionMode === "manual_csv"
                      ? "manual CSV"
                      : connection.connectionMode,
                    connection.latestUpload
                      ? `${connection.latestUpload.rowCount} responses`
                      : "no upload",
                    connection.syncStatus ?? "idle",
                  ].join(" · ")}
                >
                  <div className="flex items-center gap-1">
                    <SourceSyncButton sourceRowId={connection.sourceRowId} />
                    <DisconnectFormButton
                      sourceRowId={connection.sourceRowId}
                      displayName={connection.displayName}
                    />
                  </div>
                </FileRow>
              ))
            ) : (
              <FileRow name="No forms connected" meta="Upload a CSV to connect" />
            )}
          </div>
        </FormRow>
      </Form>
    </DsSection>
  )
}

function DisconnectFormButton({
  sourceRowId,
  displayName,
}: {
  sourceRowId: string
  displayName: string
}) {
  const { refresh } = useRouter()
  const [pending, startTransition] = React.useTransition()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={`Disconnect ${displayName}`}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await disconnectDataSourceAction(sourceRowId)
          if (!result.error) refresh()
        })
      }}
    >
      <PlugIcon />
      Disconnect
    </Button>
  )
}

export { FormsConfig }
