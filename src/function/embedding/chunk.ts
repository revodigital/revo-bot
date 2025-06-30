import { get_encoding } from "@dqbd/tiktoken";

const MAX_TOKENS = 800;

export function chunkText(text: string): string[] {
  const encoder = get_encoding("cl100k_base");
  const sentences = text.split(/(?<=[.?!])\s+/);
  const chunks: string[] = [];

  let currentChunk = "";
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = encoder.encode(sentence).length;

    if (currentTokens + sentenceTokens > MAX_TOKENS) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
      currentTokens = sentenceTokens;
    } else {
      currentChunk += " " + sentence;
      currentTokens += sentenceTokens;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  encoder.free();
  return chunks;
}
