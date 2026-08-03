import {
  ToolLoopAgent,
  createGateway,
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
  const gateway = createGateway({ apiKey: env.aiGatewayApiKey });
  cachedAgent = createHandbookAgent(gateway(env.aiModel));
  return cachedAgent;
}
