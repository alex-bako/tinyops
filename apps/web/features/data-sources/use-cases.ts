import {
  buildDefaultImapIntakeSettings,
  buildImapConnectionConfig,
  buildImapFolderSnapshot,
  buildImapIntakeSettings,
  normalizeDataSourceDisplayName,
  type ImapConnectionSettingsCommand,
  type ImapConnectCommandDraft,
  type ImapIntakeSettingsCommand,
} from "@/features/data-sources/imap"
import {
  buildGoogleFormsApiSourceConfig,
  buildGoogleFormsManualCsvSourceConfig,
  buildGoogleFormsManualCsvUploadRows,
  extractGoogleFormId,
  parseGoogleFormsCsv,
  type GoogleFormsApiQuestion,
} from "@/features/data-sources/google-forms"
import {
  buildMailerLiteSourceConfig,
  type MailerLiteShop,
} from "@/features/data-sources/mailerlite"
import {
  createMailerLiteApiClient,
  isMailerLiteApiKey,
  mailerLiteApiErrorStatus,
} from "@/features/data-sources/mailerlite-api"
import { buildStripeSourceConfig } from "@/features/data-sources/stripe"
import {
  createStripeApiClient,
  isStripeSecretKey,
} from "@/features/data-sources/stripe-api"
import type {
  DataSourceQueryPort,
  DataSourceWorkspace,
  GoogleFormsApiPort,
  GoogleFormsDataSource,
  GoogleFormsSourceCommandPort,
  ImapConnectionTester,
  ImapDataSource,
  ImapSourceCommandPort,
  SourceLifecycleCommandPort,
  StripeApiPort,
  StripeDataSource,
  StripeSourceCommandPort,
  MailerLiteApiPort,
  MailerLiteDataSource,
  MailerLiteSourceCommandPort,
} from "@/features/data-sources/types"

export type MailerLiteConnectCommand = {
  apiKey: string
  displayName: string
  /** ISO date; orders and campaigns before it are never imported. */
  syncFrom: string
}

export type MailerLiteInspection = {
  shops: MailerLiteShop[]
}

export type StripeConnectCommand = {
  apiKey: string
  displayName: string
  /** ISO date; objects created before it are never imported. */
  syncFrom: string
}

export type StripeAccountInspection = {
  accountId: string
  name: string
  livemode: boolean
}

export type GoogleFormsManualCsvConnectCommand = {
  formUrlOrId: string
  displayName: string
  fileName: string
  identityColumn: string
  timestampColumn: string
  csvText: string
}

export type GoogleFormsManualCsvUpdateCommand = Omit<
  GoogleFormsManualCsvConnectCommand,
  "formUrlOrId"
>

export type GoogleFormsApiConnectCommand = {
  formUrlOrId: string
  displayName: string
  identityQuestionId: string | null
}

export type GoogleFormsApiInspection = {
  serviceAccountEmail: string
  formId: string
  formTitle: string
  collectsEmail: boolean
  questions: GoogleFormsApiQuestion[]
}

export type ImapCredentialReader = {
  readImapPassword(input: {
    workspaceId: string
    sourceId: string
  }): Promise<string>
}

