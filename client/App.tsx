import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiKeyGate } from './components/ApiKeyGate';
import { Composer } from './components/Composer';
import { Message } from './components/Message';
import { Button } from './components/ui/button';
import type { HandbookMessage } from './components/chat-types';
import { ChatErrorAlert } from './features/chat/ChatErrorAlert';
import { ChatHeader } from './features/chat/ChatHeader';
import { EmptyState } from './features/chat/EmptyState';
import { statusCopy } from './features/chat/examples';

const API_KEY_STORAGE_KEY = 'handbook-api-key';

function ChatClient({
  apiKey,
  onEndSession,
}: {
  apiKey: string;
  onEndSession: () => void;
}) {
  const [input, setInput] = useState('');
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport<HandbookMessage>({
        api: '/api/handbook/chat',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }),
    [apiKey],
  );

  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    regenerate,
    clearError,
  } = useChat<HandbookMessage>({
    transport,
    throttle: 40,
  });

  const visibleMessages = messages.filter(message => message.role !== 'system');
  const isBusy = status === 'submitted' || status === 'streaming';
  const canRegenerate =
    visibleMessages.some(message => message.role === 'user') && !isBusy;

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({
      block: 'end',
      behavior: status === 'streaming' ? 'auto' : 'smooth',
    });
  }, [messages.length, status]);

  function submitQuestion(question = input) {
    const trimmed = question.trim();
    if (!trimmed || status !== 'ready') return;
    setInput('');
    void sendMessage({ text: trimmed });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <ChatHeader
        isBusy={isBusy}
        onEndSession={() => {
          void stop();
          onEndSession();
        }}
      />

      <main className="mx-auto w-full max-w-[52.5rem] flex-1 px-4 pt-7 pb-5 sm:px-6 sm:pt-10">
        {visibleMessages.length === 0 ? (
          <EmptyState disabled={isBusy} onSelect={submitQuestion} />
        ) : (
          <section
            className="flex flex-col gap-7 pt-1 pb-8 sm:gap-8"
            aria-label="Conversation"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={isBusy}
          >
            {visibleMessages.map((message, index) => (
              <Message
                key={message.id}
                message={message}
                active={
                  isBusy &&
                  message.role === 'assistant' &&
                  index === visibleMessages.length - 1
                }
              />
            ))}

            {status === 'submitted' && (
              <div className="flex items-center gap-2.5 sm:gap-3.5" role="status">
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground sm:size-9"
                  aria-hidden="true"
                >
                  S
                </span>
                <span
                  className="flex h-9 items-center gap-1 rounded-xl border bg-card px-3"
                  aria-label="Preparing an answer"
                >
                  <i className="size-1.5 animate-bounce rounded-full bg-primary/60" />
                  <i className="size-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:120ms]" />
                  <i className="size-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:240ms]" />
                </span>
              </div>
            )}

            {error && (
              <ChatErrorAlert
                canRetry={canRegenerate}
                error={error}
                onDismiss={clearError}
                onRetry={() => void regenerate()}
              />
            )}

            {canRegenerate && !error && (
              <div className="-mt-2 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => void regenerate()}
                >
                  <RefreshCw data-icon="inline-start" aria-hidden="true" />
                  Regenerate answer
                </Button>
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </section>
        )}
      </main>

      <footer className="sticky bottom-0 z-10 bg-[linear-gradient(to_bottom,transparent,oklch(0.975_0.008_92/0.95)_22%,oklch(0.975_0.008_92)_55%)] px-2.5 pt-2 pb-2.5 sm:px-5 sm:pb-4">
        <div className="mx-auto w-full max-w-[49.5rem]">
          <div
            className="flex min-h-5 items-center gap-2 px-1.5 text-[0.7rem] text-muted-foreground"
            aria-live="polite"
            aria-atomic="true"
          >
            <span
              className="size-1.5 rounded-full bg-primary data-[busy=true]:animate-pulse"
              data-busy={isBusy}
              aria-hidden="true"
            />
            {statusCopy(status)}
          </div>
          <Composer
            input={input}
            status={status}
            onInputChange={setInput}
            onSubmit={() => submitQuestion()}
            onStop={() => void stop()}
          />
          <p className="mt-2 px-2 text-center text-[0.65rem] leading-4 text-muted-foreground/75">
            Handbook answers are informational. Contact HR when a policy is
            unclear or your situation needs a decision.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => {
    try {
      return sessionStorage.getItem(API_KEY_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });

  function startSession(key: string) {
    try {
      sessionStorage.setItem(API_KEY_STORAGE_KEY, key);
    } catch {
      // Continue with an in-memory session when storage is unavailable.
    }
    setApiKey(key);
  }

  function endSession() {
    try {
      sessionStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch {
      // The in-memory state still ends the session.
    }
    setApiKey('');
  }

  if (!apiKey) {
    return <ApiKeyGate onUnlock={startSession} />;
  }

  return <ChatClient apiKey={apiKey} onEndSession={endSession} />;
}
