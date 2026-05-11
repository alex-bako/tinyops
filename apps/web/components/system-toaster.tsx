"use client"

import { Toaster as SonnerToaster } from "sonner"

export function SystemToaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      duration={4000}
      closeButton
      toastOptions={{
        style: {
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          background: "var(--popover)",
          color: "var(--popover-foreground)",
          boxShadow: "var(--shadow-2)",
          fontFamily: "var(--font-sans)",
          fontSize: "13px",
          transition:
            "transform var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out)",
        },
      }}
    />
  )
}
