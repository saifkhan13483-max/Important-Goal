import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/auth.store";
import * as UserService from "@/services/user.service";
import type { PlanTier } from "@/types/schema";
import { useQueryClient } from "@tanstack/react-query";

export default function CheckoutSuccess() {
  const [locationPath] = useLocation();
  const params = new URLSearchParams(locationPath.split("?")[1] || "");
  const plan = (params.get("plan") || "starter") as PlanTier;
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  const { user, setUser } = useAppStore();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function savePlan() {
      if (!user?.id) {
        setSaving(false);
        return;
      }
      try {
        const updated = await UserService.updateUser(user.id, {
          plan,
          planUpdatedAt: new Date().toISOString(),
        });
        setUser(updated);
        qc.invalidateQueries({ queryKey: ["user", user.id] });
        setSaved(true);
      } catch {
        // non-fatal — plan will sync on next login
      } finally {
        setSaving(false);
      }
    }
    savePlan();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full">
        {saving ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-muted-foreground text-sm">Confirming your subscription…</p>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-chart-3/15 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-chart-3" />
            </div>

            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md gradient-brand flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-sm tracking-tight">SystemForge</span>
            </div>

            <h1 className="text-3xl font-bold mb-3" data-testid="text-checkout-success-heading">
              You're on {planLabel}!
            </h1>
            <p className="text-muted-foreground text-base mb-2">
              Your payment was successful. Welcome to the {planLabel} plan.
            </p>
            <p className="text-muted-foreground text-sm mb-8">
              You now have access to all {planLabel} features. Let's build something that sticks.
            </p>

            {!saved && !user?.id && (
              <div className="mb-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                Sign in to your account — your {planLabel} plan will be applied automatically.
              </div>
            )}

            <div className="space-y-3">
              <Link href="/dashboard">
                <Button
                  className="w-full gradient-brand text-white border-0 gap-2"
                  data-testid="button-goto-dashboard"
                >
                  Go to my dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/systems/new">
                <Button variant="outline" className="w-full" data-testid="button-build-system">
                  Build my first system
                </Button>
              </Link>
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              A receipt has been sent to your email by Stripe.{" "}
              <a
                href="mailto:support@systemforge.app"
                className="underline hover:text-foreground transition-colors"
              >
                Need help?
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
