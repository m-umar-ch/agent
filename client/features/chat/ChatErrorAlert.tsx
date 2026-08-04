import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";

type ChatErrorAlertProps = {
  canRetry: boolean;
  error: Error;
  onDismiss: () => void;
  onRetry: () => void;
};

export function getChatErrorCopy(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes("401") || message.includes("unauthorized")) {
    return "Your handbook access key was rejected. End this session and enter a valid key.";
  }
  if (message.includes("429") || message.includes("rate_limit")) {
    return "Too many requests are in progress. Please wait a moment, then try again.";
  }
  if (
    message.includes("413") ||
    message.includes("too_large") ||
    message.includes("payload too large")
  ) {
    return "This message or conversation is too long. Start a new chat or shorten your question.";
  }
  if (message.includes("timeout") || message.includes("abort")) {
    return "The request took too long. Please try again.";
  }

  return "Check your connection, then try again.";
}

export function ChatErrorAlert({
  canRetry,
  error,
  onDismiss,
  onRetry,
}: ChatErrorAlertProps) {
  return (
    <Alert variant="destructive" className="items-center">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>We couldn’t complete that request.</AlertTitle>
      <AlertDescription>
        {getChatErrorCopy(error)}
      </AlertDescription>
      <div className="col-start-2 mt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={onRetry}
          disabled={!canRetry}
        >
          Try again
        </Button>
        <Button variant="ghost" size="sm" type="button" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </Alert>
  );
}
