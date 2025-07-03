import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function matchDocuments(embedding: number[]) {
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_threshold: 0.78,
    match_count: 10,
  });

  if (error)
    throw new Error(`Supabase match_documents error: ${error.message}`);
  return data;
}
