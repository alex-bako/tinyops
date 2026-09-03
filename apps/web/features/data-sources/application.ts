import { canManageSources } from "@/features/data-sources/policy"
import type {
  ImapConnectionSettingsCommand,
  ImapConnectCommandDraft,
  ImapIntakeSettingsCommand,
} from "@/features/data-sources/imap"
import {
  createDataSourceUseCases,
  type GoogleFormsApiConnectCommand,
  type GoogleFormsApiInspection,
  type GoogleFormsManualCsvConnectCommand,
  type GoogleFormsManualCsvUpdateCommand,
  type ImapCredentialReader,
  type StripeAccountInspection,
  type StripeConnectCommand,
} from "@/features/data-sources/use-cases"
import { isConnectorId } from "@/features/data-sources/connector-metadata"
import type {
  DataSourceQueryPort,
  DataSourceStore,
  DataSourceWorkspace,
  GoogleFormsApiPort,
  GoogleFormsSourceCommandPort,
  ImapConnectionTester,
  ImapSourceCommandPort,
  SourceLifecycleCommandPort,
  StripeApiPort,
  StripeSourceCommandPort,
} from "@/features/data-sources/types"
import type { Result, SyncFailure } from "@/features/data-sources/domain/sync"

export type {
  Result,
  SyncFailure,
  SyncFailureCode,
} from "@/features/data-sources/domain/sync"
export {
  isSyncFailureCode,
  safeSyncFailureCauseMessage,
  serializeSyncFailure,
  syncFailureMessage,
} from "@/features/data-sources/domain/sync"

export type DataSourceActionError =
  | "not_authenticated"
  | "invalid_imap_config"
  | "invalid_google_form_id"
  | "invalid_google_forms_csv"
  | "invalid_google_forms_csv_mapping"
  | "invalid_google_forms_csv_row"
  | "invalid_google_forms_identity"
  | "google_forms_not_configured"
  | "google_forms_access_failed"
  | "invalid_stripe_config"
  | "stripe_access_failed"
  | "stripe_api_failed"
  | "invalid_data_source_name"
  | "duplicate_data_source_name"
  | "duplicate_data_source_config"
  | "imap_connection_failed"
  | "source_manage_forbidden"
  | "source_not_found"
  | "source_action_failed"

export type DataSourceActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: DataSourceActionError }

export type RequestAllDataSourceSyncsResult = {
  queued: number
}

export type ImapConnectCommand = ImapConnectCommandDraft
export type ImapImportSettingsCommand = ImapIntakeSettingsCommand
export type {
  GoogleFormsApiConnectCommand,
  GoogleFormsApiInspection,
  GoogleFormsManualCsvConnectCommand,
  GoogleFormsManualCsvUpdateCommand,
  StripeAccountInspection,
  StripeConnectCommand,
}

export type { ImapConnectionSettingsCommand, ImapIntakeSettingsCommand }

export type { ImapCredentialReader }

export type ImapSyncCredentialReader = {
  readImapPasswordForSync(input: {
    workspaceId: string
    sourceId: string
  }): Promise<Result<string, SyncFailure>>
}

export type ImapSecretReader = ImapCredentialReader & ImapSyncCredentialReader

export function createDataSourceQueryApplication({
  workspace,
  reader,
}: {
  workspace: DataSourceWorkspace
  reader: DataSourceQueryPort
}) {
  return {
    async listDataSources() {
      return reader.listForWorkspace(workspace.id)
    },

    async findDataSourceBySlug(sourceType: string, sourceSlug: string) {
      if (!isReadableSourceType(sourceType)) return null
      return reader.findBySlugForWorkspace({
        workspaceId: workspace.id,
        sourceType,
        sourceSlug,
      })
    },
  }
}

