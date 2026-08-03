/** @jsxImportSource react */
import { useState, type FormEvent } from 'react';

type ApiKeyGateProps = {
  onUnlock: (apiKey: string) => void;
};

export function ApiKeyGate({ onUnlock }: ApiKeyGateProps) {
  const [draftKey, setDraftKey] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = draftKey.trim();
    if (key) onUnlock(key);
  }

  return (
    <main className="key-gate">
      <section className="key-card" aria-labelledby="key-gate-title">
        <div className="brand-mark brand-mark--large" aria-hidden="true">
          S
        </div>
        <p className="eyebrow">STAUNCH PEOPLE</p>
        <h1 id="key-gate-title">Your handbook, made easier</h1>
        <p className="key-card__intro">
          Ask clear, private questions about company policies and get grounded
          answers from the employee handbook.
        </p>

        <form onSubmit={handleSubmit} className="key-form">
          <label htmlFor="api-key">API key</label>
          <div className="key-input-row">
            <input
              id="api-key"
              name="handbook-session-key"
              type="password"
              value={draftKey}
              onChange={event => setDraftKey(event.target.value)}
              placeholder="Enter your API key"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              required
            />
            <button type="submit" disabled={!draftKey.trim()}>
              Continue
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>

        <p className="key-card__privacy">
          <span aria-hidden="true">◇</span>
          Your key stays in this tab’s memory only and is cleared when you
          leave or end the session.
        </p>
      </section>
    </main>
  );
}