export function createDataSourceUseCases({
  workspace,
  queryPort,
  imapCommands,
  formsCommands,
  stripeCommands,
  mailerliteCommands,
  lifecycleCommands,
  imapConnectionTester,
  imapCredentialReader,
  googleFormsApi = null,
  stripeApiFactory = (apiKey) => createStripeApiClient({ apiKey }),
  mailerliteApiFactory = (apiKey) => createMailerLiteApiClient({ apiKey }),
}: {
  workspace: DataSourceWorkspace
  queryPort: DataSourceQueryPort
  imapCommands: ImapSourceCommandPort
  formsCommands: GoogleFormsSourceCommandPort
  stripeCommands: StripeSourceCommandPort
  mailerliteCommands: MailerLiteSourceCommandPort
  lifecycleCommands: SourceLifecycleCommandPort
  imapConnectionTester: ImapConnectionTester
  imapCredentialReader: ImapCredentialReader
  googleFormsApi?: GoogleFormsApiPort | null
  stripeApiFactory?: (apiKey: string) => StripeApiPort
  mailerliteApiFactory?: (apiKey: string) => MailerLiteApiPort
}) {
  async function inspectStripe(apiKey: string): Promise<StripeAccountInspection> {
    if (!isStripeSecretKey(apiKey)) throw new Error("invalid_stripe_config")
    const account = await stripeApiFactory(apiKey.trim()).getAccount()
    return { accountId: account.id, name: account.name, livemode: account.livemode }
  }

  async function inspectMailerLite(apiKey: string): Promise<MailerLiteInspection> {
    if (!isMailerLiteApiKey(apiKey)) throw new Error("invalid_mailerlite_config")
    const api = mailerliteApiFactory(apiKey.trim())
    // Proves the key first; the e-commerce endpoint 404s on plans without it.
    await api.list("subscribers", { limit: 1 })
    let shops: unknown[] = []
    try {
      shops = (await api.list("ecommerce/shops", { limit: 100 })).data
    } catch (error) {
      if (mailerLiteApiErrorStatus(error) !== 404) throw error
    }
    return {
      shops: shops.flatMap((shop) => {
        const raw = shop as { id?: unknown; name?: unknown; currency?: unknown }
        if (!raw?.id) return []
        return [
          {
            id: String(raw.id),
            name: typeof raw.name === "string" ? raw.name : String(raw.id),
            currency: typeof raw.currency === "string" ? raw.currency : "",
          },
        ]
      }),
    }
  }

  async function loadImapSource(sourceId: string) {
    const source = await queryPort.findByIdForWorkspace({
      workspaceId: workspace.id,
      sourceId,
    })
    if (!source || source.type !== "imap") {
      throw new Error("source_not_found")
    }
    return source
  }

  async function loadGoogleFormsSource(sourceId: string) {
    const source = await queryPort.findByIdForWorkspace({
      workspaceId: workspace.id,
      sourceId,
    })
    if (!source || source.type !== "forms") {
      throw new Error("source_not_found")
    }
    return source
  }

  function requireGoogleFormsApi(): GoogleFormsApiPort {
    if (!googleFormsApi) throw new Error("google_forms_not_configured")
    return googleFormsApi
  }

  /**
   * Verifies the service account can open the form. The settings flag can be
   * absent on older forms, so one sampled response also counts as email
   * collection evidence.
   */
  async function inspectForm(api: GoogleFormsApiPort, formUrlOrId: string) {
    const formId = extractGoogleFormId(formUrlOrId)
    const [form, sample] = await Promise.all([
      api.getForm(formId),
      api.listResponses({ formId, pageSize: 1 }),
    ])
    return {
      formId,
      form: {
        ...form,
        collectsEmail:
          form.collectsEmail ||
          sample.responses.some((response) => Boolean(response.respondentEmail)),
      },
    }
  }

  async function readStoredPassword(sourceId: string) {
    const password = await imapCredentialReader.readImapPassword({
      workspaceId: workspace.id,
      sourceId,
    })
    if (!password.trim()) throw new Error("invalid_imap_config")
    return password
  }

  return {
    async connectImap(input: ImapConnectCommandDraft): Promise<ImapDataSource> {
      const connection = buildImapConnectionConfig(input)
      const password = input.password.trim()
      if (!password) throw new Error("invalid_imap_config")

      const { folders } = await imapConnectionTester.test({
        ...connection,
        password,
      })
      const folderSnapshot = buildImapFolderSnapshot(folders)
      const intake = buildDefaultImapIntakeSettings({
        historyWindow: input.historyWindow,
        folderSnapshot,
      })

      return imapCommands.connectImap({
        workspaceId: workspace.id,
        displayName: normalizeDataSourceDisplayName(input.displayName),
        connection,
        intake,
        folderSnapshot,
        password,
      })
    },

    async updateImapConnectionSettings(
      sourceId: string,
      input: ImapConnectionSettingsCommand
    ): Promise<ImapDataSource> {
      const source = await loadImapSource(sourceId)
      const connection = buildImapConnectionConfig(input)
      const submittedPassword = input.password?.trim()
      const password = submittedPassword || (await readStoredPassword(sourceId))
      const { folders } = await imapConnectionTester.test({
        ...connection,
        password,
      })

      return imapCommands.updateImapConnection({
        workspaceId: workspace.id,
        sourceId,
        displayName: normalizeDataSourceDisplayName(
          input.displayName ?? source.displayName
        ),
        connection,
        password: submittedPassword || undefined,
        folderSnapshot: buildImapFolderSnapshot(folders),
      })
    },

    async updateImapIntakeSettings(
      sourceId: string,
      input: ImapIntakeSettingsCommand
    ): Promise<ImapDataSource> {
      await loadImapSource(sourceId)
      return imapCommands.updateImapIntake({
        workspaceId: workspace.id,
        sourceId,
        intake: buildImapIntakeSettings(input),
      })
    },

    async refreshImapFolders(sourceId: string): Promise<ImapDataSource> {
      const [source, password] = await Promise.all([
        loadImapSource(sourceId),
        readStoredPassword(sourceId),
      ])
      const { folders } = await imapConnectionTester.test({
        ...source.connection,
        password,
      })

      return imapCommands.updateImapFolderSnapshot({
        workspaceId: workspace.id,
        sourceId,
        folderSnapshot: buildImapFolderSnapshot(folders),
      })
    },

    async connectGoogleFormsManualCsv(
      input: GoogleFormsManualCsvConnectCommand
    ): Promise<GoogleFormsDataSource> {
      const parsed = parseGoogleFormsCsv(input.csvText)
      const source = buildGoogleFormsManualCsvSourceConfig({
        formUrlOrId: input.formUrlOrId,
        displayName: input.displayName,
        headers: parsed.headers,
        identityColumn: input.identityColumn,
        timestampColumn: input.timestampColumn,
      })
      const rows = buildGoogleFormsManualCsvUploadRows({
        source,
        rows: parsed.rows,
      })

      return formsCommands.connectGoogleFormsManualCsv({
        workspaceId: workspace.id,
        source,
        upload: {
          fileName: input.fileName.trim() || "google-forms-responses.csv",
          rows,
        },
      })
    },

    async updateGoogleFormsManualCsv(
      sourceId: string,
      input: GoogleFormsManualCsvUpdateCommand
    ): Promise<GoogleFormsDataSource> {
      const existingSource = await loadGoogleFormsSource(sourceId)
      const parsed = parseGoogleFormsCsv(input.csvText)
      const source = buildGoogleFormsManualCsvSourceConfig({
        formUrlOrId: existingSource.externalFormId,
        displayName: input.displayName,
        headers: parsed.headers,
        identityColumn: input.identityColumn,
        timestampColumn: input.timestampColumn,
      })
      const rows = buildGoogleFormsManualCsvUploadRows({
        source,
        rows: parsed.rows,
      })

      return formsCommands.updateGoogleFormsManualCsv({
        workspaceId: workspace.id,
        sourceId,
        source,
        upload: {
          fileName: input.fileName.trim() || "google-forms-responses.csv",
          rows,
        },
      })
    },

    describeGoogleFormsApi() {
      return { serviceAccountEmail: googleFormsApi?.serviceAccountEmail ?? null }
    },

    async inspectGoogleFormsApi(
      formUrlOrId: string
    ): Promise<GoogleFormsApiInspection> {
      const api = requireGoogleFormsApi()
      const { formId, form } = await inspectForm(api, formUrlOrId)
      return {
        serviceAccountEmail: api.serviceAccountEmail,
        formId,
        formTitle: form.title,
        collectsEmail: form.collectsEmail,
        questions: form.questions,
      }
    },

    async connectGoogleFormsApi(
      input: GoogleFormsApiConnectCommand
    ): Promise<GoogleFormsDataSource> {
      const api = requireGoogleFormsApi()
      const { formId, form } = await inspectForm(api, input.formUrlOrId)
      const source = buildGoogleFormsApiSourceConfig({
        formId,
        displayName: input.displayName.trim() || form.title,
        identityQuestionId: input.identityQuestionId,
        form,
      })
      return formsCommands.connectGoogleFormsApi({
        workspaceId: workspace.id,
        source,
      })
    },

    inspectStripeAccount(apiKey: string) {
      return inspectStripe(apiKey)
    },

    async connectStripe(input: StripeConnectCommand): Promise<StripeDataSource> {
      const account = await inspectStripe(input.apiKey)
      return stripeCommands.connectStripe({
        workspaceId: workspace.id,
        apiKey: input.apiKey.trim(),
        source: buildStripeSourceConfig({
          displayName: input.displayName.trim() || account.name,
          accountId: account.accountId,
          syncFrom: input.syncFrom,
        }),
      })
    },

    inspectMailerLiteAccount(apiKey: string) {
      return inspectMailerLite(apiKey)
    },

    async connectMailerLite(
      input: MailerLiteConnectCommand
    ): Promise<MailerLiteDataSource> {
      const { shops } = await inspectMailerLite(input.apiKey)
      return mailerliteCommands.connectMailerLite({
        workspaceId: workspace.id,
        apiKey: input.apiKey.trim(),
        source: buildMailerLiteSourceConfig({
          displayName: input.displayName.trim() || "MailerLite",
          shops,
          syncFrom: input.syncFrom,
        }),
      })
    },

    async disconnect(sourceId: string) {
      await lifecycleCommands.disconnect({ workspaceId: workspace.id, sourceId })
    },

    async requestSync(sourceId: string) {
      await lifecycleCommands.requestSync({ workspaceId: workspace.id, sourceId })
    },

    async requestAllConfiguredSyncs() {
      return lifecycleCommands.requestAllSyncs({ workspaceId: workspace.id })
    },
  }
}
