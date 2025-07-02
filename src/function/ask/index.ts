import { getEmbedding } from "../../shared/get-embedding";
import { matchDocuments } from "../../shared/match-documents";
import { buildPrompt } from "../../shared/build-prompt";
import { callOpenAI } from "../../shared/openai";
import { formatSources } from "../../shared/sources";

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
