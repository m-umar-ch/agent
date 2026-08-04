const STREAM_IDLE_GRACE_MS = 15_000;

/**
 * Bun's default 10-second idle timeout applies while the model is thinking.
 * Keep each API request alive slightly longer than the agent's total deadline.
 */
export function requestIdleTimeoutSeconds(agentTimeoutMs: number): number {
  return Math.ceil((agentTimeoutMs + STREAM_IDLE_GRACE_MS) / 1_000);
}
