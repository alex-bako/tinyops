"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { UploadIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Form, FormRow } from "@workspace/ui/components/form-row"
import { Input } from "@workspace/ui/components/input"

import {
  connectGoogleFormsManualCsvDataSourceAction,
  updateGoogleFormsManualCsvDataSourceAction,
} from "@/features/data-sources/actions"
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

type FormsConnectState = {
  connectionMode: FormsConnectionTab
  formUrlOrId: string
  displayName: string
  identityColumn: string
  timestampColumn: string
  csv: CsvState
  error: string | null
}

type FormsConnectAction =
  | { type: "set_connection_mode"; value: FormsConnectionTab }
  | { type: "set_form_url_or_id"; value: string }
  | { type: "set_display_name"; value: string }
  | { type: "set_identity_column"; value: string }
  | { type: "set_timestamp_column"; value: string }
  | {
      type: "csv_uploaded"
      fileName: string
      csvText: string
      parsed: GoogleFormsParsedCsv
    }
  | { type: "csv_failed" }
  | { type: "clear_error" }
  | { type: "set_error"; value: string }

const EMPTY_CSV_STATE: CsvState = {
  fileName: "",
  csvText: "",
  parsed: null,
}

const INITIAL_FORMS_CONNECT_STATE: FormsConnectState = {
  connectionMode: "manual_csv",
  formUrlOrId: "",
  displayName: "",
  identityColumn: "",
  timestampColumn: "",
  csv: EMPTY_CSV_STATE,
  error: null,
}

function FormsConnect({ source }: { source: DataSource }) {
  const { refresh } = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [state, dispatch] = React.useReducer(
    formsConnectReducer,
    source,
    initialFormsConnectState
  )
  const {
    connectionMode,
    formUrlOrId,
    displayName,
    identityColumn,
    timestampColumn,
    csv,
    error,
  } = state
  const connectedSourceId =
    source.kind === "data_source" ? source.sourceId : undefined

  const headers = csv.parsed?.headers ?? []
  const canSubmit =
    formUrlOrId.trim() &&
    displayName.trim() &&
    csv.csvText &&
    identityColumn &&
    timestampColumn

  const uploadCsv = async (file: File | undefined) => {
    dispatch({ type: "clear_error" })
    if (!file) return

    try {
      const csvText = await file.text()
      const parsed = parseGoogleFormsCsv(csvText)
      dispatch({
        type: "csv_uploaded",
        fileName: file.name,
        csvText,
        parsed,
      })
    } catch {
      dispatch({ type: "csv_failed" })
    }
  }

  const submit = () => {
    if (!canSubmit) return
    dispatch({ type: "clear_error" })
    startTransition(async () => {
      const input = {
        displayName,
        fileName: csv.fileName,
        identityColumn,
        timestampColumn,
        csvText: csv.csvText,
      }
      const result = connectedSourceId
        ? await updateGoogleFormsManualCsvDataSourceAction(
            connectedSourceId,
            input
          )
        : await connectGoogleFormsManualCsvDataSourceAction({
            ...input,
            formUrlOrId,
          })

      if (result.error) {
        dispatch({ type: "set_error", value: formsErrorLabel(result.error) })
        return
      }
      refresh()
    })
  }

  const oauthSource: DataSource = {
    id: source.id,
    kind: "connector_type",
    icon: source.icon,
    title: source.title,
    sub: source.sub,
    category: source.category,
    auth: "oauth",
    isNew: source.isNew,
    connected: false,
    stats: [],
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
            onClick={() =>
              dispatch({ type: "set_connection_mode", value: "manual_csv" })
            }
          >
            CSV upload
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={connectionMode === "oauth_mock"}
            className={modeTabClassName(connectionMode === "oauth_mock")}
            onClick={() =>
              dispatch({ type: "set_connection_mode", value: "oauth_mock" })
            }
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
                disabled={Boolean(connectedSourceId)}
                onChange={(event) =>
                  dispatch({
                    type: "set_form_url_or_id",
                    value: event.target.value,
                  })
                }
                placeholder="https://docs.google.com/forms/d/..."
                className="font-mono text-[12.5px]"
              />
            </FormRow>
            <FormRow
              label="Form name"
              className="sm:grid-cols-[100px_minmax(0,1fr)]"
            >
              <Input
                aria-label="Form name"
                value={displayName}
                onChange={(event) =>
                  dispatch({
                    type: "set_display_name",
                    value: event.target.value,
                  })
                }
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
                  onChange={(event) =>
                    dispatch({
                      type: "set_identity_column",
                      value: event.target.value,
                    })
                  }
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
                  onChange={(event) =>
                    dispatch({
                      type: "set_timestamp_column",
                      value: event.target.value,
                    })
                  }
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

function initialFormsConnectState(source: DataSource): FormsConnectState {
  const connection =
    source.kind === "data_source" ? source.forms?.connections[0] : undefined
  if (!connection) return INITIAL_FORMS_CONNECT_STATE
  return {
    ...INITIAL_FORMS_CONNECT_STATE,
    formUrlOrId: connection.externalFormId,
    displayName: connection.displayName,
    identityColumn: connection.mapping.identityColumn,
    timestampColumn: connection.mapping.timestampColumn,
  }
}

function formsConnectReducer(
  state: FormsConnectState,
  action: FormsConnectAction
): FormsConnectState {
  switch (action.type) {
    case "set_connection_mode":
      return { ...state, connectionMode: action.value }
    case "set_form_url_or_id":
      return { ...state, formUrlOrId: action.value }
    case "set_display_name":
      return { ...state, displayName: action.value }
    case "set_identity_column":
      return { ...state, identityColumn: action.value }
    case "set_timestamp_column":
      return { ...state, timestampColumn: action.value }
    case "csv_uploaded":
      return {
        ...state,
        csv: {
          fileName: action.fileName,
          csvText: action.csvText,
          parsed: action.parsed,
        },
        identityColumn: preferredColumn(action.parsed.headers, /email/i),
        timestampColumn: preferredColumn(
          action.parsed.headers,
          /timestamp|time/i
        ),
      }
    case "csv_failed":
      return {
        ...state,
        csv: EMPTY_CSV_STATE,
        identityColumn: "",
        timestampColumn: "",
        error: "CSV could not be parsed.",
      }
    case "clear_error":
      return { ...state, error: null }
    case "set_error":
      return { ...state, error: action.value }
  }
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
  if (error === "invalid_data_source_name") {
    return "Name this connector before uploading."
  }
  if (error === "duplicate_data_source_name") {
    return "Use a different connector name."
  }
  if (error === "duplicate_data_source_config") {
    return "That Google Form is already connected."
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
