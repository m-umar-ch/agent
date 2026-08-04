import { LogOut, ShieldCheck } from "lucide-react";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";

type ChatHeaderProps = {
  isBusy: boolean;
  onEndSession: () => void;
};

export function ChatHeader({ isBusy, onEndSession }: ChatHeaderProps) {
  return (
    <header className="sticky top-0 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:h-[4.5rem] sm:px-8 lg:px-12">
      <a
        className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        href="#"
        aria-label="Handbook assistant home"
      >
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm sm:size-10"
          aria-hidden="true"
        >
          S
        </span>
        <span className="flex flex-col">
          <strong className="text-sm leading-tight font-semibold">Handbook</strong>
          <small className="mt-0.5 text-xs text-muted-foreground">
            Employee assistant
          </small>
        </span>
      </a>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="hidden rounded-full sm:inline-flex">
          <span
            className="size-1.5 rounded-full bg-primary data-[busy=true]:animate-pulse"
            data-busy={isBusy}
            aria-hidden="true"
          />
          <ShieldCheck data-icon="inline-start" aria-hidden="true" />
          {isBusy ? "Working" : "Secure session"}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={onEndSession}
        >
          <LogOut data-icon="inline-start" aria-hidden="true" />
          <span className="hidden sm:inline">End session</span>
          <span className="sr-only sm:hidden">End session</span>
        </Button>
      </div>
    </header>
  );
}
