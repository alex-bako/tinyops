import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/lib/database.types"
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env"

export function isProtectedPath(pathname: string) {
  return pathname === "/home" || pathname.startsWith("/home/")
}

export function isPublicAuthPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/auth/")
}

export function resolveAuthRedirect({
  pathname,
  hasUser,
}: {
  pathname: string
  hasUser: boolean
}) {
  if (!hasUser && isProtectedPath(pathname)) return "/login"
  if (hasUser && pathname === "/login") return "/home"
  return null
}

export function resolveMagicLinkCodeRedirect(pathname: string, search: string) {
  if (pathname !== "/") return null

  const params = new URLSearchParams(search)
  if (!params.has("code")) return null

  return `/auth/callback?${params.toString()}`
}

function redirectWithSessionCookies(
  request: NextRequest,
  response: NextResponse,
  redirectPath: string
) {
  const redirect = NextResponse.redirect(new URL(redirectPath, request.url))
  response.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie)
  })
  return redirect
}

export async function updateSession(request: NextRequest) {
  const magicLinkRedirect = resolveMagicLinkCodeRedirect(
    request.nextUrl.pathname,
    request.nextUrl.search
  )

  if (magicLinkRedirect) {
    return NextResponse.redirect(new URL(magicLinkRedirect, request.url))
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          supabaseResponse = NextResponse.next({ request })

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })

          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const redirectPath = resolveAuthRedirect({
    pathname: request.nextUrl.pathname,
    hasUser: user != null,
  })

  if (redirectPath) {
    return redirectWithSessionCookies(request, supabaseResponse, redirectPath)
  }

  return supabaseResponse
}
