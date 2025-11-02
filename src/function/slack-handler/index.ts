import { WebClient } from "@slack/web-api";
import { getEmbedding } from "../../shared/prompt/get-embedding";
import { matchDocuments } from "../../shared/prompt/match-documents";
import {
  buildCommentPrompt,
  buildInitialPrompt,
} from "../../shared/prompt/build-initial-prompt";
import { callAIAsChatCompletion } from "../../shared/prompt/openai";
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
import {
  appendToContext,
  getContext,
  ThreadContext,
} from "../../shared/prompt/thread-context";
import { TurnTypes } from "../../shared/types";

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
    slackEvent.user === process.env.SLACK_BOT_USER_ID ||
    (slackEvent.type !== "app_mention" && slackEvent.type !== "message") ||
    (slackEvent.type === "app_mention" &&
      !slackEvent.text.includes(`<@${botUserId}>`)) ||
    (slackEvent.type === "message" && slackEvent.channel_type !== "im")
  ) {
    console.warn("Ignored event", slackEvent);
    return {
      statusCode: 200,
      body: `Ignored event - received: ${slackEvent.type}`,
    };
  }

  const userQuery = slackEvent.text.replace(`<@${botUserId}>`, "").trim();
  const thread_ts = slackEvent.thread_ts || slackEvent.ts;

  await slack.reactions.add({
    channel: slackEvent.channel,
    timestamp: slackEvent.ts,
    name: "eyes",
  });
  await appendToContext(thread_ts, {
    role: TurnTypes.USER,
    content: userQuery,
  });

  try {
    const context = await getContext(thread_ts);
    const intent = await detectBudgetIntent(userQuery, context?.toString());

    if (intent.isBudgetQuestion && intent.projectKey) {
      const metabaseResponse = await queryBudgetProject(intent.projectKey);
      const budget = wrapBudgetSummary(parseBudgetResponse(metabaseResponse));

      if (!budget.rows[0]) throw new Error();

      const budgetText = formatBudgetMessage(budget);
      const commentPrompt = buildCommentPrompt(
        intent.projectKey,
        budget,
        userQuery,
        context?.toString(),
      );
      const aiComment = await callAIAsChatCompletion(commentPrompt);
      const finalReply = buildFinalResponse({
        projectKey: intent.projectKey,
        budgetSummaryText: budgetText,
        aiComment,
      });

      await slack.chat.postMessage({
        channel: slackEvent.channel,
        thread_ts,
        text: finalReply,
      });

      await appendToContext(
        thread_ts,
        {
          role: TurnTypes.ASSISTANT,
          content: finalReply,
        },
        {
          projectKey: intent.projectKey,
        },
      );
    } else {
      const context = await getContext(thread_ts);
      const embedding = await getEmbedding(userQuery);
      const matches = await matchDocuments(embedding);
      const prompt = context
        ? buildInitialPrompt(matches, userQuery)
        : userQuery;
      const aiReply = await callAIAsChatCompletion(
        prompt,
        context as ThreadContext,
      );

      await slack.chat.postMessage({
        channel: slackEvent.channel,
        thread_ts,
        text: `${aiReply}`,
      });

      await appendToContext(thread_ts, {
        role: TurnTypes.ASSISTANT,
        content: aiReply,
      });
    }

    await slack.reactions.remove({
      channel: slackEvent.channel,
      timestamp: slackEvent.ts,
      name: "eyes",
    });

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    await slack.chat.postMessage({
      channel: slackEvent.channel,
      thread_ts,
      text: "Mi spiace caro, non sono riuscito a generare una risposta sensata 😓 \nRiprova o contatta il team Revo",
    });
    return { statusCode: 500, body: "Internal Error" };
  }
};
