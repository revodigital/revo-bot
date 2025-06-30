import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function embedAndInsert(chunkText: string, metadata: any) {
  const embeddingRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunkText,
  });

  const [{ embedding }] = embeddingRes.data;

  const { error } = await supabase.from("documents").insert({
    text: chunkText,
    embedding,
    filename: metadata.filename,
    url: metadata.url,
    mime_type: metadata.mimeType,
    modified_time: metadata.modifiedTime,
    project: metadata.project ?? null,
  });

  if (error) throw new Error(`Supabase insert error: ${error.message}`);
}
