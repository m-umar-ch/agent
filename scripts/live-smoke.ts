export {};

const baseUrl = process.env.HANDBOOK_BASE_URL?.trim();
const apiKey = process.env.HANDBOOK_API_KEY?.trim();

function fail(message: string): never {
  console.error(`Live smoke failed: ${message}`);
  process.exit(1);
}

if (!baseUrl) {
  fail("HANDBOOK_BASE_URL is required.");
}

if (!apiKey) {
  fail("HANDBOOK_API_KEY is required.");
}

let endpoint: URL;
try {
  endpoint = new URL("/api/handbook/chat", baseUrl);
} catch {
  fail("HANDBOOK_BASE_URL must be a valid URL.");
}

if (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") {
  fail("HANDBOOK_BASE_URL must use http or https.");
}

const messageId = `live-smoke-${crypto.randomUUID()}`;
const requestBody = {
  messages: [
    {
      id: messageId,
      role: "user",
      parts: [
        {
          type: "text",
          text: "What are the handbook's focus hours?",
        },
      ],
    },
  ],
};

try {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    fail(`server returned HTTP ${response.status}.`);
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("text/event-stream")) {
    fail("response Content-Type was not text/event-stream.");
  }

  if (!response.body) {
    fail("response did not include an SSE body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let dataEventCount = 0;
  let sawDone = false;
  let sawToolOutput = false;
  let sawText = false;

  const inspectLine = (line: string) => {
    if (!line.startsWith("data:")) return;

    const data = line.slice("data:".length).trimStart();
    if (!data) return;
    if (data === "[DONE]") {
      sawDone = true;
      return;
    }

    try {
      const event = JSON.parse(data) as {
        type?: unknown;
        delta?: unknown;
      };
      if (
        typeof event === "object" &&
        event !== null &&
        "type" in event &&
        event.type === "error"
      ) {
        fail("UI stream reported an error event.");
      }
      if (
        typeof event.type === "string" &&
        event.type.startsWith("tool-") &&
        event.type.includes("output")
      ) {
        sawToolOutput = true;
      }
      if (
        event.type === "text-delta" &&
        typeof event.delta === "string" &&
        event.delta.length > 0
      ) {
        sawText = true;
      }
      dataEventCount += 1;
    } catch {
      fail("SSE data event was not valid JSON.");
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    pending += decoder.decode(value, { stream: !done });

    let newlineIndex = pending.indexOf("\n");
    while (newlineIndex >= 0) {
      inspectLine(pending.slice(0, newlineIndex).replace(/\r$/, ""));
      pending = pending.slice(newlineIndex + 1);
      newlineIndex = pending.indexOf("\n");
    }

    if (done) break;
  }

  if (pending) {
    inspectLine(pending.replace(/\r$/, ""));
  }

  if (dataEventCount === 0) {
    fail("SSE body did not contain a JSON data event.");
  }
  if (!sawDone) {
    fail("UI stream ended without the completion marker.");
  }
  if (!sawToolOutput) {
    fail("UI stream did not contain a completed handbook tool.");
  }
  if (!sawText) {
    fail("UI stream did not contain a non-empty answer.");
  }

  console.info(
    `Live smoke passed: received HTTP ${response.status} UI SSE with ${dataEventCount} data event(s).`,
  );
} catch (error) {
  if (error instanceof Error && error.name === "TimeoutError") {
    fail("request timed out.");
  }

  fail(error instanceof Error ? error.message : "request failed.");
}
