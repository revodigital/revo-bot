import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function callOpenAI(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.4,
    max_tokens: 800,
  });

  return response.choices[0]?.message.content ?? "";
}
