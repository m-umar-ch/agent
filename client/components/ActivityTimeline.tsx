/** @jsxImportSource react */
import { ChevronDown, Sparkles, TriangleAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  getFriendlyToolName,
  getHrWarningCount,
  getToolStatus,
  type ActivityPart,
  type HandbookToolPart,
} from './chat-types';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

type ActivityTimelineProps = {
  parts: ActivityPart[];
  active: boolean;
};

const TONE_STYLES = {
  working: {
    dot: 'bg-amber-500',
    badge: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  complete: {
    dot: 'bg-emerald-600',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  warning: {
    dot: 'bg-orange-600',
    badge: 'border-orange-200 bg-orange-50 text-orange-800',
  },
  muted: {
    dot: 'bg-muted-foreground/60',
    badge: 'border-border bg-muted text-muted-foreground',
  },
} as const;

function ToolCard({ part }: { part: HandbookToolPart }) {
  const status = getToolStatus(part);
  const warningCount = getHrWarningCount(part);

  return (
    <li className="relative mt-2">
      <span
        className={cn(
          'absolute top-4 -left-[1.14rem] z-10 size-2 rounded-full ring-2 ring-card',
          TONE_STYLES[status.tone].dot,
        )}
        aria-hidden="true"
      />
      <Card className="gap-0 rounded-lg bg-background px-3 py-2.5 shadow-none">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">
            {getFriendlyToolName(part)}
          </span>
          <Badge
            variant="outline"
            className={cn(
              'shrink-0 rounded-full px-1.5 py-0.5 text-[0.625rem]',
              TONE_STYLES[status.tone].badge,
            )}
          >
            {status.label}
          </Badge>
        </div>
        {warningCount > 0 && (
          <p className="mt-1.5 flex items-start gap-1.5 text-[0.7rem] leading-4 text-amber-800">
            <TriangleAlert
              className="mt-0.5 size-3 shrink-0"
              aria-hidden="true"
            />
            {warningCount} {warningCount === 1 ? 'item needs' : 'items need'} HR
            confirmation
          </p>
        )}
      </Card>
    </li>
  );
}

export function ActivityTimeline({
  parts,
  active,
}: ActivityTimelineProps) {
  const toolCount = parts.filter(part => part.type !== 'step-start').length;
  const warningCount = parts.reduce(
    (count, part) =>
      part.type === 'step-start' ? count : count + getHrWarningCount(part),
    0,
  );
  if (toolCount === 0) return null;

  return (
    <details
      className="group mt-3 max-w-xl overflow-hidden rounded-xl border bg-card/75"
      open={active}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
        <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
        <span>{active ? 'Reviewing handbook' : 'Handbook activity'}</span>
        <span className="ml-auto text-[0.7rem] font-normal text-muted-foreground/75">
          {toolCount} {toolCount === 1 ? 'source' : 'sources'}
        </span>
        {warningCount > 0 && (
          <Badge className="rounded-full border-amber-200 bg-amber-50 px-1.5 text-[0.625rem] text-amber-800">
            {warningCount} need HR
          </Badge>
        )}
        <ChevronDown
          className="size-3.5 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <ol className="relative mr-3 mb-3 ml-5 border-l border-border pr-0 pl-3">
        {parts.map((part, index) =>
          part.type === 'step-start' ? (
            index > 0 ? (
              <li
                className="mt-2 text-[0.6rem] font-bold tracking-wider text-muted-foreground/70 uppercase"
                key={`step-${index}`}
              >
                <span>Next review step</span>
              </li>
            ) : null
          ) : (
            <ToolCard part={part} key={part.toolCallId} />
          ),
        )}
      </ol>
    </details>
  );
}
