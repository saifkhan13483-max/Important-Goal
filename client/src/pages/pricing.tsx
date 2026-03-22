import { useState } from "react";
import { Link, useLocation } from "wouter";
import { SiteLogo } from "@/components/site-logo";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Sparkles, ChevronDown, ArrowRight, HelpCircle, Loader2, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { PLAN_PAYMENT_LINKS, buildPaymentLinkUrl } from "@/lib/stripe";
import { useAppStore } from "@/store/auth.store";

const plans = [
  {
    name: "Free",
    planKey: "free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    tagline: "Try system-building for the first time",
    idealFor: "Beginners exploring habit tracking",
    badge: null,
    features: [
      "Up to 2 active goals",
      "Up to 3 active systems",
      "Daily check-ins",
      "Basic streak tracking",
      "3 starter templates",
      "Light analytics",
      "Basic journaling",
    ],
    notIncluded: [
      "Full template library",
      "Advanced analytics",
      "Export reports",
      "Priority support",
    ],
    cta: "Start for free",
    ctaVariant: "outline" as const,
    href: "/signup",
  },
  {
    name: "Starter",
    planKey: "starter",
    monthlyPrice: 9,
    yearlyPrice: 7,
    tagline: "Build real consistency",
    idealFor: "Individuals building lasting habits",
    badge: null,
    features: [
      "Up to 10 active goals",
      "Unlimited systems",
      "Full template library",
      "Advanced streak tracking",
      "Weekly reflection prompts",
      "Better analytics",
      "Dark mode",
      "Export basic reports",
    ],
    notIncluded: [
      "Advanced analytics dashboard",
      "Mood correlation insights",
      "CSV/PDF exports",
      "Priority support",
    ],
    cta: "Get Starter",
    ctaVariant: "outline" as const,
  },
  {
    name: "Pro",
    planKey: "pro",
    monthlyPrice: 19,
    yearlyPrice: 15,
    tagline: "Deep insights, unlimited potential",
    idealFor: "Ambitious users who want full control",
    badge: "Most Popular",
    features: [
      "Unlimited goals",
      "Unlimited systems",
      "Advanced analytics dashboard",
      "Mood & habit correlation insights",
      "Premium templates",
      "Advanced journaling",
      "CSV / PDF exports",
      "Priority support",
    ],
    notIncluded: [
      "Multi-user workspace",
      "Team progress overview",
      "AI Coach (unlimited)",
    ],
    cta: "Get Pro",
    ctaVariant: "default" as const,
  },
  {
    name: "Elite",
    planKey: "elite",
    monthlyPrice: 49,
    yearlyPrice: 37,
    tagline: "For serious systems builders",
    idealFor: "Power users & high-performance individuals",
    badge: "Best Value",
    features: [
      "Everything in Pro",
      "Unlimited AI Coach sessions",
      "Multi-user workspace",
      "Team progress overview",
      "Coach dashboard",
      "Custom habit templates",
      "White-glove onboarding",
      "Dedicated support",
    ],
    notIncluded: [],
    cta: "Get Elite",
    ctaVariant: "default" as const,
  },
];

const faqs = [
  {
    q: "Can I switch plans later?",
    a: "Absolutely. You can upgrade, downgrade, or cancel at any time. Changes take effect at the start of your next billing cycle.",
  },
  {
    q: "Is there a free trial for paid plans?",
    a: "All paid plans come with a 14-day money-back guarantee. If you're not happy for any reason, contact us within 14 days for a full refund — no questions asked.",
  },
  {
    q: "What happens to my data if I downgrade?",
    a: "Your data is always safe. If you have more goals or systems than the lower plan allows, existing ones remain accessible — you just can't create new ones until you're within the limit.",
  },
  {
    q: "Does the free plan ever expire?",
    a: "No. The free plan is free forever. There's no time limit, no trial period, and no credit card required.",
  },
  {
    q: "Can I pay yearly?",
    a: "Yes. Choosing yearly billing saves you around 20–25% compared to monthly. You can toggle between monthly and yearly billing on this page.",
  },
  {
    q: "How do I manage or cancel my subscription?",
    a: "After subscribing, you'll receive a Stripe receipt email. You can manage or cancel your subscription at any time from the billing portal — accessible via Settings → Manage Billing in your account.",
  },
];

