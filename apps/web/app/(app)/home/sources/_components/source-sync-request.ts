"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

const SOURCE_SYNC_STATUS_TTL_MS = 5000

type SourceSyncRequestResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string }

function useSourceSyncRequest<T>({
  request,
  successMessage,
  errorMessage,
}: {
  request: () => Promise<SourceSyncRequestResult<T>>
  successMessage: (result: T) => string
  errorMessage: string
}) {
  const { refresh } = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [message, setMessage] = React.useState<string | null>(null)
  const messageTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearMessageTimer = React.useCallback(() => {
    if (messageTimer.current) {
      clearTimeout(messageTimer.current)
      messageTimer.current = null
    }
  }, [])

  const showMessage = React.useCallback(
    (nextMessage: string) => {
      clearMessageTimer()
      setMessage(nextMessage)
      messageTimer.current = setTimeout(() => {
        setMessage(null)
        messageTimer.current = null
      }, SOURCE_SYNC_STATUS_TTL_MS)
    },
    [clearMessageTimer]
  )

  React.useEffect(() => clearMessageTimer, [clearMessageTimer])

  const run = React.useCallback(() => {
    clearMessageTimer()
    setMessage(null)

    startTransition(async () => {
      try {
        const result = await request()
        if ("error" in result) {
          showMessage(errorMessage)
          return
        }

        showMessage(successMessage(result.data))
        refresh()
      } catch {
        showMessage(errorMessage)
      }
    })
  }, [
    clearMessageTimer,
    errorMessage,
    refresh,
    request,
    showMessage,
    successMessage,
  ])

  return { pending, message, run }
}

export { useSourceSyncRequest }
