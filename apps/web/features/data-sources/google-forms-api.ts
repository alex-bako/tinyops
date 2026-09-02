import { createSign } from "node:crypto"

import type {
  GoogleFormsApiForm,
  GoogleFormsApiResponse,
} from "@/features/data-sources/google-forms"
import type { GoogleFormsApiPort } from "@/features/data-sources/types"
import { getLogger } from "@/lib/logging"
import { getOptionalGoogleServiceAccountKey } from "@/lib/supabase/server-env"

const TOKEN_URL = "https://oauth2.googleapis.com/token"
const FORMS_API_URL = "https://forms.googleapis.com/v1/forms"
const SCOPES = [
  "https://www.googleapis.com/auth/forms.body.readonly",
  "https://www.googleapis.com/auth/forms.responses.readonly",
]

export type GoogleServiceAccount = {
  clientEmail: string
  privateKey: string
}

export type GoogleFormsApiErrorCode =
  | "google_forms_not_configured"
  | "google_forms_access_failed"
  | "google_forms_api_failed"

type FetchLike = (
  url: string,
  init?: RequestInit
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

type RawForm = {
  formId?: string
  info?: { title?: string; documentTitle?: string }
  settings?: { emailCollectionType?: string }
  items?: RawItem[]
}

type RawItem = {
  title?: string
  questionItem?: { question?: { questionId?: string } }
  questionGroupItem?: {
    questions?: Array<{ questionId?: string; rowQuestion?: { title?: string } }>
  }
}

type RawResponse = {
  responseId?: string
  createTime?: string
  lastSubmittedTime?: string
  respondentEmail?: string
  answers?: Record<string, RawAnswer>
}

type RawAnswer = {
  textAnswers?: { answers?: Array<{ value?: string }> }
  fileUploadAnswers?: { answers?: Array<{ fileId?: string; fileName?: string }> }
}

type RawResponseList = {
  responses?: RawResponse[]
  nextPageToken?: string
}

/** Accepts the raw service-account JSON key file, or the same content base64 encoded. */
export function parseGoogleServiceAccountKey(raw: string): GoogleServiceAccount {
  const text = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw.trim(), "base64").toString("utf8")
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("google_forms_not_configured")
  }
  const key = parsed as { client_email?: unknown; private_key?: unknown } | null
  if (
    typeof key?.client_email !== "string" ||
    typeof key?.private_key !== "string" ||
    !key.client_email.trim() ||
    !key.private_key.trim()
  ) {
    throw new Error("google_forms_not_configured")
  }
  return { clientEmail: key.client_email.trim(), privateKey: key.private_key }
}

export function createGoogleFormsApiClientFromEnv(): GoogleFormsApiPort | null {
  const raw = getOptionalGoogleServiceAccountKey()
  if (!raw) return null
  try {
    return createGoogleFormsApiClient({
      serviceAccount: parseGoogleServiceAccountKey(raw),
    })
  } catch {
    getLogger().warn(
      { event: "google_forms_service_account_invalid" },
      "GOOGLE_SERVICE_ACCOUNT_KEY is not a valid service account key"
    )
    return null
  }
}