const comparisonRows = [
  { feature: "Active Goals", free: "2", starter: "10", pro: "Unlimited", elite: "Unlimited" },
  { feature: "Active Systems", free: "3", starter: "Unlimited", pro: "Unlimited", elite: "Unlimited" },
  { feature: "Daily Check-ins", free: true, starter: true, pro: true, elite: true },
  { feature: "Streak Tracking", free: "Basic", starter: "Advanced", pro: "Advanced", elite: "Advanced" },
  { feature: "Templates", free: "3 starter", starter: "Full library", pro: "Premium", elite: "Custom" },
  { feature: "Analytics", free: "Light", starter: "Better", pro: "Advanced", elite: "Advanced" },
  { feature: "Journaling", free: "Basic", starter: true, pro: "Advanced", elite: "Advanced" },
  { feature: "Export Reports", free: false, starter: "Basic", pro: "CSV / PDF", elite: "CSV / PDF" },
  { feature: "Dark Mode", free: false, starter: true, pro: true, elite: true },
  { feature: "Priority Support", free: false, starter: false, pro: true, elite: "Dedicated" },
  { feature: "AI Coach", free: false, starter: false, pro: "Limited", elite: "Unlimited" },
  { feature: "Team Workspace", free: false, starter: false, pro: false, elite: true },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="font-medium text-sm md:text-base leading-snug">{q}</span>
        <ChevronDown className={cn("w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-4 h-4 text-chart-3 mx-auto" />;
  if (value === false) return <span className="text-muted-foreground/40 text-lg mx-auto block text-center">—</span>;
  return <span className="text-sm text-center block">{value}</span>;
}

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAppStore();

  const handlePaidPlanCTA = (plan: typeof plans[number]) => {
    const interval = yearly ? "yearly" : "monthly";
    const links = PLAN_PAYMENT_LINKS[plan.planKey];
    const paymentLink = links?.[interval] || null;

    if (!paymentLink) {
      toast({
        title: "Payment link not configured",
        description: `Contact support to upgrade to ${plan.name}, or try again shortly.`,
        duration: 6000,
      });
      return;
    }

    setLoadingPlan(plan.name);

    const url = buildPaymentLinkUrl(paymentLink, {
      email: user?.email,
      userId: user?.id,
      plan: plan.planKey,
    });

    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Pricing — Free, Starter, Pro & Elite | Strivo</title>
        <link rel="canonical" href="https://strivo.life/pricing" />
        <meta name="description" content="Simple, transparent pricing for every level. Start free, upgrade when you're ready. Strivo Starter ($9/mo), Pro ($19/mo), and Elite ($49/mo) plans." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://strivo.life/pricing" />
        <meta property="og:site_name" content="Strivo" />
        <meta property="og:title" content="Pricing — Free, Starter, Pro & Elite | Strivo" />
        <meta property="og:description" content="Simple, transparent pricing for every level. Start free — upgrade when you need more. Free, Starter, Pro, and Elite plans available." />
        <meta property="og:image" content="https://strivo.life/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@strivoapp" />
        <meta name="twitter:title" content="Pricing — Free, Starter, Pro & Elite | Strivo" />
        <meta name="twitter:description" content="Simple, transparent pricing for Strivo. Start free — upgrade when you're ready." />
        <meta name="twitter:image" content="https://strivo.life/og-image.png" />
      </Helmet>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <SiteLogo className="h-9" />
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="gap-1.5">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pt-28 pb-24">
        {/* Header */}
        <div className="text-center mb-14">
          <Badge variant="secondary" className="mb-4 text-xs">Simple, transparent pricing</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Start free. Upgrade when you're ready.</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            No tricks. No hidden fees. The free plan is free forever. Upgrade only when you need more.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 bg-muted rounded-xl p-1">
            <button
              onClick={() => setYearly(false)}
              data-testid="button-billing-monthly"
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                !yearly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              data-testid="button-billing-yearly"
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                yearly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              Yearly
              <Badge className="text-xs px-1.5 py-0 bg-chart-3/20 text-chart-3 border-0">Save 20%</Badge>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {plans.map((plan) => {
            const isElite = plan.planKey === "elite";
            const isPro = plan.badge === "Most Popular";
            const price = plan.monthlyPrice === 0
              ? "$0"
              : yearly
              ? `$${plan.yearlyPrice}`
              : `$${plan.monthlyPrice}`;

            return (
              <Card
                key={plan.name}
                className={cn(
                  "relative flex flex-col border-border/60 hover-elevate",
                  isPro && "border-primary/40 ring-1 ring-primary/20 shadow-md",
                  isElite && "border-amber-400/40 ring-1 ring-amber-400/20 shadow-md",
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge
                      className={cn(
                        "text-white border-0 px-3 py-0.5 text-xs shadow-sm",
                        isElite ? "bg-amber-500" : "gradient-brand",
                      )}
                    >
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="mb-5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {isElite && <Crown className="w-4 h-4 text-amber-500" />}
                      <p className="font-bold text-base">{plan.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{plan.idealFor}</p>
                    <p className="text-xs text-muted-foreground/70 mb-4 italic">{plan.tagline}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold">{price}</span>
                      {plan.monthlyPrice > 0 && (
                        <span className="text-sm text-muted-foreground">/month</span>
                      )}
                    </div>
                    {yearly && plan.monthlyPrice > 0 && (
                      <p className="text-xs text-chart-3 font-medium mt-1">billed annually</p>
                    )}
                    {plan.monthlyPrice === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">free forever</p>
                    )}
                  </div>

                  <div className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2">
                        <Check className={cn("w-4 h-4 flex-shrink-0 mt-0.5", isElite ? "text-amber-500" : "text-chart-3")} />
                        <span className="text-sm text-foreground leading-snug">{feature}</span>
                      </div>
                    ))}
                    {plan.notIncluded.map((feature) => (
                      <div key={feature} className="flex items-start gap-2 opacity-40">
                        <span className="w-4 h-4 flex-shrink-0 mt-0.5 text-center text-xs leading-none">—</span>
                        <span className="text-sm text-muted-foreground leading-snug line-through">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {plan.monthlyPrice === 0 ? (
                    <Link href="/signup">
                      <Button
                        variant={plan.ctaVariant}
                        className="w-full"
                        data-testid="button-pricing-free"
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  ) : (
                    <div>
                      <Button
                        variant={plan.ctaVariant}
                        className={cn(
                          "w-full",
                          isPro && "gradient-brand text-white border-0 hover:opacity-90",
                          isElite && "bg-amber-500 hover:bg-amber-600 text-white border-0",
                        )}
                        data-testid={`button-pricing-${plan.planKey}`}
                        onClick={() => handlePaidPlanCTA(plan)}
                        disabled={loadingPlan === plan.name}
                      >
                        {loadingPlan === plan.name ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Redirecting…
                          </>
                        ) : (
                          plan.cta
                        )}
                      </Button>
                      <p className="text-center text-xs text-muted-foreground mt-2">
                        Powered by Stripe · Secure checkout
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Comparison table */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-2">Compare all plans</h2>
          <p className="text-muted-foreground text-center text-sm mb-8">See exactly what's included in each plan.</p>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-4 font-semibold text-sm w-1/4">Feature</th>
                  {plans.map(p => (
                    <th key={p.name} className={cn("text-center p-4 font-semibold text-sm",
                      p.badge === "Most Popular" && "text-primary",
                      p.planKey === "elite" && "text-amber-600 dark:text-amber-400",
                    )}>
                      {p.name}
                      {p.badge && (
                        <Badge className={cn("ml-1 text-xs border-0 px-1.5", p.planKey === "elite" ? "bg-amber-500 text-white" : "gradient-brand text-white")}>
                          {p.planKey === "elite" ? "👑" : "★"}
                        </Badge>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={row.feature} className={cn("border-b border-border/40", i % 2 === 0 && "bg-muted/10")}>
                    <td className="p-4 font-medium text-sm text-foreground">{row.feature}</td>
                    <td className="p-4"><CellValue value={row.free} /></td>
                    <td className="p-4"><CellValue value={row.starter} /></td>
                    <td className="p-4 bg-primary/3"><CellValue value={row.pro} /></td>
                    <td className="p-4 bg-amber-500/5"><CellValue value={row.elite} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Guarantee */}
        <div className="text-center mb-16 p-8 rounded-2xl bg-chart-3/5 border border-chart-3/20">
          <div className="w-12 h-12 rounded-full bg-chart-3/15 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-chart-3" />
          </div>
          <h3 className="text-xl font-bold mb-2">14-day money-back guarantee</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            Try any paid plan risk-free. If you're not happy for any reason in the first 14 days, we'll give you a full refund — no questions asked.
          </p>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">Pricing FAQ</h2>
          <p className="text-muted-foreground text-center text-sm mb-8">Have a question? It's probably answered below.</p>
          <div className="space-y-3 mb-10">
            {faqs.map(faq => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
          <div className="text-center p-6 rounded-2xl bg-muted/30 border border-border/50">
            <HelpCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium mb-1">Still have questions?</p>
            <p className="text-xs text-muted-foreground mb-4">We're happy to help you choose the right plan.</p>
            <Link href="/signup">
              <Button variant="outline" size="sm" className="gap-1.5">
                Start with the free plan
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
            <div>
              <div className="flex items-center mb-3">
                <SiteLogo className="h-7" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Built for people who are tired of starting over.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Product</p>
              <div className="flex flex-col gap-2">
                <Link href="/#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Features</Link>
                <Link href="/#how-it-works" className="text-xs text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
                <Link href="/#templates" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Templates</Link>
                <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Legal</p>
              <div className="flex flex-col gap-2">
                <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
                <a href="mailto:support@strivo.life" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Support</a>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Strivo. All rights reserved.</p>
            <p className="text-xs text-muted-foreground">Not another habit tracker. A system that survives real life.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
