/** @jsxImportSource react */
import { isToolUIPart, type UIMessagePart } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ActivityTimeline } from './ActivityTimeline';
import {
  type ActivityPart,
  type HandbookMessage,
  type HandbookTools,
} from './chat-types';

type MessageProps = {
  message: HandbookMessage;
  active: boolean;
};

type HandbookPart = UIMessagePart<Record<string, unknown>, HandbookTools>;

function safeSourceUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
}

function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        img: () => null,
        a: ({ children: linkChildren, ...props }) => (
          <a {...props} target="_blank" rel="noreferrer noopener">
            {linkChildren}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

function ContentPart({ part }: { part: HandbookPart }) {
  if (isToolUIPart(part) || part.type === 'step-start') return null;

  switch (part.type) {
    case 'text':
      return part.text ? (
        <div className="markdown">
          <Markdown>{part.text}</Markdown>
        </div>
      ) : null;

    // Reasoning and reasoning files are intentionally never rendered.
    case 'reasoning':
    case 'reasoning-file':
      return null;

    case 'file':
      return (
        <span className="attachment">
          <span aria-hidden="true">▱</span>
          {part.filename ?? 'Attachment'}
        </span>
      );

    case 'source-url': {
      const url = safeSourceUrl(part.url);
      return url ? (
        <a
          className="source-link"
          href={url}
          target="_blank"
          rel="noreferrer noopener"
        >
          {part.title ?? 'Policy source'}
        </a>
      ) : null;
    }

    case 'source-document':
      return (
        <span className="source-document">
          Source: {part.title || 'Handbook document'}
        </span>
      );

    // Custom provider content and data parts are not employee-facing content.
    // Keeping them hidden also prevents accidental exposure of structured data.
    case 'custom':
      return null;

    default:
      return null;
  }
}

export function Message({ message, active }: MessageProps) {
  const activityParts: ActivityPart[] = [];
  for (const part of message.parts) {
    if (part.type === 'step-start' || isToolUIPart(part)) {
      activityParts.push(part as ActivityPart);
    }
  }

  const isUser = message.role === 'user';

  return (
    <article
      className={`message message--${isUser ? 'user' : 'assistant'}`}
      aria-label={`${isUser ? 'You' : 'Handbook assistant'} said`}
    >
      {!isUser && (
        <div className="message__avatar" aria-hidden="true">
          S
        </div>
      )}
      <div className="message__body">
        <div className="message__label">
          {isUser ? 'You' : 'Handbook assistant'}
        </div>
        <div className="message__content">
          {message.parts.map((part, index) => (
            <ContentPart part={part} key={`${message.id}-${index}`} />
          ))}
          <ActivityTimeline parts={activityParts} active={active} />
        </div>
      </div>
    </article>
  );
}
