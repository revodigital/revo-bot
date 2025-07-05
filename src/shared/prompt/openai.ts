import OpenAI from "openai";
import { ThreadContext } from "./thread-context";
import { TurnTypes } from "../types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const AIConfig = {
  temperature: 0.45,
  model: "gpt-4o",
};

export async function callAIAsChatCompletion(
  prompt: string,
  context?: ThreadContext,
): Promise<string> {
  const response = await openai.chat.completions.create({
    ...AIConfig,
    messages: context
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
    max_completion_tokens: 800,
  });

  return response.choices[0]?.message.content ?? "";
}

export async function callAIAsResponse(prompt: string): Promise<string> {
  const response = await openai.responses.create({
    ...AIConfig,
    input: prompt,
  });

  return response.output_text;
}
