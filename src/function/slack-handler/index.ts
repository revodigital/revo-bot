import { WebClient } from "@slack/web-api";
import { getEmbedding } from "../../shared/prompt/get-embedding";
import { matchDocuments } from "../../shared/prompt/match-documents";
import {
  buildCommentPrompt,
  buildPrompt,
} from "../../shared/prompt/build-prompt";
import { callOpenAI } from "../../shared/prompt/openai";
import { detectBudgetIntent } from "../../shared/metabase/detect-intent";
import { queryBudgetProject } from "../../shared/metabase/query-budget-for-project";
import {
  parseBudgetResponse,
  wrapBudgetSummary,
} from "../../shared/metabase/parse-budget";
import {
  buildFinalResponse,
  formatBudgetMessage,
} from "../../shared/metabase/format-budget-response";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN!);
const botUserId = process.env.SLACK_BOT_USER_ID!;

export const handler = async (event: any) => {
  const body = JSON.parse(event.body);
  const slackEvent = body.event;

  if (event.headers["X-Slack-Retry-Num"]) {
    return {
      statusCode: 200,
      body: "Ignore retry",
    };
  }

  if (body.type === "url_verification") {
    return { statusCode: 200, body: body.challenge };
  }

  if (
    slackEvent.type !== "app_mention" ||
    !slackEvent.text.includes(`<@${botUserId}>`)
  ) {
    return { statusCode: 200, body: "Ignored event" };
  }

  const userQuery = slackEvent.text.replace(`<@${botUserId}>`, "").trim();
  const thread_ts = slackEvent.thread_ts || slackEvent.ts;

  try {
    const intent = await detectBudgetIntent(userQuery);

    if (intent.isBudgetQuestion && intent.projectKey) {
      // TODO: maybe extrapolate in dedicated wrapper function
      const metabaseResponse = await queryBudgetProject(intent.projectKey);
      const budget = wrapBudgetSummary(parseBudgetResponse(metabaseResponse));

      if (!budget.rows[0]) throw new Error();

      const budgetText = formatBudgetMessage(budget);
      const commentPrompt = buildCommentPrompt(
        intent.projectKey,
        budget,
        userQuery,
      );
      const aiComment = await callOpenAI(commentPrompt);
      const finalReply = buildFinalResponse({
        projectCode: intent.projectKey,
        budgetSummaryText: budgetText,
        aiComment,
      });

      await slack.chat.postMessage({
        channel: slackEvent.channel,
        thread_ts,
        text: finalReply,
      });
    } else {
      const embedding = await getEmbedding(userQuery);
      const matches = await matchDocuments(embedding);
      const prompt = buildPrompt(matches, userQuery);
      const aiReply = await callOpenAI(prompt);

      await slack.chat.postMessage({
        channel: slackEvent.channel,
        thread_ts,
        text: `${aiReply}`,
      });
    }

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    console.error("Slack handler error:", err);
    await slack.chat.postMessage({
      channel: slackEvent.channel,
      thread_ts,
      text: "Mi spiace caro, non sono riuscito a generare una risposta sensata 😓 \nRiprova o contatta il team Revo",
    });
    return { statusCode: 500, body: "Internal Error" };
  }
};
