import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { TurnTypes } from "../types";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.DYNAMO_THREAD_CONTEXT_TABLE!;
const DEFAULT_TTL_SECONDS = 10 * 60; // 10 minuti

export type ConversationTurn = {
  role: TurnTypes;
  content: string;
  timestamp?: string;
};

export type ThreadContext = {
  history: ConversationTurn[];
  projectKey?: string;
  [key: string]: any;
};

export async function getContext(
  threadTs: string,
): Promise<ThreadContext | null> {
  const sessionKey = `thread::${threadTs}`;

  try {
    const result = await client.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: sessionKey },
      }),
    );

    return result.Item?.context ?? null;
  } catch (err) {
    console.error("Error fetching context from DynamoDB", err);
    return null;
  }
}

export async function appendToContext(
  threadTs: string,
  turn: ConversationTurn,
  additionalProps: Partial<ThreadContext> = {},
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  const sessionKey = `thread::${threadTs}`;
  const previous = await getContext(threadTs);

  const history = previous?.history ?? [];
  const newContext: ThreadContext = {
    ...previous,
    ...additionalProps,
    history: [...history, turn],
  };

  try {
    await client.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: sessionKey,
          context: newContext,
          expires_at: Math.floor(Date.now() / 1000) + ttlSeconds,
        },
      }),
    );
  } catch (err) {
    console.error("Error appending context to DynamoDB", err);
  }
}
