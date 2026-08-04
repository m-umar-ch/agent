import { createOpenAI } from "@ai-sdk/openai";
import {
  ToolLoopAgent,
  isStepCount,
  type InferAgentUIMessage,
  type LanguageModel,
} from "ai";
import { getEnv } from "../config/env";
import { handbookTools } from "../handbook/tools";
import { HANDBOOK_AGENT_INSTRUCTIONS } from "./instructions";

export function createHandbookAgent(model: LanguageModel) {
  return new ToolLoopAgent({
    model,
    instructions: HANDBOOK_AGENT_INSTRUCTIONS,
    allowSystemInMessages: false,
    reasoning: "minimal",
    maxOutputTokens: 700,
    providerOptions: {
      openai: {
        reasoningSummary: "concise",
        textVerbosity: "low",
      },
    },
    tools: handbookTools,
    stopWhen: isStepCount(6),
    prepareStep: ({ stepNumber }) => {
      if (stepNumber === 0) {
        return { toolChoice: "required" };
      }
      return { toolChoice: stepNumber >= 5 ? "none" : "auto" };
    },
  });
}

export type HandbookAgent = ReturnType<typeof createHandbookAgent>;
export type HandbookUIMessage = InferAgentUIMessage<HandbookAgent>;

let cachedAgent: HandbookAgent | undefined;

export function getHandbookAgent(): HandbookAgent {
  if (cachedAgent !== undefined) {
    return cachedAgent;
  }

  const env = getEnv();
  const openai = createOpenAI({ apiKey: env.openaiApiKey });
  cachedAgent = createHandbookAgent(openai(env.openaiModel ?? "gpt-5-mini"));
  return cachedAgent;
}
