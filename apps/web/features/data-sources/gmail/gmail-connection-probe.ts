import {
  createGoogleGmailApiClient,
  type GmailApiClient,
  type GmailLabel,
} from "@/features/data-sources/gmail/gmail-api-client"

export type GmailConnectionProbeResult = {
  emailAddress: string
  labels: GmailLabel[]
}

export type GmailConnectionProbe = {
  probe(input: { accessToken: string }): Promise<GmailConnectionProbeResult>
}

/**
 * Connect-time probe: confirms the freshly minted access token works and
 * captures the authenticated address + label list (the Gmail analogue of the
 * IMAP connection tester's folder listing).
 */
export function createGmailConnectionProbe({
  apiClientFactory = createGoogleGmailApiClient,
}: {
  apiClientFactory?: (input: { accessToken: string }) => GmailApiClient
} = {}): GmailConnectionProbe {
  return {
    async probe({ accessToken }) {
      const client = apiClientFactory({ accessToken })
      const [profile, labels] = await Promise.all([
        client.getProfile(),
        client.listLabels(),
      ])
      return { emailAddress: profile.emailAddress, labels }
    },
  }
}

/**
 * Maps probe labels to the `available_folders` snapshot stored in
 * `data_source_intake_configs`. `path` carries the label **id** (what the
 * connector passes to messages.list); `name` is kept for display.
 */
export function gmailLabelsToAvailableFolders(labels: GmailLabel[]) {
  return labels.map((label) => ({
    path: label.id,
    name: label.name,
    messages: label.messagesTotal,
    specialUse: label.type,
  }))
}
