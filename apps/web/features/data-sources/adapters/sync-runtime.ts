import {
  createSupabaseClientIngestionWriter,
  type SupabaseClientIngestionWriterClient,
} from "@/features/clients/supabase-ingestion-writer"
import { createImapSourceSyncAdapter } from "@/features/data-sources/adapters/imap-source-sync-adapter"
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
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

export function createDataSourceSyncRuntime() {
  const client = createSupabaseAdminClient()
  const rpcClient = client as unknown as SupabaseSyncJobStoreClient &
    SupabaseClientIngestionWriterClient &
    SupabaseImapSecretReaderClient
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
    sourceSyncAdapters: [
      createImapSourceSyncAdapter({
        dataSourceReader,
        imapCredentialReader,
      }),
    ],
  })
}
