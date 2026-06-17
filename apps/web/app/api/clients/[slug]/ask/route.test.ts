import { describe, expect, it } from "vitest"

import { POST } from "./route"

function askRequest(question: string) {
  return new Request("http://localhost/api/clients/anna-smith/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientName: "Anna Smith",
      clientEmail: "anna@example.com",
      messages: [
        { id: "u1", role: "user", parts: [{ type: "text", text: question }] },
      ],
    }),
  })
}

const params = Promise.resolve({ slug: "anna-smith" })

describe("POST /api/clients/[slug]/ask", () => {
  it("streams a grounded answer for a known question", async () => {
    const response = await POST(
      askRequest("What has Anna actually asked me for?"),
      { params }
    )

    expect(response.ok).toBe(true)
    expect(response.headers.get("content-type")).toContain("text/event-stream")

    const body = await response.text()
    expect(body).toContain("Grounded in 9 events for Anna")
    expect(body).toContain("What has Anna actually asked me for?")
  })

  it("streams the default answer for an unknown question", async () => {
    const response = await POST(askRequest("What colour is the sky?"), {
      params,
    })
    const body = await response.text()

    expect(body).toContain("Grounded in Anna's timeline")
    expect(body).toContain("What colour is the sky?")
  })
})
