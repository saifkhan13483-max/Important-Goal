import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, ArrowRight } from "lucide-react";

export default function CheckoutSuccess() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const plan = params.get("plan") || "paid";
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full">
        <div className="w-20 h-20 rounded-full bg-chart-3/15 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-chart-3" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-md gradient-brand flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">SystemForge</span>
        </div>

        <h1 className="text-3xl font-bold mb-3">You're on {planLabel}!</h1>
        <p className="text-muted-foreground text-base mb-2">
          Your payment was successful. Welcome to the {planLabel} plan.
        </p>
        <p className="text-muted-foreground text-sm mb-8">
          You now have access to all {planLabel} features. Let's build something that sticks.
        </p>

        <div className="space-y-3">
          <Link href="/dashboard">
            <Button className="w-full gradient-brand text-white border-0 gap-2">
              Go to my dashboard
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/systems/new">
            <Button variant="outline" className="w-full">
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
      </div>
    </div>
  );
}
