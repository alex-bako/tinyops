import type {
  StripeAccount,
  StripeCustomer,
  StripeListResource,
} from "@/features/data-sources/stripe"
import type { StripeApiPort } from "@/features/data-sources/types"

const STRIPE_API_URL = "https://api.stripe.com/v1"

export type StripeApiErrorCode = "stripe_access_failed" | "stripe_api_failed"

type FetchLike = (
  url: string,
  init?: RequestInit
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export type StripeListParams = Record<
  string,
  string | number | string[] | undefined
>

/**
 * Minimal Stripe REST client. Only list/retrieve calls with a secret key;
 * pagination is `starting_after` and nested objects come back through
 * `expand[]`, so the sync never needs the official SDK.
 */
export function createStripeApiClient({
  apiKey,
  fetcher = fetch as FetchLike,
}: {
  apiKey: string
  fetcher?: FetchLike
}): StripeApiPort {
  async function get(path: string, params: StripeListParams = {}) {
    const url = new URL(`${STRIPE_API_URL}/${path}`)
    for (const [name, value] of Object.entries(params)) {
      if (value === undefined) continue
      if (Array.isArray(value)) {
        for (const item of value) url.searchParams.append(`${name}[]`, item)
      } else {
        url.searchParams.set(name, String(value))
      }
    }
    const response = await fetcher(url.toString(), {
      headers: { authorization: `Bearer ${apiKey}` },
    })
    if (!response.ok) {
      throw stripeApiError(
        response.status === 401 || response.status === 403
          ? "stripe_access_failed"
          : "stripe_api_failed",
        response.status
      )
    }
    return readJson(response)
  }

  return {
    async getAccount() {
      const raw = (await get("account")) as RawAccount | null
      if (!raw?.id) throw stripeApiError("stripe_api_failed", 200)
      return {
        id: raw.id,
        name:
          raw.settings?.dashboard?.display_name?.trim() ||
          raw.business_profile?.name?.trim() ||
          raw.id,
        livemode: raw.livemode === true,
      }
    },

    async list(resource: StripeListResource, params: StripeListParams) {
      const raw = (await get(resource, params)) as RawList | null
      return {
        data: Array.isArray(raw?.data) ? raw.data : [],
        hasMore: raw?.has_more === true,
      }
    },

    async getCustomer(customerId: string) {
      try {
        const raw = (await get(
          `customers/${encodeURIComponent(customerId)}`
        )) as StripeCustomer | null
        return raw?.id && !raw.deleted ? raw : null
      } catch (error) {
        if (stripeApiErrorStatus(error) === 404) return null
        throw error
      }
    },
  }
}

type RawAccount = {
  id?: string
  livemode?: boolean
  settings?: { dashboard?: { display_name?: string } }
  business_profile?: { name?: string }
}

type RawList = { data?: unknown[]; has_more?: boolean }

export function stripeApiError(
  code: StripeApiErrorCode,
  status: number
): Error & { status: number } {
  return Object.assign(new Error(code), { status })
}

export function stripeApiErrorStatus(error: unknown): number | null {
  return error instanceof Error &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : null
}

export function isStripeSecretKey(value: string) {
  return /^sk_(live|test)_[A-Za-z0-9]+$/.test(value.trim())
}

async function readJson(response: { json(): Promise<unknown> }) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export type { StripeAccount }
