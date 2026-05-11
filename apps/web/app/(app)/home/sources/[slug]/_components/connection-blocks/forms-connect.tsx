"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { UploadIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Form, FormRow } from "@workspace/ui/components/form-row"
import { Input } from "@workspace/ui/components/input"

import { connectGoogleFormsManualCsvDataSourceAction } from "@/features/data-sources/actions"
import {
  parseGoogleFormsCsv,
  type GoogleFormsParsedCsv,
} from "@/features/data-sources/google-forms"
import type { DataSource } from "@/lib/sources"

import { OAuthConnect } from "./oauth-connect"

type CsvState = {
  fileName: string
  csvText: string
  parsed: GoogleFormsParsedCsv | null
}

type FormsConnectionTab = "manual_csv" | "oauth_mock"

function FormsConnect({ source }: { source: DataSource }) {
  const { refresh } = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [connectionMode, setConnectionMode] =
    React.useState<FormsConnectionTab>("manual_csv")
  const [formUrlOrId, setFormUrlOrId] = React.useState("")
  const [displayName, setDisplayName] = React.useState("")
  const [identityColumn, setIdentityColumn] = React.useState("")
  const [timestampColumn, setTimestampColumn] = React.useState("")
  const [csv, setCsv] = React.useState<CsvState>({
    fileName: "",
    csvText: "",
    parsed: null,
  })
  const [error, setError] = React.useState<string | null>(null)

  const headers = csv.parsed?.headers ?? []
  const canSubmit =
    formUrlOrId.trim() &&
    displayName.trim() &&
    csv.csvText &&
    identityColumn &&
    timestampColumn

  const uploadCsv = async (file: File | undefined) => {
    setError(null)
    if (!file) return

    try {
      const csvText = await file.text()
      const parsed = parseGoogleFormsCsv(csvText)
      setCsv({ fileName: file.name, csvText, parsed })
      setIdentityColumn(preferredColumn(parsed.headers, /email/i))
      setTimestampColumn(preferredColumn(parsed.headers, /timestamp|time/i))
    } catch {
      setCsv({ fileName: "", csvText: "", parsed: null })
      setIdentityColumn("")
      setTimestampColumn("")
      setError("CSV could not be parsed.")
    }
  }

  const submit = () => {
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      const result = await connectGoogleFormsManualCsvDataSourceAction({
        formUrlOrId,
        displayName,
        fileName: csv.fileName,
        identityColumn,
        timestampColumn,
        csvText: csv.csvText,
      })

      if (result.error) {
        setError(formsErrorLabel(result.error))
        return
      }
      refresh()
    })
  }

  const oauthSource: DataSource = {
    ...source,
    auth: "oauth",
    connected: false,
    sourceRowId: undefined,
    sourceRowIds: [],
  }

  return (
    <Form>
      <FormRow label="Connection mode">
        <div
          role="tablist"
          aria-label="Google Forms connection mode"
          className="inline-flex h-8 w-fit items-center rounded-lg bg-muted p-[3px] text-muted-foreground"
        >
          <button
            type="button"
            role="tab"
            aria-selected={connectionMode === "manual_csv"}
            className={modeTabClassName(connectionMode === "manual_csv")}
            onClick={() => setConnectionMode("manual_csv")}
          >
            CSV upload
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={connectionMode === "oauth_mock"}
            className={modeTabClassName(connectionMode === "oauth_mock")}
            onClick={() => setConnectionMode("oauth_mock")}
          >
            OAuth
          </button>
        </div>
      </FormRow>
      {connectionMode === "oauth_mock" ? (
        <OAuthConnect source={oauthSource} />
      ) : (
        <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow
          label="Google Form URL or ID"
          className="sm:grid-cols-[140px_minmax(0,1fr)]"
        >
          <Input
            aria-label="Google Form URL or ID"
            value={formUrlOrId}
            onChange={(event) => setFormUrlOrId(event.target.value)}
            placeholder="https://docs.google.com/forms/d/..."
            className="font-mono text-[12.5px]"
          />
        </FormRow>
        <FormRow label="Form name" className="sm:grid-cols-[100px_minmax(0,1fr)]">
          <Input
            aria-label="Form name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Practice intake"
          />
        </FormRow>
      </div>
      <FormRow
        label="Responses CSV"
        help="Export responses from Google Forms, then upload the CSV here."
      >
        <Input
          aria-label="Responses CSV"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => void uploadCsv(event.target.files?.[0])}
          className="text-[12.5px]"
        />
        {csv.parsed ? (
          <span className="text-[12px] text-muted-foreground">
            {csv.parsed.rows.length}{" "}
            {csv.parsed.rows.length === 1 ? "response" : "responses"} found
          </span>
        ) : null}
      </FormRow>
      {headers.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormRow
            label="Client identity column"
            className="sm:grid-cols-[150px_minmax(0,1fr)]"
          >
            <select
              aria-label="Client identity column"
              value={identityColumn}
              onChange={(event) => setIdentityColumn(event.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-[13px]"
            >
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow
            label="Response timestamp column"
            className="sm:grid-cols-[170px_minmax(0,1fr)]"
          >
            <select
              aria-label="Response timestamp column"
              value={timestampColumn}
              onChange={(event) => setTimestampColumn(event.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-[13px]"
            >
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </FormRow>
        </div>
      ) : null}
      <div className="inline-flex items-center gap-3">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={pending || !canSubmit}
          onClick={submit}
        >
          <UploadIcon />
          {pending ? "Uploading" : "Upload CSV"}
        </Button>
        {error ? (
          <span className="text-[12px] text-coral-700">{error}</span>
        ) : null}
      </div>
        </>
      )}
    </Form>
  )
}

function modeTabClassName(active: boolean) {
  return [
    "inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md px-3 text-[12.5px] font-medium transition-colors",
    active
      ? "bg-card text-foreground shadow-sm"
      : "text-foreground/60 hover:text-foreground",
  ].join(" ")
}

function preferredColumn(headers: string[], pattern: RegExp) {
  return headers.find((header) => pattern.test(header)) ?? headers[0] ?? ""
}

function formsErrorLabel(error: string) {
  if (error === "source_manage_forbidden") {
    return "Only workspace owners and admins can manage data sources."
  }
  if (
    error === "invalid_google_form_id" ||
    error === "invalid_google_forms_csv" ||
    error === "invalid_google_forms_csv_mapping" ||
    error === "invalid_google_forms_csv_row"
  ) {
    return "Check the form ID, selected columns, and CSV values."
  }
  return "Could not upload Google Forms CSV."
}

export { FormsConnect }
