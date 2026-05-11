import { describe, expect, it } from "vitest"

import {
  dialogContentMotionClasses,
  dialogOverlayMotionClasses,
  floatingContentMotionClasses,
} from "./motion.js"

describe("motion class helpers", () => {
  it("keeps floating surface open and close zoom policy in one place", () => {
    expect(floatingContentMotionClasses).toContain("data-open:zoom-in-[0.98]")
    expect(floatingContentMotionClasses).toContain("data-closed:zoom-out-[0.98]")
  })

  it("keeps dialog overlay and content timing in one place", () => {
    expect(dialogOverlayMotionClasses).toContain("data-open:duration-(--dur-base)")
    expect(dialogOverlayMotionClasses).toContain(
      "data-closed:duration-(--dur-fast)"
    )
    expect(dialogContentMotionClasses).toContain("origin-center")
    expect(dialogContentMotionClasses).toContain("data-open:zoom-in-[0.98]")
  })
})
