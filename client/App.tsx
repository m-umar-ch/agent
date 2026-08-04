import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isToolUIPart } from 'ai';
import { RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApiKeyGate } from './components/ApiKeyGate';
import { Composer } from './components/Composer';
import { Message, ProcessingMessage } from './components/Message';
import { Button } from './components/ui/button';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from './components/ui/message-scroller';
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
  const latestMessage = visibleMessages.at(-1);
  const hasAssistantProgress =
    latestMessage?.role === 'assistant' &&
    latestMessage.parts.some(
      part =>
        isToolUIPart(part) ||
        ((part.type === 'text' || part.type === 'reasoning') &&
          part.text.trim().length > 0),
    );
  const showProcessing = isBusy && !hasAssistantProgress;

  function submitQuestion(question = input) {
    const trimmed = question.trim();
    if (!trimmed || status !== 'ready') return;
    setInput('');
    void sendMessage({ text: trimmed });
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <ChatHeader
        isBusy={isBusy}
        onEndSession={() => {
          void stop();
          onEndSession();
        }}
      />

      <main className="min-h-0 flex-1">
        {visibleMessages.length === 0 ? (
          <div className="mx-auto w-full max-w-[52.5rem] px-4 pt-7 pb-5 sm:px-6 sm:pt-10">
            <EmptyState disabled={isBusy} onSelect={submitQuestion} />
          </div>
        ) : (
          <MessageScrollerProvider autoScroll defaultScrollPosition="end">
            <MessageScroller>
              <MessageScrollerViewport aria-label="Conversation">
                <MessageScrollerContent
                  className="mx-auto w-full max-w-[52.5rem] gap-7 px-4 pt-8 pb-8 sm:gap-8 sm:px-6 sm:pt-10"
                  aria-busy={isBusy}
                  aria-live="polite"
                  aria-relevant="additions text"
                  role="log"
                >
                  {visibleMessages.map((message, index) => (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      scrollAnchor={message.role === 'user'}
                    >
                      <Message
                        message={message}
                        active={
                          isBusy &&
                          message.role === 'assistant' &&
                          index === visibleMessages.length - 1
                        }
                      />
                    </MessageScrollerItem>
                  ))}

                  {showProcessing && (
                    <MessageScrollerItem
                      messageId={`processing-${latestMessage?.id ?? 'new'}`}
                    >
                      <ProcessingMessage />
                    </MessageScrollerItem>
                  )}

                  {error && (
                    <MessageScrollerItem messageId="chat-error">
                      <ChatErrorAlert
                        canRetry={canRegenerate}
                        error={error}
                        onDismiss={clearError}
                        onRetry={() => void regenerate()}
                      />
                    </MessageScrollerItem>
                  )}

                  {canRegenerate && !error && (
                    <MessageScrollerItem messageId="regenerate-answer">
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => void regenerate()}
                        >
                          <RefreshCw
                            data-icon="inline-start"
                            aria-hidden="true"
                          />
                          Regenerate answer
                        </Button>
                      </div>
                    </MessageScrollerItem>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        )}
      </main>

      <footer className="shrink-0 border-t bg-background px-2.5 pt-2 pb-2.5 sm:px-5 sm:pb-4">
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
