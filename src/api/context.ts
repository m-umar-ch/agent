import type { EvlogVariables } from "evlog/hono";

export type ApiContext = EvlogVariables & {
  Variables: {
    requestId: string;
  };
};
