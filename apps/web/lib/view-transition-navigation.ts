"use client"

type RoutePusher = (href: string) => void

function navigateWithOptionalViewTransition(push: RoutePusher, href: string) {
  if (
    typeof document !== "undefined" &&
    typeof document.startViewTransition === "function"
  ) {
    document.startViewTransition(() => push(href))
    return
  }

  push(href)
}

export { navigateWithOptionalViewTransition }
