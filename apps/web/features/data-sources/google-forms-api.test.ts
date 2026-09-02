import { createVerify, generateKeyPairSync } from "node:crypto"
import { describe, expect, it } from "vitest"

import {
  createGoogleFormsApiClient,
  googleFormsApiErrorStatus,
  mapGoogleForm,
  parseGoogleServiceAccountKey,
} from "@/features/data-sources/google-forms-api"

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
})

const TOKEN_URL = "https://oauth2.googleapis.com/token"
const serviceAccount = {
  clientEmail: "sync@tinyops.iam.gserviceaccount.com",
  privateKey,
}

const RAW_FORM = {
  formId: "1AbC_Def-1234567890",
  info: { title: "Practice intake", documentTitle: "Practice intake (file)" },
  settings: { emailCollectionType: "DO_NOT_COLLECT" },
  items: [
    {
      itemId: "i1",
      title: "Your email",
      questionItem: { question: { questionId: "q_email" } },
    },
    { itemId: "i2", title: "Welcome", textItem: {} },
    {
      itemId: "i3",
      title: "How satisfied are you?",
      questionGroupItem: {
        questions: [
          { questionId: "q_row1", rowQuestion: { title: "Sessions" } },
          { questionId: "q_row2", rowQuestion: { title: "Materials" } },
        ],
      },
    },
    {
      itemId: "i4",
      title: "Upload your intake sheet",
      questionItem: { question: { questionId: "q_file" } },
    },
  ],
}

const RAW_RESPONSES = {
  responses: [
    {
      responseId: "resp-1",
      createTime: "2026-05-10T09:15:00.123Z",
      lastSubmittedTime: "2026-05-11T08:00:00.000Z",
      answers: {
        q_email: {
          questionId: "q_email",
          textAnswers: { answers: [{ value: " Anna@Example.com " }] },
        },
        q_row1: { questionId: "q_row1", textAnswers: { answers: [{ value: "4" }] } },
        q_file: {
          questionId: "q_file",
          fileUploadAnswers: {
            answers: [
              { fileId: "file-1", fileName: "intake.pdf", mimeType: "application/pdf" },
            ],
          },
        },
      },
    },
    { responseId: "", createTime: "2026-05-10T09:15:00.123Z" },
  ],
  nextPageToken: "page-2",
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status < 400,
    status,
    async json() {
      return body
    },
  }
}

