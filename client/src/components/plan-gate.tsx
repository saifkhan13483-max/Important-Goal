import { Link } from "wouter";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlanTier } from "@/types/schema";
import { planDisplayName } from "@/lib/plan-limits";

interface PlanGateProps {
  requiredPlan: PlanTier;
  featureLabel: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

export function PlanGate({ requiredPlan, featureLabel, description, className, compact = false }: PlanGateProps) {
  const planName = planDisplayName(requiredPlan);

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-muted/30",
          className,
        )}
        data-testid="plan-gate-compact"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Lock className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">{featureLabel}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Available on <span className="font-semibold text-primary">{planName}</span> and above
          </p>
        </div>
        <Link href="/pricing">
          <Button size="sm" variant="outline" className="flex-shrink-0 gap-1 text-xs" data-testid="button-upgrade-compact">
            Upgrade
            <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 rounded-2xl border border-border/60 bg-muted/20",
        className,
      )}
      data-testid="plan-gate-full"
    >
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <Lock className="w-7 h-7 text-primary" />
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">{planName} Feature</span>
      </div>
      <h3 className="font-bold text-lg mb-2">{featureLabel}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-sm leading-relaxed mb-6">{description}</p>
      )}
      {!description && (
        <p className="text-muted-foreground text-sm max-w-sm leading-relaxed mb-6">
          Upgrade to <span className="font-semibold text-foreground">{planName}</span> to unlock this feature and
          take your habit building to the next level.
        </p>
      )}
      <Link href="/pricing">
        <Button className="gap-2" data-testid="button-upgrade-full">
          <Sparkles className="w-4 h-4" />
          Upgrade to {planName}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>
      <p className="text-xs text-muted-foreground mt-3">No credit card needed to compare plans</p>
    </div>
  );
}

interface LockedOverlayProps {
  requiredPlan: PlanTier;
  label?: string;
  className?: string;
}

export function LockedOverlay({ requiredPlan, label, className }: LockedOverlayProps) {
  const planName = planDisplayName(requiredPlan);
  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl",
        "bg-background/80 backdrop-blur-[2px] border border-border/60",
        className,
      )}
      data-testid="locked-overlay"
    >
      <div className="w-8 h-8 rounded-full bg-muted/80 border border-border flex items-center justify-center">
        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      {label && <p className="text-xs text-muted-foreground font-medium">{label}</p>}
      <Link href="/pricing">
        <button
          className="text-xs font-semibold text-primary hover:underline"
          data-testid="button-locked-upgrade"
        >
          Upgrade to {planName}
        </button>
      </Link>
    </div>
  );
}
