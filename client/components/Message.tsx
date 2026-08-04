import { isToolUIPart, type UIMessagePart } from 'ai';
import {
  Brain,
  ChevronDown,
  ExternalLink,
  FileText,
  LoaderCircle,
  Paperclip,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ToolActivity } from './ActivityTimeline';
import type { HandbookMessage, HandbookTools } from './chat-types';
import { Badge } from './ui/badge';
import { Bubble, BubbleContent } from './ui/bubble';
import { Marker, MarkerContent, MarkerIcon } from './ui/marker';
import {
  Message as MessagePrimitive,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from './ui/message';

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

function ReasoningSummary({
  text,
  active,
}: {
  text: string;
  active: boolean;
}) {
  if (!text.trim()) return null;

  return (
    <details className="group max-w-xl" open={active}>
      <Marker asChild variant="border">
        <summary className="cursor-pointer list-none py-1 [&::-webkit-details-marker]:hidden">
          <MarkerIcon>
            <Brain />
          </MarkerIcon>
          <MarkerContent className="flex flex-1 items-center gap-2">
            <span>{active ? 'Thinking through the policy' : 'Reasoning summary'}</span>
            <ChevronDown className="ml-auto transition-transform group-open:rotate-180" />
          </MarkerContent>
        </summary>
      </Marker>
      <p className="mt-2 max-w-prose pl-6 text-xs leading-5 whitespace-pre-wrap text-muted-foreground">
        {text}
      </p>
    </details>
  );
}

function ContentPart({
  part,
  active,
  isUser,
}: {
  part: HandbookPart;
  active: boolean;
  isUser: boolean;
}) {
  if (isToolUIPart(part)) {
    return <ToolActivity part={part} />;
  }
  if (part.type === 'step-start') return null;

  switch (part.type) {
    case 'text':
      return part.text ? (
        <Bubble
          align={isUser ? 'end' : 'start'}
          className={isUser ? 'max-w-[92%] sm:max-w-[86%]' : 'max-w-full'}
          variant={isUser ? 'secondary' : 'ghost'}
        >
          <BubbleContent>
            <div className="text-sm leading-7 break-words text-foreground/90 sm:text-[0.95rem] [&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_blockquote]:my-3 [&_blockquote]:border-l-3 [&_blockquote]:border-primary [&_blockquote]:py-0.5 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:font-semibold [&_li+li]:mt-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-foreground [&_pre]:p-3 [&_pre]:text-background [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6">
              <Markdown>{part.text}</Markdown>
              {active && (
                <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" aria-hidden="true" />
              )}
            </div>
          </BubbleContent>
        </Bubble>
      ) : null;

    case 'reasoning':
      return <ReasoningSummary active={active} text={part.text} />;

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
  const isUser = message.role === 'user';
  const lastVisiblePartIndex = message.parts.findLastIndex(
    part =>
      part.type !== 'step-start' &&
      !(part.type === 'text' && part.text.length === 0),
  );

  return (
    <MessagePrimitive
      align={isUser ? 'end' : 'start'}
      aria-label={`${isUser ? 'You' : 'Handbook assistant'} said`}
      role="article"
    >
      {!isUser && (
        <MessageAvatar
          className="grid size-8 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground sm:size-9"
          aria-hidden="true"
        >
          S
        </MessageAvatar>
      )}
      <MessageContent
        className={
          isUser
            ? 'items-end'
            : 'max-w-[calc(100%_-_2.625rem)] sm:max-w-[min(42.5rem,calc(100%_-_3rem))]'
        }
      >
        <MessageHeader>
          {isUser ? 'You' : 'Handbook assistant'}
        </MessageHeader>
        {message.parts.map((part, index) => (
          <ContentPart
            active={active && index === lastVisiblePartIndex}
            isUser={isUser}
            part={part}
            key={`${message.id}-${index}`}
          />
        ))}
      </MessageContent>
    </MessagePrimitive>
  );
}

export function ProcessingMessage() {
  return (
    <MessagePrimitive
      align="start"
      aria-label="Handbook assistant is processing"
      role="status"
    >
      <MessageAvatar
        className="grid size-8 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground sm:size-9"
        aria-hidden="true"
      >
        S
      </MessageAvatar>
      <MessageContent className="max-w-[calc(100%_-_2.625rem)] sm:max-w-[min(42.5rem,calc(100%_-_3rem))]">
        <MessageHeader>Handbook assistant</MessageHeader>
        <Marker variant="border">
          <MarkerIcon>
            <LoaderCircle className="animate-spin" />
          </MarkerIcon>
          <MarkerContent className="shimmer">
            Understanding your question
          </MarkerContent>
        </Marker>
      </MessageContent>
    </MessagePrimitive>
  );
}