export function createDataSourceCommandApplication({
  workspace,
  store,
  queryPort = store,
  imapCommands = store,
  formsCommands = store,
  stripeCommands = store,
  lifecycleCommands = store,
  imapConnectionTester,
  imapCredentialReader,
  googleFormsApi = null,
  stripeApiFactory,
}: {
  workspace: DataSourceWorkspace
  store?: DataSourceStore
  queryPort?: DataSourceQueryPort
  imapCommands?: ImapSourceCommandPort
  formsCommands?: GoogleFormsSourceCommandPort
  stripeCommands?: StripeSourceCommandPort
  lifecycleCommands?: SourceLifecycleCommandPort
  imapConnectionTester: ImapConnectionTester
  imapCredentialReader: ImapCredentialReader
  googleFormsApi?: GoogleFormsApiPort | null
  stripeApiFactory?: (apiKey: string) => StripeApiPort
}) {
  if (
    !queryPort ||
    !imapCommands ||
    !formsCommands ||
    !stripeCommands ||
    !lifecycleCommands
  ) {
    throw new Error("data_source_ports_required")
  }
  const useCases = createDataSourceUseCases({
    workspace,
    queryPort,
    imapCommands,
    formsCommands,
    stripeCommands,
    lifecycleCommands,
    imapConnectionTester,
    imapCredentialReader,
    googleFormsApi,
    ...(stripeApiFactory ? { stripeApiFactory } : {}),
  })

  async function runManaged<T>(
    operation: () => Promise<T>
  ): Promise<DataSourceActionResult<T>> {
    if (!canManageSources(workspace.role)) {
      return { error: "source_manage_forbidden" }
    }

    try {
      return { data: await operation() }
    } catch (error) {
      return { error: mapDataSourceActionError(error) }
    }
  }

  return {
    ...createDataSourceQueryApplication({ workspace, reader: queryPort }),

    async connectImap(input: ImapConnectCommand) {
      return runManaged(() => useCases.connectImap(input))
    },

    async connectGoogleFormsManualCsv(
      input: GoogleFormsManualCsvConnectCommand
    ) {
      return runManaged(() => useCases.connectGoogleFormsManualCsv(input))
    },

    async updateGoogleFormsManualCsv(
      sourceId: string,
      input: GoogleFormsManualCsvUpdateCommand
    ) {
      return runManaged(() =>
        useCases.updateGoogleFormsManualCsv(sourceId, input)
      )
    },

    async describeGoogleFormsApi() {
      return runManaged(async () => useCases.describeGoogleFormsApi())
    },

    async inspectGoogleFormsApi(formUrlOrId: string) {
      return runManaged(() => useCases.inspectGoogleFormsApi(formUrlOrId))
    },

    async connectGoogleFormsApi(input: GoogleFormsApiConnectCommand) {
      return runManaged(() => useCases.connectGoogleFormsApi(input))
    },

    async inspectStripeAccount(apiKey: string) {
      return runManaged(() => useCases.inspectStripeAccount(apiKey))
    },

    async connectStripe(input: StripeConnectCommand) {
      return runManaged(() => useCases.connectStripe(input))
    },

    async updateImapConnectionSettings(
      sourceId: string,
      input: ImapConnectionSettingsCommand
    ) {
      return runManaged(() =>
        useCases.updateImapConnectionSettings(sourceId, input)
      )
    },

    async updateImapIntakeSettings(
      sourceId: string,
      input: ImapImportSettingsCommand
    ) {
      return runManaged(() =>
        useCases.updateImapIntakeSettings(sourceId, input)
      )
    },

    async refreshImapFolders(sourceId: string) {
      return runManaged(() => useCases.refreshImapFolders(sourceId))
    },

    async disconnect(sourceId: string) {
      return runManaged(async () => {
        await useCases.disconnect(sourceId)
        return undefined
      })
    },

    async requestSync(sourceId: string) {
      return runManaged(async () => {
        await useCases.requestSync(sourceId)
        return undefined
      })
    },

    async requestAllConfiguredSyncs() {
      return runManaged<RequestAllDataSourceSyncsResult>(async () => {
        return useCases.requestAllConfiguredSyncs()
      })
    },
  }
}

function isReadableSourceType(
  value: string
): value is Parameters<
  DataSourceQueryPort["findBySlugForWorkspace"]
>[0]["sourceType"] {
  return isConnectorId(value)
}

function mapDataSourceActionError(error: unknown): DataSourceActionError {
  if (!(error instanceof Error)) return "source_action_failed"
  if (isDataSourceActionError(error.message)) return error.message
  return "source_action_failed"
}

function isDataSourceActionError(
  value: string
): value is DataSourceActionError {
  return (
    value === "invalid_imap_config" ||
    value === "invalid_google_form_id" ||
    value === "invalid_google_forms_csv" ||
    value === "invalid_google_forms_csv_mapping" ||
    value === "invalid_google_forms_csv_row" ||
    value === "invalid_google_forms_identity" ||
    value === "google_forms_not_configured" ||
    value === "google_forms_access_failed" ||
    value === "invalid_stripe_config" ||
    value === "stripe_access_failed" ||
    value === "stripe_api_failed" ||
    value === "invalid_data_source_name" ||
    value === "duplicate_data_source_name" ||
    value === "duplicate_data_source_config" ||
    value === "imap_connection_failed" ||
    value === "source_manage_forbidden" ||
    value === "not_authenticated" ||
    value === "source_not_found" ||
    value === "source_action_failed"
  )
}
