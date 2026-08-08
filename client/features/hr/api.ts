export type HrTopicInstruction = {
  toolName: string;
  content: string;
  updatedAt: string;
};

export type HrTopic = {
  toolName: string;
  title: string;
  summary: string;
  kind: 'policy' | 'role';
  instruction: HrTopicInstruction | null;
};

export class HrApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'HrApiError';
  }

  get unauthorized(): boolean {
    return this.status === 401;
  }
}

async function hrRequest<T>(
  apiKey: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init.body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const body = (await response.json()) as {
        error?: { message?: string };
      };
      if (body.error?.message) message = body.error.message;
    } catch {
      // Keep the generic status message when the body is not JSON.
    }
    throw new HrApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export async function fetchHrTopics(apiKey: string): Promise<HrTopic[]> {
  const data = await hrRequest<{ topics: HrTopic[] }>(apiKey, '/api/hr/topics');
  return data.topics;
}

export async function saveTopicInstruction(
  apiKey: string,
  toolName: string,
  content: string,
): Promise<HrTopicInstruction> {
  const data = await hrRequest<{ instruction: HrTopicInstruction }>(
    apiKey,
    `/api/hr/topics/${toolName}`,
    { method: 'PUT', body: JSON.stringify({ content }) },
  );
  return data.instruction;
}

export async function removeTopicInstruction(
  apiKey: string,
  toolName: string,
): Promise<void> {
  await hrRequest<{ toolName: string; deleted: boolean }>(
    apiKey,
    `/api/hr/topics/${toolName}`,
    { method: 'DELETE' },
  );
}
