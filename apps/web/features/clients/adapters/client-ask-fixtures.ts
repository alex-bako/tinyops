import type {
  AskRequestContext,
  AskSource,
  GroundedAnswerData,
} from "../application/client-ask"

// Mocked grounding adapter for the client-scoped Ask surface. THIS IS THE
// BACKEND-SWAP BOUNDARY: today it returns crafted answers about the open
// client; later it is replaced by a real grounding use-case. Nothing else in
// the feature changes — the route and UI consume `GroundedAnswerData`.

function firstNameOf(clientName: string): string {
  return clientName.trim().split(/\s+/)[0] || clientName
}

/** Example questions seeded under the ask bar, templated to the client. */
export function askExampleQuestions(clientName: string): string[] {
  const first = firstNameOf(clientName)
  return [
    `What has ${first} actually asked me for?`,
    `Is anything in ${first}'s history sensitive?`,
    `When did ${first} last really engage?`,
  ]
}

type AnswerTemplate = {
  match: (question: string) => boolean
  build: (ctx: AskRequestContext) => Omit<GroundedAnswerData, "question">
}

function clientSource(
  ctx: AskRequestContext,
  source: Omit<AskSource, "name" | "email">
): AskSource {
  return { name: ctx.clientName, email: ctx.clientEmail, ...source }
}

const TEMPLATES: AnswerTemplate[] = [
  {
    // "What has X asked me for?"
    match: (q) => /ask(ed)?\b.*\bfor\b|asked me for|want(ed)?\b/i.test(q),
    build: (ctx) => {
      const first = firstNameOf(ctx.clientName)
      return {
        lead: `Mostly *practical access* — how to reach materials, not the content itself.`,
        body: `Across nine events, ${first}'s questions cluster on logistics: replay access, exercise instructions, and where to find things. ${first} hasn't raised anything about the substance of the work since onboarding.`,
        scope: `Grounded in 9 events for ${first}`,
        confidencePct: 86,
        sources: [
          clientSource(ctx, {
            sourceIcon: "mail",
            sourceLabel: "imap",
            when: "Mar 8",
            snippet: "Asked for clearer steps to reach the replay library.",
          }),
          clientSource(ctx, {
            sourceIcon: "form",
            sourceLabel: "form",
            when: "Feb 12",
            snippet:
              "Onboarding: wanted structured guidance and practical exercises.",
          }),
        ],
        followUps: [
          `Is anything in ${first}'s history sensitive?`,
          `Draft a reply about replay access`,
        ],
      }
    },
  },
  {
    // "Is anything sensitive / firewalled?"
    match: (q) => /sensitive|firewall|private|confidential/i.test(q),
    build: (ctx) => {
      const first = firstNameOf(ctx.clientName)
      return {
        lead: `Yes — *one* intake answer, kept firewalled from any draft.`,
        body: `${first}'s Mar 3 intake form contains personal relationship detail. It's excluded from outbound personalization by default, so nothing TinyOps writes will ever reference it. You can still read it yourself on the timeline.`,
        scope: `Grounded in 1 flagged event`,
        confidencePct: 94,
        firewall: `The specific intake content is not shown here — open it on the timeline if you need it.`,
        sources: [
          clientSource(ctx, {
            sourceIcon: "form",
            sourceLabel: "intake form",
            when: "Mar 3",
            snippet: "Sensitive — excluded from outbound personalization.",
            sensitive: true,
          }),
        ],
        followUps: [
          `What's safe to personalize with?`,
          `Draft a reply about replay access`,
        ],
      }
    },
  },
  {
    // "When did X last engage / go quiet?"
    match: (q) => /last\b|engage|quiet|cool|active|hear from/i.test(q),
    build: (ctx) => {
      const first = firstNameOf(ctx.clientName)
      return {
        lead: `Six weeks ago — ${first}'s *cooling off*, but not gone.`,
        body: `${first}'s last active reply was the Mar 8 thread about replay access. The Feb 28 generic check-in was opened twice but never answered. No feedback submitted since.`,
        scope: `Grounded in 4 events for ${first}`,
        confidencePct: 81,
        sources: [
          clientSource(ctx, {
            sourceIcon: "mail",
            sourceLabel: "imap",
            when: "Mar 8",
            snippet: "Last two-way exchange — replay access resolved same day.",
          }),
          clientSource(ctx, {
            sourceIcon: "sent",
            sourceLabel: "sent",
            when: "Feb 28",
            snippet: "Generic check-in — opened twice, no reply.",
          }),
        ],
        followUps: [
          `Draft a light check-in for ${first}`,
          `What has ${first} actually asked me for?`,
        ],
      }
    },
  },
]

function defaultAnswer(
  ctx: AskRequestContext
): Omit<GroundedAnswerData, "question"> {
  const first = firstNameOf(ctx.clientName)
  return {
    lead: `Here's what ${first}'s timeline can support — *grounded*, with nothing inferred.`,
    body: `I searched every event connected to ${first}. Below are the ones that match — each something ${first} actually said or did. Open any of them to see it in context.`,
    scope: `Grounded in ${first}'s timeline`,
    confidencePct: 72,
    sources: [
      clientSource(ctx, {
        sourceIcon: "mail",
        sourceLabel: "imap",
        when: "3d",
        snippet: "Most recent relevant message — replay-library access.",
      }),
      clientSource(ctx, {
        sourceIcon: "sent",
        sourceLabel: "sent",
        when: "2w",
        snippet: "Last thing you sent — opened, no reply yet.",
      }),
    ],
    followUps: [
      `What has ${first} actually asked me for?`,
      `When did ${first} last really engage?`,
    ],
  }
}

/** Resolve a (mocked) grounded answer for a question about the open client. */
export function resolveGroundedAnswer(
  input: AskRequestContext & { question: string }
): GroundedAnswerData {
  const { question, ...ctx } = input
  const template = TEMPLATES.find((t) => t.match(question))
  const base = template ? template.build(ctx) : defaultAnswer(ctx)
  return { question, ...base }
}
