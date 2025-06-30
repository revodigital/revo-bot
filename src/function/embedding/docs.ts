import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
// @ts-ignore
import pdf from "pdf-parse/lib/pdf-parse.js"; // TODO: find another workaround

const s3 = new S3Client({});

export async function loadDocumentsFromS3(
  bucketName: string,
  prefix = "",
): Promise<string[]> {
  const listCommand = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix,
  });
  const listResponse = await s3.send(listCommand);

  const documents: string[] = [];

  if (!listResponse.Contents) return documents;

  for (const object of listResponse.Contents) {
    if (!object.Key) continue;

    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: object.Key,
    });
    const getResponse = await s3.send(getCommand);
    const body = getResponse.Body as Readable;

    const buffer = await streamToBuffer(body);
    const fileName = object.Key.toLowerCase();

    if (fileName.endsWith(".pdf")) {
      const parsed = await pdf(buffer);
      documents.push(parsed.text);
    } else if (
      fileName.endsWith(".txt") ||
      fileName.endsWith(".md") ||
      fileName.endsWith(".csv") ||
      fileName.endsWith(".json")
    ) {
      documents.push(buffer.toString("utf8"));
    } else {
      console.warn(`Skipping unsupported file: ${fileName}`);
    }
  }

  return documents;
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk as Buffer));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
