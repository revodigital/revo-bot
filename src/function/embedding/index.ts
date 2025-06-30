import { loadDocumentsFromS3 } from "./docs";
import { chunkText } from "./chunk";
import { embedAndInsert } from "./embed";

export const handler = async () => {
  const bucket = process.env.EMBEDDING_BUCKET!;
  const documents = await loadDocumentsFromS3(bucket);

  for (const [i, text] of documents.entries()) {
    const chunks = chunkText(text);

    for (const chunk of chunks) {
      await embedAndInsert(chunk, {
        filename: `doc-${i}.txt`,
        url: null,
        mimeType: "text/plain",
        modifiedTime: new Date().toISOString(),
        project: null,
      });
    }
  }

  console.log(`✅ Indicizzazione completata: ${documents.length} documenti`);
};
