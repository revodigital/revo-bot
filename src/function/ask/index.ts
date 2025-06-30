import { getEmbedding } from "./get-embedding";
import { matchDocuments } from "./match-documents";
import { buildPrompt } from "./build-prompt";
import { callOpenAI } from "./openai";
import { formatSources } from "./sources";

export const handler = async (event: any) => {
  const query = event.queryStringParameters?.q;
  if (!query) return { statusCode: 400, body: "Missing query" };

  const embedding = await getEmbedding(query);
  const matches = await matchDocuments(embedding);
  const prompt = buildPrompt(matches, query);
  const answer = await callOpenAI(prompt);
  const sources = formatSources(matches);

  return {
    statusCode: 200,
    body: JSON.stringify({ answer, sources }),
  };
};
