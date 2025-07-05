import { getEmbedding } from "../../shared/prompt/get-embedding";
import { matchDocuments } from "../../shared/prompt/match-documents";
import { buildInitialPrompt } from "../../shared/prompt/build-initial-prompt";
import { callAIAsChatCompletion } from "../../shared/prompt/openai";
import { formatSources } from "../../shared/prompt/sources";

export const handler = async (event: any) => {
  const query = event.queryStringParameters?.q;
  if (!query) return { statusCode: 400, body: "Missing query" };

  const embedding = await getEmbedding(query);
  const matches = await matchDocuments(embedding);
  const prompt = buildInitialPrompt(matches, query);
  const answer = await callAIAsChatCompletion(prompt);
  const sources = formatSources(matches);

  return {
    statusCode: 200,
    body: JSON.stringify({ answer, sources }),
  };
};
