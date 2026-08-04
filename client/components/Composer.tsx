import { Send, Square } from 'lucide-react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

type ComposerProps = {
  input: string;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
};

export function Composer({
  input,
  status,
  onInputChange,
  onSubmit,
  onStop,
}: ComposerProps) {
  const isBusy = status === 'submitted' || status === 'streaming';
  const canSend = input.trim().length > 0 && status === 'ready';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSend) onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      if (canSend) onSubmit();
    }
  }

  return (
    <form
      className="rounded-2xl border bg-card px-3 pt-2.5 pb-2.5 shadow-[0_12px_36px_oklch(0.27_0.03_145/0.11)] transition-[border-color,box-shadow] focus-within:border-primary/55 focus-within:shadow-[0_0_0_4px_oklch(0.4_0.075_155/0.08),0_12px_36px_oklch(0.27_0.03_145/0.11)] sm:px-4"
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor="handbook-question">
        Ask a handbook question
      </label>
      <Textarea
        id="handbook-question"
        value={input}
        onChange={event => onInputChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about leave, benefits, attendance, conduct…"
        rows={1}
        aria-describedby="composer-help"
        className="max-h-40 min-h-9 resize-y border-0 bg-transparent px-0.5 py-1 text-[0.95rem] leading-6 shadow-none focus-visible:border-transparent focus-visible:ring-0"
      />
      <div className="mt-1 flex items-center justify-end gap-3 sm:justify-between">
        <span
          id="composer-help"
          className="hidden text-[0.65rem] text-muted-foreground/75 sm:inline"
        >
          Enter to send · Shift + Enter for a new line
        </span>
        {isBusy ? (
          <Button
            variant="destructive"
            size="sm"
            type="button"
            onClick={onStop}
          >
            <Square data-icon="inline-start" className="fill-current" aria-hidden="true" />
            Stop
          </Button>
        ) : (
          <Button
            size="sm"
            type="submit"
            disabled={!canSend}
            aria-label="Send question"
            className="rounded-lg px-3"
          >
            Send
            <Send data-icon="inline-end" aria-hidden="true" />
          </Button>
        )}
      </div>
    </form>
  );
}
