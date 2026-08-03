/** @jsxImportSource react */
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiKeyGate } from './components/ApiKeyGate';
import { Composer } from './components/Composer';
import { Message } from './components/Message';
import type { HandbookMessage } from './components/chat-types';

const EXAMPLE_QUESTIONS = [
  {
    icon: '◷',
    label: 'Leave & time off',
    question: 'How many annual leave days do I get, and how do I request them?',
  },
  {
    icon: '⌂',
    label: 'Remote work',
    question: 'When am I eligible to work from home, and which days apply?',
  },
  {
    icon: '♡',
    label: 'Benefits',
    question: 'What medical and employee benefits are available to me?',
  },
  {
    icon: '◎',
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
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Handbook assistant home">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>
            <strong>Handbook</strong>
            <small>Employee assistant</small>
          </span>
        </a>
        <div className="topbar__actions">
          <span className={`connection connection--${isBusy ? 'busy' : 'ready'}`}>
            <span aria-hidden="true" />
            {isBusy ? 'Working' : 'Secure session'}
          </span>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              void stop();
              onEndSession();
            }}
          >
            End session
          </button>
        </div>
      </header>

      <main className="chat-main">
        {visibleMessages.length === 0 ? (
          <section className="empty-state" aria-labelledby="empty-title">
            <p className="eyebrow">EMPLOYEE HANDBOOK</p>
            <h1 id="empty-title">What can I help you find?</h1>
            <p>
              Ask a question in your own words. I’ll review the relevant
              handbook policies and flag anything that needs HR confirmation.
            </p>
            <div className="example-grid">
              {EXAMPLE_QUESTIONS.map(example => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => submitQuestion(example.question)}
                >
                  <span className="example-icon" aria-hidden="true">
                    {example.icon}
                  </span>
                  <span>
                    <strong>{example.label}</strong>
                    <small>{example.question}</small>
                  </span>
                  <span className="example-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section
            className="conversation"
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
              <div className="pending-response" role="status">
                <span className="message__avatar" aria-hidden="true">
                  S
                </span>
                <span className="typing-dots" aria-label="Preparing an answer">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            )}

            {error && (
              <div className="error-banner" role="alert">
                <div>
                  <strong>We couldn’t complete that request.</strong>
                  <span>
                    Check your connection or API key, then try again.
                  </span>
                </div>
                <div className="error-banner__actions">
                  <button
                    type="button"
                    onClick={() => void regenerate()}
                    disabled={!canRegenerate}
                  >
                    Try again
                  </button>
                  <button type="button" onClick={clearError}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {canRegenerate && !error && (
              <div className="conversation__actions">
                <button type="button" onClick={() => void regenerate()}>
                  <span aria-hidden="true">↻</span>
                  Regenerate answer
                </button>
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </section>
        )}
      </main>

      <footer className="composer-dock">
        <div className="composer-wrap">
          <div className="status-line" aria-live="polite" aria-atomic="true">
            <span className={isBusy ? 'status-pulse' : undefined} aria-hidden="true" />
            {statusCopy(status)}
          </div>
          <Composer
            input={input}
            status={status}
            onInputChange={setInput}
            onSubmit={() => submitQuestion()}
            onStop={() => void stop()}
          />
          <p className="disclaimer">
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
