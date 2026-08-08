import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/client/components/ui/button';
import { Card, CardContent, CardHeader } from '@/client/components/ui/card';
import { Input } from '@/client/components/ui/input';

type HrKeyGateProps = {
  onUnlock: (apiKey: string) => void;
};

export function HrKeyGate({ onUnlock }: HrKeyGateProps) {
  const [draftKey, setDraftKey] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = draftKey.trim();
    if (key) onUnlock(key);
  }

  return (
    <main className="grid min-h-dvh place-items-center overflow-hidden bg-[radial-gradient(circle_at_15%_20%,oklch(0.72_0.06_145/0.2),transparent_34%),radial-gradient(circle_at_85%_76%,oklch(0.72_0.08_75/0.14),transparent_28%)] px-4 py-8 sm:px-6">
      <Card
        className="w-full max-w-xl gap-0 rounded-3xl border-primary/15 bg-card/95 py-0 text-center shadow-[0_20px_60px_oklch(0.27_0.04_145/0.1)] backdrop-blur"
        aria-labelledby="hr-key-gate-title"
      >
        <CardHeader className="items-center gap-0 px-6 pt-9 pb-0 sm:px-12 sm:pt-12">
          <div
            className="mb-5 grid size-14 place-items-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg shadow-primary/20"
            aria-hidden="true"
          >
            S
          </div>
          <p className="mb-3 text-[0.7rem] font-bold tracking-[0.16em] text-primary">
            STAUNCH PEOPLE · HR CONSOLE
          </p>
          <h1
            id="hr-key-gate-title"
            className="text-3xl leading-tight font-semibold tracking-[-0.035em] text-balance text-foreground sm:text-4xl"
          >
            Topic instructions
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Add or update HR guidance per handbook topic. The assistant follows
            your guidance over the written policy whenever they conflict.
          </p>
        </CardHeader>

        <CardContent className="px-6 pt-7 pb-9 sm:px-12 sm:pt-8 sm:pb-12">
          <form onSubmit={handleSubmit} className="text-left">
            <label
              htmlFor="hr-api-key"
              className="mb-2 ml-0.5 block text-sm font-semibold"
            >
              HR access key
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Input
                id="hr-api-key"
                name="hr-session-key"
                type="password"
                value={draftKey}
                onChange={event => setDraftKey(event.target.value)}
                placeholder="Enter your HR access key"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                required
                className="h-12 rounded-xl bg-background px-4"
              />
              <Button
                type="submit"
                disabled={!draftKey.trim()}
                className="h-12 rounded-xl px-5 font-semibold"
              >
                Continue
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            </div>
          </form>

          <p className="mt-5 flex items-start justify-center gap-2 text-xs leading-5 text-muted-foreground">
            <ShieldCheck
              className="mt-0.5 shrink-0 text-primary"
              data-icon="inline-start"
              aria-hidden="true"
            />
            <span>
              Your key stays in this tab’s memory only and is cleared when you
              leave or end the session.
            </span>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