describe("Google Forms API client", () => {
  it("signs a service-account JWT, reuses the token, and maps forms and responses", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const client = createGoogleFormsApiClient({
      serviceAccount,
      now: () => 1_700_000_000_000,
      fetcher: async (url, init) => {
        calls.push({ url, init })
        if (url === TOKEN_URL) {
          return jsonResponse(200, { access_token: "token-1", expires_in: 3600 })
        }
        if (url.endsWith("/v1/forms/1AbC_Def-1234567890")) {
          return jsonResponse(200, RAW_FORM)
        }
        return jsonResponse(200, RAW_RESPONSES)
      },
    })

    const form = await client.getForm("1AbC_Def-1234567890")
    const page = await client.listResponses({
      formId: "1AbC_Def-1234567890",
      filter: "timestamp > 2026-05-10T00:00:00.000Z",
      pageSize: 50,
      pageToken: "page-1",
    })

    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      "/token",
      "/v1/forms/1AbC_Def-1234567890",
      "/v1/forms/1AbC_Def-1234567890/responses",
    ])

    const tokenBody = new URLSearchParams(String(calls[0]?.init?.body))
    expect(tokenBody.get("grant_type")).toBe(
      "urn:ietf:params:oauth:grant-type:jwt-bearer"
    )
    const [header, claims, signature] = tokenBody.get("assertion")!.split(".")
    expect(JSON.parse(Buffer.from(header!, "base64url").toString())).toEqual({
      alg: "RS256",
      typ: "JWT",
    })
    expect(JSON.parse(Buffer.from(claims!, "base64url").toString())).toEqual({
      iss: serviceAccount.clientEmail,
      scope:
        "https://www.googleapis.com/auth/forms.body.readonly https://www.googleapis.com/auth/forms.responses.readonly",
      aud: TOKEN_URL,
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    })
    expect(
      createVerify("RSA-SHA256")
        .update(`${header}.${claims}`)
        .verify(publicKey, signature!, "base64url")
    ).toBe(true)
    expect(calls[1]?.init?.headers).toEqual({ authorization: "Bearer token-1" })

    const responsesUrl = new URL(calls[2]!.url)
    expect(responsesUrl.searchParams.get("filter")).toBe(
      "timestamp > 2026-05-10T00:00:00.000Z"
    )
    expect(responsesUrl.searchParams.get("pageSize")).toBe("50")
    expect(responsesUrl.searchParams.get("pageToken")).toBe("page-1")

    expect(form).toEqual({
      formId: "1AbC_Def-1234567890",
      title: "Practice intake",
      collectsEmail: false,
      questions: [
        { id: "q_email", title: "Your email" },
        { id: "q_row1", title: "How satisfied are you? / Sessions" },
        { id: "q_row2", title: "How satisfied are you? / Materials" },
        { id: "q_file", title: "Upload your intake sheet" },
      ],
    })
    expect(page).toEqual({
      responses: [
        {
          responseId: "resp-1",
          createTime: "2026-05-10T09:15:00.123Z",
          lastSubmittedTime: "2026-05-11T08:00:00.000Z",
          respondentEmail: null,
          answers: {
            q_email: "Anna@Example.com",
            q_row1: "4",
            q_file: "intake.pdf (https://drive.google.com/file/d/file-1/view)",
          },
        },
      ],
      nextPageToken: "page-2",
    })
  })

  it("maps missing access to google_forms_access_failed and other failures to api errors", async () => {
    const statuses = [403, 500]
    const client = createGoogleFormsApiClient({
      serviceAccount,
      fetcher: async (url) =>
        url === TOKEN_URL
          ? jsonResponse(200, { access_token: "token-1", expires_in: 3600 })
          : jsonResponse(statuses.shift() ?? 500, { error: {} }),
    })

    const forbidden = await client.getForm("1AbC_Def-1234567890").catch((e) => e)
    expect(forbidden).toBeInstanceOf(Error)
    expect((forbidden as Error).message).toBe("google_forms_access_failed")
    expect(googleFormsApiErrorStatus(forbidden)).toBe(403)

    const failed = await client
      .listResponses({ formId: "1AbC_Def-1234567890" })
      .catch((e) => e)
    expect((failed as Error).message).toBe("google_forms_api_failed")
    expect(googleFormsApiErrorStatus(failed)).toBe(500)

    const badKey = createGoogleFormsApiClient({
      serviceAccount,
      fetcher: async () => jsonResponse(400, { error: "invalid_grant" }),
    })
    await expect(badKey.getForm("1AbC_Def-1234567890")).rejects.toThrow(
      "google_forms_not_configured"
    )
  })

  it("parses raw or base64 service-account keys and detects email collection", () => {
    const raw = JSON.stringify({
      type: "service_account",
      client_email: serviceAccount.clientEmail,
      private_key: privateKey,
    })

    expect(parseGoogleServiceAccountKey(raw)).toEqual(serviceAccount)
    expect(
      parseGoogleServiceAccountKey(Buffer.from(raw).toString("base64"))
    ).toEqual(serviceAccount)
    expect(() => parseGoogleServiceAccountKey("{}")).toThrow(
      "google_forms_not_configured"
    )
    expect(() => parseGoogleServiceAccountKey("not json")).toThrow(
      "google_forms_not_configured"
    )

    expect(
      mapGoogleForm({
        ...RAW_FORM,
        settings: { emailCollectionType: "VERIFIED" },
        items: [],
      })
    ).toEqual({
      formId: "1AbC_Def-1234567890",
      title: "Practice intake",
      collectsEmail: true,
      questions: [],
    })
  })
})
