import {
  createSupabaseClientIngestionWriter,
  type SupabaseClientIngestionWriterClient,
} from "@/features/clients/adapters/supabase-ingestion-writer"
import { createGoogleFormsSourceSyncAdapter } from "@/features/data-sources/adapters/google-forms-source-sync-adapter"
import { createGoogleFormsApiClientFromEnv } from "@/features/data-sources/google-forms-api"
import { createImapSourceSyncAdapter } from "@/features/data-sources/adapters/imap-source-sync-adapter"
import {
  createSupabaseGoogleFormsManualCsvRowReader,
  type SupabaseGoogleFormsManualCsvRowReaderClient,
} from "@/features/data-sources/google-forms-row-reader"
import {
  createSupabaseImapThreadIndexReader,
  type SupabaseImapThreadIndexReaderClient,
} from "@/features/data-sources/imap-thread-index-reader"
import {
  createSupabaseImapSecretReader,
  type SupabaseImapSecretReaderClient,
} from "@/features/data-sources/imap-secret-reader"
import { createSupabaseDataSourceStore } from "@/features/data-sources/supabase-store"
import {
  createSupabaseDataSourceSyncJobStore,
  type SupabaseSyncJobStoreClient,
} from "@/features/data-sources/sync-job-store"
import {
  createSupabaseDataSourceSyncRunRecorder,
  type SupabaseSyncRunRecorderClient,
} from "@/features/data-sources/sync-run-recorder"
import { createDataSourceSyncWorker } from "@/features/data-sources/sync-worker"
import { createSourceSyncRegistry } from "@/features/data-sources/sync-registry"
import { getLogger } from "@/lib/logging"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export function createDataSourceSyncRuntime() {
  const client = createSupabaseAdminClient()
  const logger = getLogger().child({ component: "data_source_sync_runtime" })
  const rpcClient = client as unknown as SupabaseSyncJobStoreClient &
    SupabaseClientIngestionWriterClient &
    SupabaseImapSecretReaderClient
  const googleFormsRowReaderClient =
    client as unknown as SupabaseGoogleFormsManualCsvRowReaderClient
  const threadIndexClient = client as unknown as SupabaseImapThreadIndexReaderClient
  const syncRunClient = client as unknown as SupabaseSyncRunRecorderClient
  const dataSourceReader = createSupabaseDataSourceStore({ client })
  const imapCredentialReader = createSupabaseImapSecretReader({
    client: rpcClient,
  })

  return createDataSourceSyncWorker({
    jobStore: createSupabaseDataSourceSyncJobStore({ client: rpcClient }),
    ingestionWriter: createSupabaseClientIngestionWriter({ client: rpcClient }),
    runRecorder: createSupabaseDataSourceSyncRunRecorder({
      client: syncRunClient,
    }),
    sourceSyncRegistry: createSourceSyncRegistry([
      createImapSourceSyncAdapter({
        dataSourceReader,
        imapCredentialReader,
        imapThreadIndexReader: createSupabaseImapThreadIndexReader({
          client: threadIndexClient,
        }),
        logger,
      }),
      createGoogleFormsSourceSyncAdapter({
        dataSourceReader,
        rowReader: createSupabaseGoogleFormsManualCsvRowReader({
          client: googleFormsRowReaderClient,
        }),
        api: createGoogleFormsApiClientFromEnv(),
      }),
    ]),
    logger,
  })
}
