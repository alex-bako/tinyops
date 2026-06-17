import { openai } from "@ai-sdk/openai"
import { streamObject, type LanguageModel } from "ai"

import {
  askAnswerDraftSchema,
  type AnswerSynthesizerPort,
  type GroundingContext,
} from "@/features/ask/domain/answer-draft"
import { buildGroundingPrompt } from "@/features/ask/domain/grounding"

// Adapter that realizes the AnswerSynthesizerPort with the Vercel AI SDK and an
// OpenAI model. The model id is configurable via ASK_AI_MODEL; OPENAI_API_KEY is
// read by the provider itself. The model is injectable so tests can drive it
// with a mock — only this file knows about prompts and the provider.

const DEFAULT_MODEL = "gpt-5.5"

/** The configured model id, defaulting to GPT-5.5. */
export function resolveAskModel(): string {
  return process.env.ASK_AI_MODEL?.trim() || DEFAULT_MODEL
}

export function createOpenAiAnswerSynthesizer({
  model,
}: {
  model?: LanguageModel
} = {}): AnswerSynthesizerPort {
  return {
    synthesize(context: GroundingContext) {
      const { system, user } = buildGroundingPrompt(context)
      const result = streamObject({
        model: model ?? openai(resolveAskModel()),
        schema: askAnswerDraftSchema,
        system,
        prompt: user,
      })
      return { partials: result.partialObjectStream, final: result.object }
    },
  }
}
