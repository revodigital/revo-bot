import OpenAI from "openai";
import { ThreadContext } from "./thread-context";
import { TurnTypes } from "../types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const AIConfig = {
  model: "gpt-5-mini",
  reasoning: { effort: "minimal" },
} as OpenAI.Responses.ResponseCreateParamsNonStreaming;

export async function callAIAsChatCompletion(
  prompt: string,
  context?: ThreadContext,
): Promise<string> {
  const response = await openai.responses.create({
    ...AIConfig,
    input: context
      ? [
          ...context.history,
          {
            role: TurnTypes.USER,
            content: prompt,
          },
        ]
      : [
          {
            role: TurnTypes.USER,
            content: prompt,
          },
        ],
  });

  return response.output_text ?? "";
}

export async function callAIAsResponse(prompt: string): Promise<string> {
  const response = await openai.responses.create({
    ...AIConfig,
    input: prompt,
  });

  return response.output_text;
}
