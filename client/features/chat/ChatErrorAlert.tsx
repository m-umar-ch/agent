import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";

type ChatErrorAlertProps = {
  canRetry: boolean;
  onDismiss: () => void;
  onRetry: () => void;
};

export function ChatErrorAlert({
  canRetry,
  onDismiss,
  onRetry,
}: ChatErrorAlertProps) {
  return (
    <Alert variant="destructive" className="items-center">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>We couldn’t complete that request.</AlertTitle>
      <AlertDescription>
        Check your connection or handbook access key, then try again.
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
