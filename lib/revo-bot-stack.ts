import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dotenv from "dotenv";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

dotenv.config();

export class RevoBotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
          EMBEDDING_BUCKET: "revo-bot-embedding-docs",
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

    const embeddingBucket = new s3.Bucket(this, "revo-bot-embedding-docs", {
      bucketName: "revo-bot-embedding-docs",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    embeddingBucket.grantRead(embeddingLambda);

    new cdk.CfnOutput(this, "EmbeddingBucketName", {
      value: embeddingBucket.bucketName,
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
  }
}
