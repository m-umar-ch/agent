import { describe, expect, test } from "bun:test";
import { requestIdleTimeoutSeconds } from "../src/server-timeout";

describe("API request idle timeout", () => {
  test("outlives the agent deadline and avoids Bun's ten-second default", () => {
    expect(requestIdleTimeoutSeconds(60_000)).toBe(75);
  });

  test("preserves a fixed grace period for custom agent deadlines", () => {
    expect(requestIdleTimeoutSeconds(1_000)).toBe(16);
    expect(requestIdleTimeoutSeconds(90_001)).toBe(106);
  });
});
