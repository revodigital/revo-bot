import * as cdk from "aws-cdk-lib";
import { Duration } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dotenv from "dotenv";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as scheduler from "aws-cdk-lib/aws-scheduler";
import * as targets from "aws-cdk-lib/aws-scheduler-targets";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

dotenv.config();

export class RevoBotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const embeddingBucket = new s3.Bucket(this, "revo-bot-embedding-docs", {
      bucketName: "revo-bot-embedding-docs",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const embeddingLambda = new NodejsFunction(
      this,
      "revo-bot-embedding-function",
      {
        entry: path.join(__dirname, "../src/function/embedding/index.ts"),
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "index.handler",
        memorySize: 512,
        timeout: cdk.Duration.seconds(60),
        environment: {
          // TODO: store in Secrets Manager declared in CDK stack
          OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
          SUPABASE_URL: process.env.SUPABASE_URL!,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          TIKTOKEN_WASM: "tiktoken_bg.wasm",
          EMBEDDING_BUCKET: embeddingBucket.bucketName,
        },
        bundling: {
          externalModules: [],
          format: OutputFormat.CJS,
          target: "node22",
          nodeModules: ["@dqbd/tiktoken"],
          commandHooks: {
            beforeBundling(inputDir: string, outputDir: string): string[] {
              return [];
            },
            afterBundling(inputDir: string, outputDir: string): string[] {
              return [
                `cp ${inputDir}/node_modules/@dqbd/tiktoken/tiktoken_bg.wasm ${outputDir}/tiktoken_bg.wasm`,
              ];
            },
            beforeInstall(inputDir: string, outputDir: string): string[] {
              return [];
            },
          },
        },
      },
    );

    embeddingBucket.grantRead(embeddingLambda);

    const target = new targets.LambdaInvoke(embeddingLambda, {
      input: scheduler.ScheduleTargetInput.fromObject({}),
    });

    const schedule = new scheduler.Schedule(this, "revo-bot-embed-schedule", {
      schedule: scheduler.ScheduleExpression.rate(Duration.hours(3)),
      target,
      description: "Invoke embedding lambda every three hours",
    });

    const askLambda = new NodejsFunction(this, "revo-bot-ask-function", {
      entry: path.join(__dirname, "../src/function/ask/index.ts"),
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      environment: {
        // TODO: store in Secrets Manager declared in CDK stack
        OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
        SUPABASE_URL: process.env.SUPABASE_URL!,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
      bundling: {
        externalModules: [],
        format: OutputFormat.CJS,
        target: "node22",
      },
    });

    const api = new apigateway.RestApi(this, "revo-bot-api", {
      restApiName: "revo-bot-api",
      deployOptions: {
        stageName: "dev",
      },
      apiKeySourceType: apigateway.ApiKeySourceType.HEADER,
    });

    const apiKey = api.addApiKey("RevoBotApiKey", {
      apiKeyName: "revo-bot-api-key",
      description: "API Key for internal use only",
    });

    const plan = api.addUsagePlan("RevoBotUsagePlan", {
      name: "RevoBotUsagePlan",
      throttle: {
        rateLimit: 10,
        burstLimit: 2,
      },
      quota: {
        limit: 1000,
        period: apigateway.Period.MONTH,
      },
    });

    plan.addApiKey(apiKey);
    plan.addApiStage({ stage: api.deploymentStage });

    const askResource = api.root.addResource("ask");
    askResource.addMethod("GET", new apigateway.LambdaIntegration(askLambda), {
      apiKeyRequired: true,
    });

    const slackHandler = new NodejsFunction(this, "revo-bot-slack-handler", {
      entry: path.join(__dirname, "../src/function/slack-handler/index.ts"),
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN!,
        SLACK_BOT_USER_ID: process.env.SLACK_BOT_USER_ID!,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
        SUPABASE_URL: process.env.SUPABASE_URL!,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        EMBEDDING_BUCKET: embeddingBucket.bucketName,
        METABASE_URL: process.env.METABASE_URL!,
        METABASE_API_KEY: process.env.METABASE_API_KEY!,
      },
      bundling: {
        externalModules: [],
        format: OutputFormat.CJS,
        target: "node22",
      },
    });

    const slackResource = api.root.addResource("slack");
    slackResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(slackHandler),
    );
  }
}
