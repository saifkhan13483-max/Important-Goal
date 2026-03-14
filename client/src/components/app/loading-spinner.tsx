/**
 * loading-spinner.tsx — Full-page and inline loading spinner
 *
 * Used for auth initialization and async data loading states.
 * Provides two variants: full-page (centered in viewport) and inline.
 */

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  fullPage?: boolean;
  message?: string;
  className?: string;
}

export function LoadingSpinner({ fullPage = false, message, className }: LoadingSpinnerProps) {
  if (fullPage) {
    return (
      <div
        className="flex items-center justify-center min-h-screen bg-background"
        data-testid="loading-spinner-fullpage"
      >
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          {message && <p className="text-sm">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center justify-center py-8", className)}
      data-testid="loading-spinner"
    >
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );
}
