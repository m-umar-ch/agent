/** @jsxImportSource react */
import type { FormEvent, KeyboardEvent } from 'react';

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
    <form className="composer" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="handbook-question">
        Ask a handbook question
      </label>
      <textarea
        id="handbook-question"
        value={input}
        onChange={event => onInputChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about leave, benefits, attendance, conduct…"
        rows={1}
        aria-describedby="composer-help"
      />
      <div className="composer__footer">
        <span id="composer-help">Enter to send · Shift + Enter for a new line</span>
        {isBusy ? (
          <button className="composer__button composer__button--stop" type="button" onClick={onStop}>
            <span className="stop-icon" aria-hidden="true" />
            Stop
          </button>
        ) : (
          <button
            className="composer__button"
            type="submit"
            disabled={!canSend}
            aria-label="Send question"
          >
            <span>Send</span>
            <span aria-hidden="true">↑</span>
          </button>
        )}
      </div>
    </form>
  );
}
