import { firstNameOf } from "@/features/ask/domain/grounding"

/** Example questions seeded under the ask bar, templated to the client. */
export function askExampleQuestions(clientName: string): string[] {
  const first = firstNameOf(clientName)
  return [
    `What has ${first} actually asked me for?`,
    `Is anything in ${first}'s history sensitive?`,
    `When did ${first} last really engage?`,
  ]
}
