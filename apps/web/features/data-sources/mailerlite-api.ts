import type { MailerLiteApiPort } from "@/features/data-sources/types"

const MAILERLITE_API_URL = "https://connect.mailerlite.com/api"

export type MailerLiteApiErrorCode =
  | "mailerlite_access_failed"
  | "mailerlite_api_failed"

type FetchLike = (
  url: string,
  init?: RequestInit
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export type MailerLiteListParams = Record<string, string | number | undefined>

export type MailerLitePage = {
  data: unknown[]
  /** Cursor-paginated lists (subscribers). */
  nextCursor: string | null
  /** True for either pagination style when another page exists. */
  hasMore: boolean
}

/**
 * Minimal MailerLite REST client: one authenticated GET that understands both
 * of MailerLite's pagination styles (cursor `meta.next_cursor` and
 * page `meta.current_page` / `meta.last_page`).
 */
export function createMailerLiteApiClient({
  apiKey,
  fetcher = fetch as FetchLike,
}: {
  apiKey: string
  fetcher?: FetchLike
}): MailerLiteApiPort {
  return {
    async list(path, params = {}) {
      const url = new URL(`${MAILERLITE_API_URL}/${path}`)
      for (const [name, value] of Object.entries(params)) {
        if (value !== undefined) url.searchParams.set(name, String(value))
      }
      const response = await fetcher(url.toString(), {
        headers: {
          authorization: `Bearer ${apiKey}`,
          accept: "application/json",
        },
      })
      if (!response.ok) {
        throw mailerLiteApiError(
          response.status === 401 || response.status === 403
            ? "mailerlite_access_failed"
            : "mailerlite_api_failed",
          response.status
        )
      }
      const raw = (await readJson(response)) as RawList | null
      const meta = raw?.meta ?? {}
      const nextCursor =
        typeof meta.next_cursor === "string" && meta.next_cursor
          ? meta.next_cursor
          : null
      const morePages =
        typeof meta.current_page === "number" &&
        typeof meta.last_page === "number" &&
        meta.current_page < meta.last_page
      return {
        data: Array.isArray(raw?.data) ? raw.data : [],
        nextCursor,
        hasMore: nextCursor !== null || morePages || Boolean(raw?.links?.next),
      }
    },
  }
}

type RawList = {
  data?: unknown[]
  links?: { next?: string | null }
  meta?: {
    next_cursor?: string | null
    current_page?: number
    last_page?: number
  }
}

export function mailerLiteApiError(
  code: MailerLiteApiErrorCode,
  status: number
): Error & { status: number } {
  return Object.assign(new Error(code), { status })
}

export function mailerLiteApiErrorStatus(error: unknown): number | null {
  return error instanceof Error &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : null
}

/** MailerLite tokens are long JWT-style strings; anything short or spaced is a paste error. */
export function isMailerLiteApiKey(value: string) {
  const key = value.trim()
  return key.length >= 20 && !/\s/.test(key)
}

async function readJson(response: { json(): Promise<unknown> }) {
  try {
    return await response.json()
  } catch {
    return null
  }
}
