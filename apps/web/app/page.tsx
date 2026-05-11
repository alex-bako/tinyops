import type { Metadata } from "next"

import DesignSystemPageClient from "./design-system-page-client"

export const metadata: Metadata = {
  title: "TinyOps Design System",
  description: "TinyOps interface foundations and workspace UI patterns.",
}

export default function Page() {
  return <DesignSystemPageClient />
}
