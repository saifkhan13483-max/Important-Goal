/**
 * empty-state.tsx — Reusable empty state component
 *
 * Displayed when a list or data view has no items. Provides a consistent
 * visual treatment across all pages (Goals, Systems, Check-ins, etc.)
 * with an optional icon, title, description, and call-to-action.
 */

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6",
        className
      )}
      data-testid="empty-state"
    >
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-5 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-5">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
