#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { RevoBotStack } from "../lib/revo-bot-stack";

const app = new cdk.App();
new RevoBotStack(app, "RevoBotStack", {
  env: { account: "225828829550", region: "eu-west-1" },
});
