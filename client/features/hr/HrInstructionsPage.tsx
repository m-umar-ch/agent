import { Check, LogOut, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/client/components/ui/alert';
import { Badge } from '@/client/components/ui/badge';
import { Button } from '@/client/components/ui/button';
import { Textarea } from '@/client/components/ui/textarea';
import {
  fetchHrTopics,
  HrApiError,
  removeTopicInstruction,
  saveTopicInstruction,
  type HrTopic,
} from './api';

const MAX_INSTRUCTION_CHARS = 8_000;

type HrInstructionsPageProps = {
  apiKey: string;
  onEndSession: () => void;
};

function formatUpdatedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function HrInstructionsPage({
  apiKey,
  onEndSession,
}: HrInstructionsPageProps) {
  const [topics, setTopics] = useState<HrTopic[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<'save' | 'remove' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoadError(null);
    fetchHrTopics(apiKey)
      .then(loaded => {
        if (cancelled) return;
        setTopics(loaded);
        setSelectedTool(current => current ?? loaded[0]?.toolName ?? null);
        setDraft(current =>
          current === ''
            ? (loaded[0]?.instruction?.content ?? '')
            : current,
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof HrApiError && error.unauthorized) {
          onEndSession();
          return;
        }
        setLoadError(
          error instanceof Error
            ? error.message
            : 'The topics could not be loaded.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, onEndSession, reloadToken]);

  const selectedTopic =
    topics?.find(topic => topic.toolName === selectedTool) ?? null;
  const savedContent = selectedTopic?.instruction?.content ?? '';
  const isDirty = draft !== savedContent;
  const isBusy = pending !== null;

  function selectTopic(topic: HrTopic) {
    setSelectedTool(topic.toolName);
    setDraft(topic.instruction?.content ?? '');
    setActionError(null);
    setJustSaved(false);
  }

  function updateTopic(toolName: string, update: Partial<HrTopic>) {
    setTopics(current =>
      current === null
        ? current
        : current.map(topic =>
            topic.toolName === toolName ? { ...topic, ...update } : topic,
          ),
    );
  }

  async function runAction(action: 'save' | 'remove') {
    if (selectedTopic === null || isBusy) return;
    setPending(action);
    setActionError(null);
    setJustSaved(false);

    try {
      if (action === 'save') {
        const instruction = await saveTopicInstruction(
          apiKey,
          selectedTopic.toolName,
          draft.trim(),
        );
        updateTopic(selectedTopic.toolName, { instruction });
        setDraft(instruction.content);
        setJustSaved(true);
      } else {
        await removeTopicInstruction(apiKey, selectedTopic.toolName);
        updateTopic(selectedTopic.toolName, { instruction: null });
        setDraft('');
      }
    } catch (error) {
      if (error instanceof HrApiError && error.unauthorized) {
        onEndSession();
        return;
      }
      setActionError(
        error instanceof Error
          ? error.message
          : 'The change could not be saved.',
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:h-[4.5rem] sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm sm:size-10"
            aria-hidden="true"
          >
            S
          </span>
          <span className="flex flex-col">
            <strong className="text-sm leading-tight font-semibold">
              HR console
            </strong>
            <small className="mt-0.5 text-xs text-muted-foreground">
              Topic instructions
            </small>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden rounded-full sm:inline-flex">
            HR-only view
          </Badge>
          <Button variant="ghost" size="sm" type="button" onClick={onEndSession}>
            <LogOut data-icon="inline-start" aria-hidden="true" />
            <span className="hidden sm:inline">End session</span>
            <span className="sr-only sm:hidden">End session</span>
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <p className="mb-6 max-w-3xl text-sm leading-6 text-muted-foreground">
            Guidance saved here reaches the handbook assistant immediately, with
            no code change. When your guidance conflicts with the written
            policy, the assistant follows your guidance and tells the employee
            that HR has updated it.
          </p>

          {loadError !== null && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Could not load topics</AlertTitle>
              <AlertDescription>
                <p>{loadError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setReloadToken(token => token + 1)}
                >
                  <RefreshCw data-icon="inline-start" aria-hidden="true" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {topics === null && loadError === null && (
            <p className="text-sm text-muted-foreground">Loading topics…</p>
          )}

          {topics !== null && (
            <div className="grid gap-6 lg:grid-cols-[minmax(16rem,22rem)_1fr]">
              <nav aria-label="Handbook topics" className="min-w-0">
                <ul className="flex flex-col gap-1.5">
                  {topics.map(topic => (
                    <li key={topic.toolName}>
                      <button
                        type="button"
                        onClick={() => selectTopic(topic)}
                        aria-current={
                          topic.toolName === selectedTool ? 'true' : undefined
                        }
                        className="w-full rounded-xl border border-transparent px-3.5 py-2.5 text-left transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none aria-[current=true]:border-primary/25 aria-[current=true]:bg-primary/5"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {topic.title}
                          </span>
                          {topic.instruction !== null && (
                            <Badge className="shrink-0" variant="secondary">
                              HR guidance
                            </Badge>
                          )}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                          {topic.summary}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              {selectedTopic !== null && (
                <section
                  aria-label={`Instructions for ${selectedTopic.title}`}
                  className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6"
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight">
                      {selectedTopic.title}
                    </h2>
                    <Badge variant="outline" className="rounded-full">
                      {selectedTopic.kind === 'policy' ? 'Policy' : 'Role'}
                    </Badge>
                  </div>
                  <p className="mb-5 text-sm leading-6 text-muted-foreground">
                    {selectedTopic.summary}
                  </p>

                  <label
                    htmlFor="hr-instruction-content"
                    className="mb-2 block text-sm font-semibold"
                  >
                    HR instructions for this topic
                  </label>
                  <Textarea
                    id="hr-instruction-content"
                    value={draft}
                    onChange={event => {
                      setDraft(event.target.value);
                      setJustSaved(false);
                    }}
                    disabled={isBusy}
                    maxLength={MAX_INSTRUCTION_CHARS}
                    rows={10}
                    placeholder="Example: The EOBI contribution split changed in July. Employees now contribute 2% and the company 6%. Use these figures instead of the ones in the policy."
                    className="min-h-52 resize-y rounded-xl bg-background"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {draft.length.toLocaleString()} /{' '}
                    {MAX_INSTRUCTION_CHARS.toLocaleString()} characters. Takes
                    precedence over the written policy on conflict.
                  </p>

                  {actionError !== null && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTitle>Change not saved</AlertTitle>
                      <AlertDescription>
                        <p>{actionError}</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-2.5">
                    <Button
                      type="button"
                      disabled={isBusy || !isDirty || draft.trim() === ''}
                      onClick={() => void runAction('save')}
                    >
                      <Save data-icon="inline-start" aria-hidden="true" />
                      {pending === 'save' ? 'Saving…' : 'Save instructions'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isBusy || selectedTopic.instruction === null}
                      onClick={() => void runAction('remove')}
                    >
                      <Trash2 data-icon="inline-start" aria-hidden="true" />
                      {pending === 'remove' ? 'Removing…' : 'Remove instructions'}
                    </Button>
                    <span
                      className="text-xs text-muted-foreground"
                      aria-live="polite"
                    >
                      {justSaved && (
                        <span className="inline-flex items-center gap-1 text-primary">
                          <Check className="size-3.5" aria-hidden="true" />
                          Saved
                        </span>
                      )}
                      {!justSaved &&
                        selectedTopic.instruction !== null &&
                        `Last updated ${formatUpdatedAt(selectedTopic.instruction.updatedAt)}`}
                      {!justSaved &&
                        selectedTopic.instruction === null &&
                        'No HR instructions yet. The assistant uses the written policy only.'}
                    </span>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
