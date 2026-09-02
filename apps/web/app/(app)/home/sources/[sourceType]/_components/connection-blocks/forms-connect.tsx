"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PlugZapIcon, ShieldCheckIcon, UploadIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Form, FormRow } from "@workspace/ui/components/form-row"
import { Input } from "@workspace/ui/components/input"

import {
  connectGoogleFormsApiDataSourceAction,
  connectGoogleFormsManualCsvDataSourceAction,
  describeGoogleFormsApiAction,
  inspectGoogleFormsApiAction,
  updateGoogleFormsManualCsvDataSourceAction,
} from "@/features/data-sources/actions"
import type { GoogleFormsApiInspection } from "@/features/data-sources/application"
import {
  parseGoogleFormsCsv,
  type GoogleFormsParsedCsv,
} from "@/features/data-sources/google-forms"
import type { DataSource, DataSourceGoogleFormsSettings } from "@/lib/sources"

type CsvState = {
  fileName: string
  csvText: string
  parsed: GoogleFormsParsedCsv | null
}

type FormsConnectionTab = "manual_csv" | "api"

type ServiceAccountState = {
  loaded: boolean
  email: string | null
}

type FormsConnectState = {
  connectionMode: FormsConnectionTab
  formUrlOrId: string
  displayName: string
  identityColumn: string
  timestampColumn: string
  csv: CsvState
  serviceAccount: ServiceAccountState
  inspection: GoogleFormsApiInspection | null
  identityQuestionId: string
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
  | { type: "set_service_account"; value: string | null }
  | { type: "form_inspected"; value: GoogleFormsApiInspection }
  | { type: "set_identity_question"; value: string }
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
  serviceAccount: { loaded: false, email: null },
  inspection: null,
  identityQuestionId: "",
  error: null,
}

