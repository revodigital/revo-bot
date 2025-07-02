import { WebClient } from "@slack/web-api";
import { getEmbedding } from "../../shared/get-embedding";
import { matchDocuments } from "../../shared/match-documents";
import { buildPrompt } from "../../shared/build-prompt";
import { callOpenAI } from "../../shared/openai";
import { formatSources } from "../../shared/sources";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN!);
const botUserId = process.env.SLACK_BOT_USER_ID!;

export const handler = async (event: any) => {
  const body = JSON.parse(event.body);
  const slackEvent = body.event;

  console.log("Received headers:", JSON.stringify(event.headers, null, 2));
  console.log("Received body:", JSON.stringify(event.body, null, 2));

  if (event.headers["X-Slack-Retry-Num"]) {
    return {
      statusCode: 200,
      body: "Ignore retry",
    };
  }

  if (body.type === "url_verification") {
    console.log("challenge");
    return { statusCode: 200, body: body.challenge };
  }

  if (
    slackEvent.type !== "app_mention" ||
    !slackEvent.text.includes(`<@${botUserId}>`)
  ) {
    console.log(body, "ignored event");
    return { statusCode: 200, body: "Ignored event" };
  }

  const userQuery = slackEvent.text.replace(`<@${botUserId}>`, "").trim();
  const thread_ts = slackEvent.thread_ts || slackEvent.ts;

  try {
    const embedding = await getEmbedding(userQuery);
    const matches = await matchDocuments(embedding);
    const prompt = buildPrompt(matches, userQuery);
    const answer = await callOpenAI(prompt);
    const sources = formatSources(matches);

    // TODO: re-add sources once more structured
    const reply = `${answer}`;

    await slack.chat.postMessage({
      channel: slackEvent.channel,
      thread_ts,
      text: reply,
    });

    console.log("all good");
    return { statusCode: 200, body: "OK" };
  } catch (err) {
    console.error("Slack handler error:", err);
    await slack.chat.postMessage({
      channel: slackEvent.channel,
      thread_ts,
      text: "😓 Errore nella generazione della risposta. Riprova o contatta il team Revo.",
    });
    return { statusCode: 500, body: "Internal Error" };
  }
};
