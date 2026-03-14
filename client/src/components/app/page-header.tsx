/**
 * page-header.tsx — Reusable page-level header component
 *
 * Used at the top of each authenticated page to provide a consistent
 * title, optional description, and an optional actions slot (e.g. a button).
 */

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight text-foreground"
          data-testid="text-page-title"
        >
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
