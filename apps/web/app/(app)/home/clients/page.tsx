import { redirect } from "next/navigation"

import { DEFAULT_SIGNED_IN_PATH } from "@/lib/auth/route-policy"

// The client list lives on Home. Old links and bookmarks land there.
export default function ClientsPage() {
  redirect(DEFAULT_SIGNED_IN_PATH)
}