function FormsConnect({ source }: { source: DataSource }) {
  const { refresh, replace } = useRouter()
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
    serviceAccount,
    inspection,
    identityQuestionId,
    error,
  } = state
  const connection =
    source.kind === "data_source" ? source.forms?.connections[0] : undefined
  const connectedSourceId = connection?.sourceId

  React.useEffect(() => {
    if (connectionMode !== "api" || serviceAccount.loaded || connectedSourceId) {
      return
    }
    let cancelled = false
    void describeGoogleFormsApiAction().then((result) => {
      if (cancelled) return
      dispatch({
        type: "set_service_account",
        value: "data" in result ? (result.data?.serviceAccountEmail ?? null) : null,
      })
    })
    return () => {
      cancelled = true
    }
  }, [connectionMode, serviceAccount.loaded, connectedSourceId])

  if (connection?.connectionMode === "api") {
    return <LiveConnected connection={connection} />
  }

  const headers = csv.parsed?.headers ?? []
  const canSubmit =
    formUrlOrId.trim() &&
    displayName.trim() &&
    csv.csvText &&
    identityColumn &&
    timestampColumn
  const canConnectLive =
    inspection &&
    formUrlOrId.trim() &&
    displayName.trim() &&
    (inspection.collectsEmail || identityQuestionId)

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
      if (connectedSourceId) {
        refresh()
      } else {
        replace(`/home/sources/${result.data.type}/${result.data.sourceSlug}`)
      }
    })
  }

  const checkAccess = () => {
    if (!formUrlOrId.trim()) return
    dispatch({ type: "clear_error" })
    startTransition(async () => {
      const result = await inspectGoogleFormsApiAction(formUrlOrId)
      if (result.error) {
        dispatch({ type: "set_error", value: formsErrorLabel(result.error) })
        return
      }
      dispatch({ type: "form_inspected", value: result.data })
    })
  }

  const connectLive = () => {
    if (!canConnectLive) return
    dispatch({ type: "clear_error" })
    startTransition(async () => {
      const result = await connectGoogleFormsApiDataSourceAction({
        formUrlOrId,
        displayName,
        identityQuestionId: identityQuestionId || null,
      })
      if (result.error) {
        dispatch({ type: "set_error", value: formsErrorLabel(result.error) })
        return
      }
      replace(`/home/sources/${result.data.type}/${result.data.sourceSlug}`)
    })
  }

  return (
    <Form>
      {!connectedSourceId ? (
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
              aria-selected={connectionMode === "api"}
              className={modeTabClassName(connectionMode === "api")}
              onClick={() =>
                dispatch({ type: "set_connection_mode", value: "api" })
              }
            >
              Live sync
            </button>
          </div>
        </FormRow>
      ) : null}
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
      {connectionMode === "api" ? (
        <>
          <FormRow
            label="Share with"
            help="Open the form in Google Forms, choose Share, and add this address as an editor. TinyOps then reads new responses on every sync."
          >
            {!serviceAccount.loaded ? (
              <span className="text-[12.5px] text-muted-foreground">
                Loading service account
              </span>
            ) : serviceAccount.email ? (
              <span className="font-mono text-[12.5px] select-all">
                {serviceAccount.email}
              </span>
            ) : (
              <span className="text-[12.5px] text-coral-700">
                Live sync is not configured on this server. Set
                GOOGLE_SERVICE_ACCOUNT_KEY, or use CSV upload.
              </span>
            )}
          </FormRow>
          {inspection ? (
            <>
              <FormRow label="Form">
                <span className="text-[13px] text-foreground/85">
                  {inspection.formTitle || inspection.formId} ·{" "}
                  {inspection.questions.length}{" "}
                  {inspection.questions.length === 1 ? "question" : "questions"}{" "}
                  ·{" "}
                  {inspection.collectsEmail
                    ? "collects respondent emails"
                    : "does not collect emails"}
                </span>
              </FormRow>
              <FormRow
                label="Client identity"
                help="The answer that identifies the client. A collected respondent email always wins."
              >
                <select
                  aria-label="Client identity"
                  value={identityQuestionId}
                  onChange={(event) =>
                    dispatch({
                      type: "set_identity_question",
                      value: event.target.value,
                    })
                  }
                  className="h-8 rounded-md border border-input bg-background px-2 text-[13px]"
                >
                  {inspection.collectsEmail ? (
                    <option value="">Collected email address</option>
                  ) : null}
                  {inspection.questions.map((question) => (
                    <option key={question.id} value={question.id}>
                      {question.title || `Question ${question.id}`}
                    </option>
                  ))}
                </select>
              </FormRow>
            </>
          ) : null}
          <div className="inline-flex items-center gap-3">
            <Button
              type="button"
              variant={inspection ? "ghost" : "primary"}
              size="sm"
              disabled={pending || !formUrlOrId.trim() || !serviceAccount.email}
              onClick={checkAccess}
            >
              <ShieldCheckIcon />
              {pending && !inspection ? "Checking" : "Check access"}
            </Button>
            {inspection ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={pending || !canConnectLive}
                onClick={connectLive}
              >
                <PlugZapIcon />
                {pending ? "Connecting" : "Connect form"}
              </Button>
            ) : null}
            {error ? (
              <span className="text-[12px] text-coral-700">{error}</span>
            ) : null}
          </div>
        </>
      ) : (
        <>
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

function LiveConnected({
  connection,
}: {
  connection: DataSourceGoogleFormsSettings["connections"][number]
}) {
  return (
    <Form>
      <FormRow label="Google Form ID">
        <Input
          aria-label="Google Form ID"
          value={connection.externalFormId}
          disabled
          className="font-mono text-[12.5px]"
        />
      </FormRow>
      <FormRow label="Client identity">
        <span className="text-[13px] text-foreground/85">
          {connection.identityQuestionId
            ? "Answer to the selected form question"
            : "Collected respondent email"}
        </span>
      </FormRow>
      <FormRow label="Sync">
        <span className="text-[13px] text-foreground/85">
          Live sync as the TinyOps service account. New and edited responses are
          pulled on every sync run.
        </span>
      </FormRow>
    </Form>
  )
}

function initialFormsConnectState(source: DataSource): FormsConnectState {
  const connection =
    source.kind === "data_source" ? source.forms?.connections[0] : undefined
  if (!connection) return INITIAL_FORMS_CONNECT_STATE
  return {
    ...INITIAL_FORMS_CONNECT_STATE,
    connectionMode: connection.connectionMode === "api" ? "api" : "manual_csv",
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
      return { ...state, connectionMode: action.value, error: null }
    case "set_form_url_or_id":
      return { ...state, formUrlOrId: action.value, inspection: null }
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
    case "set_service_account":
      return { ...state, serviceAccount: { loaded: true, email: action.value } }
    case "form_inspected":
      return {
        ...state,
        inspection: action.value,
        displayName: state.displayName.trim() || action.value.formTitle,
        identityQuestionId: action.value.collectsEmail
          ? ""
          : preferredQuestion(action.value.questions),
      }
    case "set_identity_question":
      return { ...state, identityQuestionId: action.value }
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

function preferredQuestion(questions: GoogleFormsApiInspection["questions"]) {
  return (
    questions.find((question) => /e-?mail/i.test(question.title))?.id ??
    questions[0]?.id ??
    ""
  )
}

function formsErrorLabel(error: string) {
  if (error === "source_manage_forbidden") {
    return "Only workspace owners and admins can manage data sources."
  }
  if (error === "invalid_data_source_name") {
    return "Name this connector before connecting."
  }
  if (error === "duplicate_data_source_name") {
    return "Use a different connector name."
  }
  if (error === "duplicate_data_source_config") {
    return "That Google Form is already connected."
  }
  if (error === "google_forms_not_configured") {
    return "Live sync is not configured on this server."
  }
  if (error === "google_forms_access_failed") {
    return "TinyOps cannot open this form yet. Share it with the service account address, then check again."
  }
  if (error === "invalid_google_forms_identity") {
    return "Choose the question that holds the client's email."
  }
  if (
    error === "invalid_google_form_id" ||
    error === "invalid_google_forms_csv" ||
    error === "invalid_google_forms_csv_mapping" ||
    error === "invalid_google_forms_csv_row"
  ) {
    return "Check the form ID, selected columns, and CSV values."
  }
  return "Could not connect Google Forms."
}

export { FormsConnect }
