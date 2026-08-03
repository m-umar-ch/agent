# Staunch Handbook Assistant

An internal, handbook-grounded chat application built with Bun, Hono, React,
and AI SDK v7. Employees ask questions in a React chat UI; a server-side
`ToolLoopAgent` must consult one or more of 15 narrowly scoped policy tools
before answering.

## Architecture

- **Bun** runs the application, serves the React entry point, and builds the
  production server and browser assets.
- **Hono** provides `/api/health`, bearer-key authentication, bounded
  process-wide rate limiting, request limits, and the handbook chat route.
- **React 19** and `@ai-sdk/react` provide the in-browser chat experience using
  `useChat` and `DefaultChatTransport`.
- **AI SDK v7** provides the AI Gateway model, `ToolLoopAgent`, typed UI
  messages, server-side tool execution, and the UI message stream.
- **15 server-side tools** cover employment, focus hours, conduct and safety,
  work-management systems, appraisal, benefits, leave, attendance, remote
  work, EOBI, night work, offboarding, and three department role families.
  Tools load only the relevant Markdown under `docs/handbook/`.

The first agent step requires a tool call. Later steps may load other governing
policies when a question spans topics. Tool execution and handbook file access
remain on the server.

## Prerequisites

- [Bun](https://bun.sh/) compatible with this repository's lockfile
- A [Vercel AI Gateway](https://vercel.com/ai-gateway) API key
- A long, random internal key to protect the handbook endpoint

Install dependencies:

```sh
bun install
```

## Configuration

Copy the checked-in template and fill in the secrets:

```sh
cp .env.example .env
```

Environment variables:

- `AI_GATEWAY_API_KEY`: AI Gateway credential used only by the server.
- `AI_MODEL`: an AI Gateway model ID in `provider/model` form.
- `HANDBOOK_API_KEY`: shared bearer key for the employee UI and API; it must be
  at least 24 characters.
- `PORT`: HTTP port, default `3000`.
- `MAX_REQUEST_BYTES`: maximum chat request size, default `262144`.
- `MAX_CHAT_MESSAGES`: maximum UI messages per request, default `30`.
- `RATE_LIMIT_PER_MINUTE`: process-wide request limit per server instance,
  default `30`.
- `AGENT_TIMEOUT_MS`: total agent timeout, default `60000`.
- `NODE_ENV`: `development`, `test`, or `production`.
- `DB_FILE_NAME`: database filename used by the repository's database tooling.
  The handbook chat runtime does not currently persist conversations to it.

Do not copy a model name from an old example. Open the live
[AI Gateway model catalog](https://vercel.com/ai-gateway/models), choose a
currently available model that supports tool calling, and place its exact
`provider/model` ID in `AI_MODEL`. Availability and model IDs change over time,
so this README intentionally does not hardcode one.

## Run and verify

The following application commands are defined in `package.json`:

```sh
bun run dev        # hot-reloading development server
bun run build      # production build in dist/
bun run start      # run dist/server.js with NODE_ENV=production
bun run typecheck  # TypeScript checks without emitting files
bun run test       # Bun test suite
bun run smoke:live # opt-in live Gateway/API smoke test
bun run check      # typecheck, test, then build
```

Open <http://localhost:3000> after starting the server.

The production build artifact is `dist/`, with `dist/server.js` as its server
entry point and hashed browser assets under `dist/client/`. The artifact is not
content-standalone: policy tools read `docs/handbook/` at runtime, so the
canonical handbook corpus must also be present in the deployment working
directory.

## API-key UI flow

The initial screen asks for `HANDBOOK_API_KEY`. The browser keeps the entered
value only in React state, sends it as `Authorization: Bearer ...` on each chat
request, and clears it on page reload, tab close, or **End session**. The gate
only checks that the field is non-empty; the server authenticates the first and
every subsequent request.

This is one shared application key, not user authentication. It provides no
employee identity, per-user authorization, revocation, or reliable user audit
trail. For a real internal deployment, put the app behind TLS and company SSO
(or replace the shared-key middleware with identity-aware authentication).

## HTTP API

### Health and authentication

Health does not require authentication:

```sh
curl -i "${HANDBOOK_BASE_URL:-http://localhost:3000}/api/health"
```

A protected request without a bearer key returns `401`:

```sh
curl -i -X POST \
  -H "Content-Type: application/json" \
  --data '{"messages":[{"id":"question-1","role":"user","parts":[{"type":"text","text":"What are focus hours?"}]}]}' \
  "${HANDBOOK_BASE_URL:-http://localhost:3000}/api/handbook/chat"
```

An authenticated request streams the response:

```sh
curl -N -X POST \
  -H "Authorization: Bearer ${HANDBOOK_API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{"messages":[{"id":"question-1","role":"user","parts":[{"type":"text","text":"What are focus hours?"}]}]}' \
  "${HANDBOOK_BASE_URL:-http://localhost:3000}/api/handbook/chat"
```

### Chat protocol

`POST /api/handbook/chat` accepts an AI SDK UI-message request. The required
`messages` array contains messages with an `id`, `role`, and typed `parts`
rather than a legacy `{ role, content }` payload:

```json
{
  "messages": [
    {
      "id": "question-1",
      "role": "user",
      "parts": [{ "type": "text", "text": "What are focus hours?" }]
    }
  ]
}
```

The successful response is an AI SDK UI message stream over server-sent events
(`Content-Type: text/event-stream`). Each SSE `data:` line carries a UI stream
event, allowing the React client to update text and tool activity incrementally.
The server applies built-in `smoothStream({ chunking: "word" })` word smoothing
so text arrives in readable increments.

The employee-facing activity timeline shows friendly policy names, progress,
completion state, and HR-warning counts. It does not render raw tool payloads,
custom provider data, or hidden reasoning. The server sets
`sendReasoning: false` and `sendSources: false`, and the client defensively
ignores reasoning parts and unsafe source URLs.

For each stateless turn, the browser sends its current UI-message history. The
server validates the full payload, then forwards only employee-authored text
messages to the model. Client-supplied system, assistant, and tool results are
never trusted as policy evidence; the agent reloads policy tools on every turn.

## Live smoke test (explicit opt-in)

The live smoke script contacts a running server and therefore may consume model
quota. It never runs as part of `bun run test` or `bun run check`. Opt in by
setting both variables and invoking it directly:

```sh
HANDBOOK_BASE_URL=http://localhost:3000 \
HANDBOOK_API_KEY=replace-with-your-key \
bun run smoke:live
```

It sends one valid UI-message question, verifies a successful SSE response and
at least one JSON `data:` event, and prints neither the key nor response body.

## HR confirmation behavior

Handbook blockquotes beginning with
`> **Needs HR confirmation:**` are extracted into structured flags when a
policy loads. If a flag applies, the agent must state the documented facts,
explain the uncertainty, avoid choosing an interpretation or calculating an
uncertain entitlement, and direct the employee to HR. The activity timeline
also reports how many items from a reviewed policy need confirmation.

## Data and privacy limits

- Chat history is held by the current browser session and sent with each
  request. There is no server-side conversation store, account history, or
  database persistence. Only user-authored text is retained when the server
  constructs model history.
- The agent object, handbook document cache, and rate-limit counters live only
  in server-process memory and reset when the process restarts.
- Questions, conversation context, and policy material needed to answer them
  are processed through AI Gateway and the selected upstream model provider.
  Review those services' retention and data-processing terms before deployment.
- Server logs contain operational metadata such as request IDs, tool names,
  timing, finish reasons, and token usage. The UI receives tool stream parts
  with compact source and HR-warning metadata, not raw policy bodies.
- Do not submit unnecessary personal, salary, health, CNIC, client, legal, or
  other sensitive information. This assistant is informational and is not a
  substitute for HR, legal, medical, tax, or financial advice.

## Add a handbook topic

1. Add a focused Markdown file under `docs/handbook/` with strict YAML
   frontmatter: `title`, `summary`, non-empty `topics`, and `related`.
2. Add a literal tool name, typed file path, description, and `useFor` /
   `avoidFor` routing metadata in `src/handbook/catalog.ts`.
3. Add the matching statically declared tool in `src/handbook/tools.ts`.
4. Add its employee-friendly label in
   `client/components/chat-types.ts`, and update the handbook corpus index.
5. Add or update handbook validation and routing tests, then run
   `bun run check`.

Keep topics narrow. Put unresolved or conflicting policy text behind the exact
`Needs HR confirmation` marker rather than resolving ambiguity in code.
