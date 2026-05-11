import type { Metadata } from "next"

import LoginPageClient from "./login-page-client"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to TinyOps with your workspace email.",
}

export default function LoginPage() {
  return <LoginPageClient />
}
