/** @jsxImportSource react */
import { isToolUIPart, type UIMessagePart } from 'ai';
import { ExternalLink, FileText, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ActivityTimeline } from './ActivityTimeline';
import {
  type ActivityPart,
  type HandbookMessage,
  type HandbookTools,
} from './chat-types';
import { Badge } from './ui/badge';

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
        a: ({ children: linkChildren, href }) => {
          const safeHref = href ? safeSourceUrl(href) : undefined;
          return safeHref ? (
            <a
              className="font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
              href={safeHref}
              target="_blank"
              rel="noreferrer noopener"
            >
              {linkChildren}
            </a>
          ) : (
            <span>{linkChildren}</span>
          );
        },
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
        <div className="text-sm leading-7 break-words text-foreground/90 sm:text-[0.95rem] [&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_blockquote]:my-3 [&_blockquote]:border-l-3 [&_blockquote]:border-amber-400 [&_blockquote]:py-0.5 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:font-semibold [&_li+li]:mt-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-foreground [&_pre]:p-3 [&_pre]:text-background [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6">
          <Markdown>{part.text}</Markdown>
        </div>
      ) : null;

    // Reasoning and reasoning files are intentionally never rendered.
    case 'reasoning':
    case 'reasoning-file':
      return null;

    case 'file':
      return (
        <Badge
          variant="outline"
          className="mt-2 gap-1.5 rounded-lg bg-card py-1.5 text-muted-foreground"
        >
          <Paperclip aria-hidden="true" />
          {part.filename ?? 'Attachment'}
        </Badge>
      );

    case 'source-url': {
      const url = safeSourceUrl(part.url);
      return url ? (
        <Badge
          asChild
          variant="outline"
          className="mt-2 rounded-lg bg-card py-1.5 text-primary hover:bg-accent"
        >
          <a href={url} target="_blank" rel="noreferrer noopener">
            <ExternalLink aria-hidden="true" />
            {part.title ?? 'Policy source'}
          </a>
        </Badge>
      ) : null;
    }

    case 'source-document':
      return (
        <Badge
          variant="outline"
          className="mt-2 gap-1.5 rounded-lg bg-card py-1.5 text-muted-foreground"
        >
          <FileText aria-hidden="true" />
          Source: {part.title || 'Handbook document'}
        </Badge>
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
      className={`flex items-start gap-2.5 sm:gap-3.5 ${isUser ? 'justify-end' : ''}`}
      aria-label={`${isUser ? 'You' : 'Handbook assistant'} said`}
    >
      {!isUser && (
        <div
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground sm:size-9 sm:rounded-[0.65rem]"
          aria-hidden="true"
        >
          S
        </div>
      )}
      <div
        className={`min-w-0 ${isUser ? 'max-w-[92%] sm:max-w-[86%]' : 'max-w-[calc(100%_-_2.625rem)] sm:max-w-[min(42.5rem,calc(100%_-_3rem))]'}`}
      >
        <div
          className={`mb-1.5 px-0.5 text-[0.7rem] font-bold tracking-wide text-muted-foreground ${isUser ? 'text-right' : ''}`}
        >
          {isUser ? 'You' : 'Handbook assistant'}
        </div>
        <div
          className={
            isUser
              ? 'rounded-2xl rounded-br-sm bg-secondary px-4 py-2.5'
              : 'min-w-0'
          }
        >
          {message.parts.map((part, index) => (
            <ContentPart part={part} key={`${message.id}-${index}`} />
          ))}
          <ActivityTimeline parts={activityParts} active={active} />
        </div>
      </div>
    </article>
  );
}
