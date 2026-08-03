/** @jsxImportSource react */
import {
  getFriendlyToolName,
  getHrWarningCount,
  getToolStatus,
  type ActivityPart,
  type HandbookToolPart,
} from './chat-types';

type ActivityTimelineProps = {
  parts: ActivityPart[];
  active: boolean;
};

function ToolCard({ part }: { part: HandbookToolPart }) {
  const status = getToolStatus(part);
  const warningCount = getHrWarningCount(part);

  return (
    <li className="activity-item">
      <span className={`activity-dot activity-dot--${status.tone}`} />
      <div className="tool-card">
        <div className="tool-card__heading">
          <span className="tool-card__name">{getFriendlyToolName(part)}</span>
          <span className={`tool-status tool-status--${status.tone}`}>
            {status.label}
          </span>
        </div>
        {warningCount > 0 && (
          <p className="tool-card__warning">
            {warningCount} {warningCount === 1 ? 'item needs' : 'items need'} HR
            confirmation
          </p>
        )}
      </div>
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
    <details className="activity" open={active}>
      <summary>
        <span className="activity__summary-icon" aria-hidden="true">
          ✦
        </span>
        <span>{active ? 'Reviewing handbook' : 'Handbook activity'}</span>
        <span className="activity__count">
          {toolCount} {toolCount === 1 ? 'source' : 'sources'}
        </span>
        {warningCount > 0 && (
          <span className="activity__warning-count">
            {warningCount} need HR
          </span>
        )}
      </summary>
      <ol className="activity-list">
        {parts.map((part, index) =>
          part.type === 'step-start' ? (
            index > 0 ? (
              <li className="activity-step" key={`step-${index}`}>
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
