import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/lib/database.types"
import {
  getSupabasePublishableKey,
  getSupabasePublicUrl,
} from "@/lib/supabase/public-env"
import {
  resolveAuthRedirect,
  resolveMagicLinkCodeRedirect,
} from "@/lib/auth/route-policy"

export {
  isProtectedPath,
  isPublicAuthPath,
  resolveAuthRedirect,
  resolveMagicLinkCodeRedirect,
} from "@/lib/auth/route-policy"

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
    getSupabasePublicUrl(),
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
