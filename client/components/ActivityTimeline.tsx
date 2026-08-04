import {
  BookOpenCheck,
  CircleAlert,
  LoaderCircle,
  ShieldX,
} from 'lucide-react';
import { getFriendlyToolName, getToolStatus, type HandbookToolPart } from './chat-types';
import { Badge } from './ui/badge';
import { Marker, MarkerContent, MarkerIcon } from './ui/marker';

function statusIcon(part: HandbookToolPart) {
  const status = getToolStatus(part);

  if (status.tone === 'working') {
    return <LoaderCircle className="animate-spin" />;
  }
  if (status.tone === 'warning') {
    return <CircleAlert />;
  }
  if (status.tone === 'muted') {
    return <ShieldX />;
  }
  return <BookOpenCheck />;
}

export function ToolActivity({ part }: { part: HandbookToolPart }) {
  const status = getToolStatus(part);
  const badgeVariant =
    status.tone === 'warning'
      ? 'destructive'
      : status.tone === 'working'
        ? 'secondary'
        : 'outline';

  return (
    <Marker variant="border" role="status">
      <MarkerIcon>{statusIcon(part)}</MarkerIcon>
      <MarkerContent className="flex flex-1 items-center gap-2">
        <span>{getFriendlyToolName(part)}</span>
        <Badge className="ml-auto" variant={badgeVariant}>
          {status.label}
        </Badge>
      </MarkerContent>
    </Marker>
  );
}
