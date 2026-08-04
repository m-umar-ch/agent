/** @jsxImportSource react */
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  ArrowRight,
  Clock3,
  Focus,
  HeartPulse,
  House,
  LogOut,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiKeyGate } from './components/ApiKeyGate';
import { Composer } from './components/Composer';
import { Message } from './components/Message';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import type { HandbookMessage } from './components/chat-types';

const EXAMPLE_QUESTIONS = [
  {
    icon: Clock3,
    label: 'Leave & time off',
    question: 'How many annual leave days do I get, and how do I request them?',
  },
  {
    icon: House,
    label: 'Remote work',
    question: 'When am I eligible to work from home, and which days apply?',
  },
  {
    icon: HeartPulse,
    label: 'Benefits',
    question: 'What medical and employee benefits are available to me?',
  },
  {
    icon: Focus,
    label: 'Focus hours',
    question: 'What are focus hours, and which meetings are restricted?',
  },
] as const;

function statusCopy(status: 'submitted' | 'streaming' | 'ready' | 'error') {
  switch (status) {
    case 'submitted':
      return 'Connecting to the handbook…';
    case 'streaming':
      return 'Reviewing relevant policies…';
    case 'error':
      return 'The last request did not complete.';
    case 'ready':
      return 'Ready for your question.';
  }
}

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
  }, [messages, status]);

  function submitQuestion(question = input) {
    const trimmed = question.trim();
    if (!trimmed || status !== 'ready') return;
    setInput('');
    void sendMessage({ text: trimmed });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[linear-gradient(oklch(0.975_0.008_92/0.92),oklch(0.975_0.008_92/0.92)),radial-gradient(circle_at_20%_0%,oklch(0.88_0.04_145),transparent_42%)]">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-foreground/10 bg-background/85 px-4 backdrop-blur-xl sm:h-[4.5rem] sm:px-8 lg:px-12">
        <a
          className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          href="#"
          aria-label="Handbook assistant home"
        >
          <span
            className="grid size-9 shrink-0 place-items-center rounded-[0.65rem] bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 sm:size-10"
            aria-hidden="true"
          >
            S
          </span>
          <span className="flex flex-col">
            <strong className="text-sm leading-tight font-semibold sm:text-[0.95rem]">
              Handbook
            </strong>
            <small className="mt-0.5 text-[0.65rem] text-muted-foreground">
              Employee assistant
            </small>
          </span>
        </a>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Badge
            variant="outline"
            className="hidden rounded-full bg-card/60 py-1 text-muted-foreground sm:inline-flex"
          >
            <span
              className={`size-1.5 rounded-full ${isBusy ? 'animate-pulse bg-amber-500' : 'bg-emerald-600'}`}
              aria-hidden="true"
            />
            <ShieldCheck aria-hidden="true" />
            {isBusy ? 'Working' : 'Secure session'}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="text-xs text-muted-foreground"
            onClick={() => {
              void stop();
              onEndSession();
            }}
          >
            <LogOut aria-hidden="true" />
            End session
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[52.5rem] flex-1 px-4 pt-7 pb-5 sm:px-6 sm:pt-10">
        {visibleMessages.length === 0 ? (
          <section
            className="pt-5 text-center sm:pt-[clamp(2rem,7vh,4.75rem)]"
            aria-labelledby="empty-title"
          >
            <p className="mb-3 text-[0.7rem] font-bold tracking-[0.16em] text-primary">
              EMPLOYEE HANDBOOK
            </p>
            <h1
              id="empty-title"
              className="text-3xl leading-tight font-semibold tracking-[-0.035em] text-balance sm:text-4xl"
            >
              What can I help you find?
            </h1>
            <p className="mx-auto mt-4 mb-7 max-w-xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem] sm:leading-7">
              Ask a question in your own words. I’ll review the relevant
              handbook policies and flag anything that needs HR confirmation.
            </p>
            <div className="grid gap-3 text-left sm:grid-cols-2">
              {EXAMPLE_QUESTIONS.map(example => {
                const Icon = example.icon;
                return (
                  <Button
                    key={example.label}
                    variant="outline"
                    type="button"
                    onClick={() => submitQuestion(example.question)}
                    className="group h-auto min-h-[5.75rem] justify-start gap-3 rounded-2xl bg-card/75 p-4 text-left whitespace-normal shadow-none hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-lg hover:shadow-primary/5"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-[0.8rem]">
                        {example.label}
                      </strong>
                      <small className="mt-1 block text-xs leading-5 font-normal text-muted-foreground">
                        {example.question}
                      </small>
                    </span>
                    <ArrowRight
                      className="size-4 self-start text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Button>
                );
              })}
            </div>
          </section>
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
              <Card
                className="flex-row items-start gap-4 rounded-xl border-orange-200 bg-orange-50 px-4 py-3.5 shadow-none max-sm:flex-col"
                role="alert"
              >
                <TriangleAlert
                  className="mt-0.5 size-5 shrink-0 text-orange-700 max-sm:hidden"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm text-orange-950">
                    We couldn’t complete that request.
                  </strong>
                  <span className="mt-0.5 block text-xs leading-5 text-orange-900/70">
                    Check your connection or handbook access key, then try again.
                  </span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => void regenerate()}
                    disabled={!canRegenerate}
                    className="h-8 bg-white text-xs"
                  >
                    Try again
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={clearError}
                    className="h-8 text-xs text-orange-900"
                  >
                    Dismiss
                  </Button>
                </div>
              </Card>
            )}

            {canRegenerate && !error && (
              <div className="-mt-2 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => void regenerate()}
                  className="text-xs text-muted-foreground"
                >
                  <RefreshCw aria-hidden="true" />
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
              className={`size-1.5 rounded-full ${isBusy ? 'animate-pulse bg-amber-500' : 'bg-emerald-700/60'}`}
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
  const [apiKey, setApiKey] = useState('');

  if (!apiKey) {
    return <ApiKeyGate onUnlock={setApiKey} />;
  }

  return <ChatClient apiKey={apiKey} onEndSession={() => setApiKey('')} />;
}