export function createGoogleFormsApiClient({
  serviceAccount,
  fetcher = fetch as FetchLike,
  now = () => Date.now(),
}: {
  serviceAccount: GoogleServiceAccount
  fetcher?: FetchLike
  now?: () => number
}): GoogleFormsApiPort {
  let cachedToken: { value: string; expiresAt: number } | null = null

  async function accessToken() {
    if (cachedToken && cachedToken.expiresAt - 60_000 > now()) {
      return cachedToken.value
    }
    const issuedAt = Math.floor(now() / 1000)
    const assertion = signJwt(
      {
        iss: serviceAccount.clientEmail,
        scope: SCOPES.join(" "),
        aud: TOKEN_URL,
        iat: issuedAt,
        exp: issuedAt + 3600,
      },
      serviceAccount.privateKey
    )
    const response = await fetcher(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }).toString(),
    })
    const token = (await readJson(response)) as {
      access_token?: unknown
      expires_in?: unknown
    } | null
    if (!response.ok || typeof token?.access_token !== "string") {
      throw googleFormsApiError("google_forms_not_configured", response.status)
    }
    const expiresIn =
      typeof token.expires_in === "number" ? token.expires_in : 3600
    cachedToken = {
      value: token.access_token,
      expiresAt: now() + expiresIn * 1000,
    }
    return cachedToken.value
  }

  async function get(
    path: string,
    params: Record<string, string | undefined>
  ): Promise<unknown> {
    const url = new URL(`${FORMS_API_URL}/${path}`)
    for (const [name, value] of Object.entries(params)) {
      if (value) url.searchParams.set(name, value)
    }
    const response = await fetcher(url.toString(), {
      headers: { authorization: `Bearer ${await accessToken()}` },
    })
    if (!response.ok) {
      throw googleFormsApiError(
        response.status === 401 ||
          response.status === 403 ||
          response.status === 404
          ? "google_forms_access_failed"
          : "google_forms_api_failed",
        response.status
      )
    }
    return readJson(response)
  }

  return {
    serviceAccountEmail: serviceAccount.clientEmail,

    async getForm(formId) {
      return mapGoogleForm(await get(encodeURIComponent(formId), {}))
    },

    async listResponses({ formId, filter, pageSize, pageToken }) {
      const raw = (await get(`${encodeURIComponent(formId)}/responses`, {
        filter,
        pageSize: pageSize ? String(pageSize) : undefined,
        pageToken,
      })) as RawResponseList | null
      return {
        responses: (raw?.responses ?? []).flatMap(mapGoogleFormResponse),
        nextPageToken: raw?.nextPageToken?.trim() || null,
      }
    },
  }
}

export function googleFormsApiError(
  code: GoogleFormsApiErrorCode,
  status: number
): Error & { status: number } {
  return Object.assign(new Error(code), { status })
}

export function googleFormsApiErrorStatus(error: unknown): number | null {
  return error instanceof Error &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : null
}

export function mapGoogleForm(raw: unknown): GoogleFormsApiForm {
  const form = (raw ?? {}) as RawForm
  const emailCollectionType = form.settings?.emailCollectionType
  return {
    formId: form.formId ?? "",
    title: form.info?.title?.trim() || form.info?.documentTitle?.trim() || "",
    collectsEmail:
      emailCollectionType === "VERIFIED" ||
      emailCollectionType === "RESPONDER_INPUT",
    questions: (form.items ?? []).flatMap((item) => {
      const title = item.title?.trim() ?? ""
      const questionId = item.questionItem?.question?.questionId
      if (questionId) return [{ id: questionId, title }]
      return (item.questionGroupItem?.questions ?? []).flatMap((question) =>
        question.questionId
          ? [
              {
                id: question.questionId,
                title: [title, question.rowQuestion?.title?.trim()]
                  .filter(Boolean)
                  .join(" / "),
              },
            ]
          : []
      )
    }),
  }
}

export function mapGoogleFormResponse(raw: unknown): GoogleFormsApiResponse[] {
  const response = (raw ?? {}) as RawResponse
  if (!response.responseId?.trim()) return []
  return [
    {
      responseId: response.responseId,
      createTime: response.createTime ?? "",
      lastSubmittedTime: response.lastSubmittedTime ?? response.createTime ?? "",
      respondentEmail: response.respondentEmail?.trim() || null,
      answers: Object.fromEntries(
        Object.entries(response.answers ?? {}).map(([questionId, answer]) => [
          questionId,
          answerText(answer),
        ])
      ),
    },
  ]
}

function answerText(answer: RawAnswer | undefined): string {
  const values = (answer?.textAnswers?.answers ?? []).flatMap((item) => {
    const value = item.value?.trim()
    return value ? [value] : []
  })
  const files = (answer?.fileUploadAnswers?.answers ?? []).flatMap((file) =>
    file.fileId
      ? [
          `${file.fileName?.trim() || file.fileId} (https://drive.google.com/file/d/${encodeURIComponent(file.fileId)}/view)`,
        ]
      : []
  )
  return [...values, ...files].join(", ")
}

function signJwt(claims: Record<string, unknown>, privateKey: string) {
  const encoded = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(JSON.stringify(claims))}`
  const signature = createSign("RSA-SHA256")
    .update(encoded)
    .sign(privateKey, "base64url")
  return `${encoded}.${signature}`
}

function base64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url")
}

async function readJson(response: { json(): Promise<unknown> }) {
  try {
    return await response.json()
  } catch {
    return null
  }
}
