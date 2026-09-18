import { headers } from "next/headers"

export async function getRequestOrigin() {
  const requestHeaders = await headers()
  const origin = requestHeaders.get("origin")
  if (origin) return origin

  const host = requestHeaders.get("host")
  if (host) return `http://${host}`

  return "http://127.0.0.1:3000"
}
