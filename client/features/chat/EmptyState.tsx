import { ArrowRight } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { EXAMPLE_QUESTIONS } from "./examples";

type EmptyStateProps = {
  disabled: boolean;
  onSelect: (question: string) => void;
};

export function EmptyState({ disabled, onSelect }: EmptyStateProps) {
  return (
    <section
      className="pt-8 text-center sm:pt-[clamp(2rem,7vh,4.75rem)]"
      aria-labelledby="empty-title"
    >
      <p className="mb-3 text-xs font-bold tracking-[0.16em] text-primary">
        EMPLOYEE HANDBOOK
      </p>
      <h1
        id="empty-title"
        className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl"
      >
        What can I help you find?
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
        Ask a question in your own words. I’ll review the relevant handbook
        policies and flag anything that needs HR confirmation.
      </p>
      <div className="mt-7 grid gap-3 text-left sm:grid-cols-2">
        {EXAMPLE_QUESTIONS.map(({ icon: Icon, label, question }) => (
          <Button
            key={label}
            variant="outline"
            type="button"
            disabled={disabled}
            onClick={() => onSelect(question)}
            className="group h-auto min-h-24 justify-start rounded-2xl bg-card p-4 text-left whitespace-normal shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
              <Icon aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm">{label}</strong>
              <span className="mt-1 block text-xs leading-5 font-normal text-muted-foreground">
                {question}
              </span>
            </span>
            <ArrowRight
              data-icon="inline-end"
              className="self-start text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Button>
        ))}
      </div>
    </section>
  );
}
