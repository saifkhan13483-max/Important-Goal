import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Sparkles, Target, Zap, CheckSquare, TrendingUp, BookOpen,
  ArrowRight, Star, Check, ChevronDown,
  Flame, LayoutGrid, Lightbulb, Heart, Quote,
  BarChart2, Shield, Brain, Trophy, RefreshCw,
  Play, Calendar, Clock, Users, Menu, X,
  Repeat, Flag, Cog, CircleCheck, PenLine, Copy,
  UserCircle2, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const allFeatures = [
  {
    icon: Target,
    title: "Define what you want to achieve",
    desc: "Set a goal with a category, priority, and timeline. See all your goals in one clear place.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Cog,
    title: "Turn your goal into a daily plan",
    desc: "A guided wizard that builds your habit step by step — no guessing, no overwhelm.",
    color: "bg-chart-2/10 text-chart-2",
  },
  {
    icon: CircleCheck,
    title: "Track how today went in seconds",
    desc: "Mark each habit as done, partial, or missed. Takes less than 10 seconds per habit.",
    color: "bg-chart-3/10 text-chart-3",
  },
  {
    icon: Flame,
    title: "Stay consistent — even when motivation drops",
    desc: "Chain Calendar shows your unbroken run of days. Consistency alerts warn you before a slump hits, so your system carries you when motivation doesn't.",
    color: "bg-chart-4/10 text-chart-4",
  },
  {
    icon: BarChart2,
    title: "See what's working",
    desc: "Simple charts and plain-language insights — no confusing dashboards, just clarity.",
    color: "bg-chart-5/10 text-chart-5",
  },
  {
    icon: PenLine,
    title: "Reflect on your progress",
    desc: "Daily, weekly, and freeform journaling with prompts to help you grow faster.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Copy,
    title: "Start with proven systems",
    desc: "Pre-built habit plans for fitness, study, wellness, morning routines, and more.",
    color: "bg-chart-2/10 text-chart-2",
  },
  {
    icon: RefreshCw,
    title: "Bounce back when life gets in the way",
    desc: "Recovery Flow guides you after a missed day. Tomorrow Intention lets you pre-commit to the next one. Broken streaks don't have to become broken habits.",
    color: "bg-chart-3/10 text-chart-3",
  },
];

const steps = [
  {
    step: "1",
    title: "Choose who you're becoming",
    desc: "Pick an identity to build through repetition — consistent, focused, fit, calm. Not a goal, a persona.",
    icon: UserCircle2,
  },
  {
    step: "2",
    title: "Set your worst-day minimum",
    desc: "Define the smallest version that still counts. This is what keeps the system alive when full effort isn't possible.",
    icon: Zap,
  },
  {
    step: "3",
    title: "Keep going without restarting",
    desc: "On good days, do more. On hard days, do the minimum. If you miss, the recovery flow guides you back without guilt.",
    icon: RefreshCw,
  },
];

const faqs = [
  {
    q: "What is a 'system' in SystemForge?",
    a: "A system is a simple, repeatable daily action tied to your goal — like walking 20 minutes every morning to get fit. Instead of just saying 'get fit,' a system tells you exactly what to do each day, so you never have to think about it.",
  },
  {
    q: "Is this good for complete beginners?",
    a: "Yes — it's designed for people who have never used a habit app before. Every step is explained in plain English with real examples. You don't need to know anything about habit science going in.",
  },
  {
    q: "Can I use it for fitness, study, or productivity goals?",
    a: "Absolutely. Users track fitness routines, study schedules, creative work, mindfulness, business habits, and much more. If you want to do it consistently, SystemForge can help you build a system for it.",
  },
  {
    q: "Does it work on mobile?",
    a: "Yes. SystemForge works great on phones and tablets. The daily check-in is designed to take under 30 seconds — perfect for a quick tap on your phone each morning.",
  },
  {
    q: "What's included in the free plan?",
    a: "The free plan includes up to 2 active goals, 3 active systems, daily check-ins, streak tracking, starter templates, and basic analytics. It's plenty to get started and see real results.",
  },
  {
    q: "How is this different from other habit trackers?",
    a: "Most habit apps just let you check boxes. SystemForge builds real systems — with an identity statement, a trigger, a minimum action, and a fallback plan. It also warns you before motivation slumps hit (Hype Drop alerts), visualises your unbroken chain on a Calendar, and guides you through a Recovery Flow when you miss a day. It's designed to survive real life, not just work when you're motivated.",
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    yearlyPrice: "$0",
    period: "/month",
    tagline: "Perfect for trying it out",
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
    cta: "Get Started",
    ctaVariant: "outline" as const,
    href: "/signup",
  },
  {
    name: "Starter",
    price: "$9",
    yearlyPrice: "$7",
    period: "/month",
    tagline: "For people building consistency",
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
    cta: "Start Free Trial",
    ctaVariant: "outline" as const,
    href: "/signup",
  },
  {
    name: "Pro",
    price: "$19",
    yearlyPrice: "$15",
    period: "/month",
    tagline: "For ambitious, data-driven users",
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
    cta: "Start Free Trial",
    ctaVariant: "default" as const,
    href: "/signup",
  },
];

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Templates", href: "#templates" },
  { label: "Pricing", href: "#pricing" },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        data-testid={`faq-item-${q.slice(0, 20).replace(/\s/g, "-").toLowerCase()}`}
      >
        <span className="font-medium text-sm md:text-base leading-snug">{q}</span>
        <ChevronDown
          className={cn("w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="faq-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.18, ease: "easeIn" } }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-5 pb-5">
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OnboardingPreview() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 h-full">
      <div className="flex gap-1.5 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cn("h-1.5 rounded-full flex-1", i === 1 ? "gradient-brand" : "bg-muted")} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mb-2 font-medium">Step 1 of 4</p>
      <h3 className="font-bold text-sm mb-4">What do you want to improve?</h3>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {["🏃 Fitness", "📚 Study", "💼 Work", "🧘 Mindfulness", "🎨 Creativity", "❤️ Health"].map((item, i) => (
          <div
            key={item}
            className={cn(
              "rounded-xl border p-2.5 text-xs font-medium text-center cursor-pointer transition-all",
              i === 0
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-foreground hover:border-primary/50",
            )}
          >
            {item}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">No pressure — you can always change this later.</p>
    </div>
  );
}

function SystemBuilderPreview() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className={cn("w-5 h-5 rounded-full border text-[9px] flex items-center justify-center font-bold flex-shrink-0", i <= 3 ? "gradient-brand text-white border-primary" : "border-border text-muted-foreground")}>{i}</div>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-1 font-medium">Step 3 of 7 — Set Frequency</p>
      <h3 className="font-bold text-sm mb-3">How often will you do this?</h3>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { label: "Every day", active: true },
          { label: "Weekdays only", active: false },
          { label: "3× per week", active: false },
          { label: "Custom", active: false },
        ].map((opt) => (
          <div key={opt.label} className={cn("rounded-xl border p-2.5 text-xs font-medium text-center", opt.active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
            {opt.label}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground italic">💡 Starting every day builds the habit faster. You can always scale back.</p>
    </div>
  );
}

function CheckInPreview() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] text-muted-foreground">Sunday, March 15</p>
          <p className="text-xs font-bold">Good morning, Alex! 👋</p>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-primary flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary">2/3</span>
        </div>
      </div>
      <div className="space-y-2">
        {[
          { name: "Morning Movement", goal: "Get Fit", done: true, partial: false, missed: false, streak: 12 },
          { name: "Daily Reading", goal: "Learn More", done: true, partial: false, missed: false, streak: 7 },
          { name: "Focus Block", goal: "Be Productive", done: false, partial: false, missed: false, streak: 4 },
        ].map((item) => (
          <div key={item.name} className="rounded-xl border border-border p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <p className="text-xs font-semibold">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">{item.goal} · 🔥 {item.streak}d streak</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className={cn("flex-1 rounded-lg border py-1 text-[10px] text-center font-semibold", item.done ? "bg-chart-3 border-chart-3 text-white" : "border-border text-muted-foreground")}>✅ Done</div>
              <div className="flex-1 rounded-lg border py-1 text-[10px] text-center font-semibold border-border text-muted-foreground">🔶 Partial</div>
              <div className="flex-1 rounded-lg border py-1 text-[10px] text-center font-semibold border-border text-muted-foreground">❌ Missed</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsPreview() {
  const bars = [65, 80, 45, 90, 70, 85, 100];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="bg-card border border-border rounded-2xl p-5 h-full">
      <h3 className="font-bold text-sm mb-1">This Week's Progress</h3>
      <p className="text-[10px] text-muted-foreground mb-4">You completed 76% of your planned actions.</p>
      <div className="flex items-end gap-1.5 h-20 mb-2">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md"
              style={{
                height: `${h}%`,
                background: h === 100 ? "linear-gradient(135deg, hsl(258 84% 62%) 0%, hsl(280 80% 65%) 100%)" : "hsl(var(--primary) / 0.25)",
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {days.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {[
          "You're most consistent on weekdays.",
          "Mood is higher on days you check in.",
        ].map((insight) => (
          <div key={insight} className="flex items-start gap-1.5">
            <Sparkles className="w-2.5 h-2.5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-foreground leading-snug">{insight}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto max-w-3xl mt-8 sm:mt-14 mb-2 px-0 sm:px-4">
      <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-border shadow-2xl bg-card">
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-border bg-muted/60">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400/70" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-chart-4/70" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-chart-3/70" />
          </div>
          <div className="flex-1 mx-2 sm:mx-4 h-5 rounded-md bg-background/80 border border-border flex items-center px-2 sm:px-3 gap-1">
            <div className="w-2 h-2 rounded-full bg-chart-3/50" />
            <div className="text-[9px] sm:text-[10px] text-muted-foreground">systemforge.app/dashboard</div>
          </div>
        </div>
        <div className="flex h-64 sm:h-72 md:h-80">
          <div className="w-36 sm:w-44 border-r border-border bg-sidebar hidden sm:flex flex-col p-3 gap-1">
            <div className="flex items-center gap-2 p-2 mb-2">
              <div className="w-6 h-6 rounded-md gradient-brand flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-bold text-sidebar-foreground">SystemForge</span>
            </div>
            {[
              { icon: BarChart2, label: "Dashboard", active: true },
              { icon: Target, label: "My Goals", active: false },
              { icon: Zap, label: "My Systems", active: false },
              { icon: CheckSquare, label: "Check-ins", active: false },
              { icon: TrendingUp, label: "Analytics", active: false },
            ].map(item => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all",
                  item.active
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent/50",
                )}
              >
                <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                {item.label}
              </div>
            ))}
          </div>
          <div className="flex-1 p-3 sm:p-4 overflow-hidden bg-background">
            <div className="rounded-xl gradient-brand p-2.5 sm:p-3 text-white mb-2 sm:mb-3 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-white rounded-full scale-150 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              <p className="text-[9px] sm:text-[10px] text-white/70">Sunday, March 15</p>
              <p className="text-xs sm:text-sm font-bold">Good morning, Alex! 👋</p>
              <p className="text-[9px] sm:text-[10px] text-white/80">Ready to make progress today?</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              {[
                { label: "Goals", value: "3", color: "text-primary" },
                { label: "Systems", value: "5", color: "text-chart-2" },
                { label: "Today", value: "2/5", color: "text-chart-3" },
                { label: "Streak", value: "12d", color: "text-chart-4" },
              ].map(m => (
                <div key={m.label} className="bg-card border border-border rounded-lg p-1.5 sm:p-2 text-center">
                  <p className={`text-xs sm:text-sm font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-[8px] sm:text-[9px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-lg p-2 sm:p-2.5">
              <p className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2">Today's Systems</p>
              <div className="space-y-1 sm:space-y-1.5">
                {[
                  { title: "Morning Movement", done: true },
                  { title: "Daily Reading", done: true },
                  { title: "Focus Block", done: false },
                ].map(s => (
                  <div key={s.title} className="flex items-center justify-between gap-2">
                    <span className="text-[9px] sm:text-[10px] text-foreground truncate">{s.title}</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <div className={cn("w-4 h-4 sm:w-5 sm:h-5 rounded text-[7px] sm:text-[8px] flex items-center justify-center border", s.done ? "bg-chart-3 text-white border-chart-3" : "bg-muted border-border")}>
                        {s.done ? "✓" : ""}
                      </div>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded text-[8px] flex items-center justify-center border bg-muted border-border" />
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded text-[8px] flex items-center justify-center border bg-muted border-border" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-primary/20 blur-2xl rounded-full pointer-events-none" />
    </div>
  );
}

const TAB_META: Record<string, { heading: string; body: string; caption: string }> = {
  onboarding: {
    heading: "Personalize in 2 minutes",
    body: "Tell us what matters to you and we'll tailor your entire experience. No overwhelming options — just the essentials, set up in a few taps.",
    caption: "Your personal setup — done in 2 minutes.",
  },
  "system-builder": {
    heading: "Build any habit, step by step",
    body: "A guided 5-step wizard turns a vague intention into a concrete daily action — complete with identity statement, trigger, minimum action, and a Structure Preview before you commit. No guesswork, no blank slate.",
    caption: "A guided wizard that builds your habit step by step.",
  },
  checkin: {
    heading: "Check in under 30 seconds",
    body: "One tap per habit — Done, Partial, or Missed. No lengthy journaling, no friction. Just a quick, honest record that keeps you moving.",
    caption: "One tap to track each habit — under 30 seconds total.",
  },
  analytics: {
    heading: "See patterns, not just numbers",
    body: "Plain-language insights show which days you're strongest and where to focus next. No data science degree required.",
    caption: "Plain-language insights, not confusing charts.",
  },
};

export default function Landing() {
  const [billingYearly, setBillingYearly] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("onboarding");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Phase 5 — Skip link for keyboard users */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* ── Navbar ── */}
      <nav
        aria-label="Main navigation"
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "border-b border-border bg-background/80 backdrop-blur-xl shadow-sm"
            : "bg-transparent border-transparent",
        )}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md gradient-brand flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">SystemForge</span>
          </div>

          <div className="hidden md:flex items-center gap-7 text-sm text-muted-foreground font-medium">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="hover:text-foreground transition-colors">
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="link-login">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="btn-scale rounded-full px-5 gap-1.5" data-testid="link-signup">
                Start Free
              </Button>
            </Link>
          </div>

          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-6">
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-7 h-7 rounded-md gradient-brand flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-bold text-sm">SystemForge</span>
                </div>
                <div className="flex flex-col gap-1 mb-8">
                  {navLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
                <div className="flex flex-col gap-3">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full" data-testid="link-login-mobile">Sign In</Button>
                  </Link>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full rounded-full" data-testid="link-signup-mobile">Start Free</Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section id="main-content" className="relative pt-24 sm:pt-32 pb-8 px-4 overflow-hidden min-h-[90vh] flex flex-col justify-center" aria-label="Hero">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/8 rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-chart-2/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-chart-5/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4 sm:mb-6 px-3 py-1.5 text-xs font-medium gap-1.5">
            <Sparkles className="w-3 h-3" />
            For people who keep starting over
          </Badge>
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4 sm:mb-6 leading-[1.1]">
            Stop starting over.{" "}
            <span className="gradient-text block sm:inline">Build something that survives hard days.</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-5 sm:mb-7 leading-relaxed">
            SystemForge helps inconsistent people turn one goal into a daily system with a minimum action, a fallback plan, and a recovery path — so progress continues even when motivation doesn't.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground mb-7 sm:mb-10">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-chart-3" /> No perfect routines</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-chart-3" /> No guilt spirals</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-chart-3" /> No "start again Monday"</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5 sm:mb-6">
            <Link href="/signup">
              <Button size="lg" className="btn-scale gap-2 h-11 sm:h-12 px-6 sm:px-7 text-sm sm:text-base rounded-full w-full sm:w-auto" data-testid="button-hero-cta">
                Build My System in 60 Seconds
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="btn-scale h-11 sm:h-12 px-6 sm:px-7 text-sm sm:text-base rounded-full w-full sm:w-auto" data-testid="button-hero-how-it-works">
                See How It Works
              </Button>
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Free forever · No credit card needed · Built on behavioral science, not motivation
          </p>
        </div>

        <ProductPreview />
      </section>

      {/* ── What is a system strip ── */}
      <section className="py-10 sm:py-14 px-4 border-t border-border bg-muted/20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-muted-foreground mb-4 uppercase tracking-widest font-medium">What is a system?</p>
          <p className="text-base sm:text-lg text-foreground font-medium mb-6 max-w-2xl mx-auto leading-relaxed">
            A goal says what you want. A habit says what to repeat. A system makes it easier to keep going.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: UserCircle2, label: "An identity", sub: "Who you're becoming", color: "text-primary bg-primary/10" },
              { icon: Zap, label: "A minimum action", sub: "What still counts on your worst day", color: "text-chart-4 bg-chart-4/10" },
              { icon: RefreshCw, label: "A recovery plan", sub: "How the system adapts when life gets messy", color: "text-chart-3 bg-chart-3/10" },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center gap-2 p-5 rounded-xl border bg-background/60">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <p className="font-semibold text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground text-center">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why other tools fail ── */}
      <section className="py-14 sm:py-20 md:py-24 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="secondary" className="mb-3 text-xs">The problem with most habit apps</Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Most habit tools help you track perfect days.</h2>
          <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            But real progress depends on what happens on imperfect ones. When motivation drops, most people don't need more reminders. They need a smaller action, a better fallback, and a system that doesn't collapse after one miss.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 text-left">
            {[
              { icon: Zap, title: "A smaller action", body: "Your minimum action is what keeps the system alive when full effort isn't possible.", color: "text-primary bg-primary/10" },
              { icon: Shield, title: "A better fallback", body: "Every system includes a recovery plan for when life gets messy — not as failure insurance, but as built-in intelligence.", color: "text-chart-4 bg-chart-4/10" },
              { icon: RefreshCw, title: "A recovery path", body: "Missing a day doesn't break the system. The recovery flow guides you back without shame or losing momentum.", color: "text-chart-3 bg-chart-3/10" },
            ].map(item => (
              <div key={item.title} className="p-5 rounded-xl border bg-background/60 space-y-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: Why Systems Work Better Than Goals ── */}
      <section className="py-14 sm:py-20 md:py-24 px-4 border-t border-border bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <Badge variant="secondary" className="mb-3 text-xs">The core idea</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Why systems work better than goals</h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
              A goal tells you where to go. A system gets you there — one day at a time.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Goals column */}
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
                    <Target className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-bold text-base">Goals</p>
                    <p className="text-xs text-muted-foreground">Vague destinations</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    "Get fit",
                    "Read more books",
                    "Be more productive",
                    "Learn a new skill",
                    "Eat healthier",
                  ].map((goal) => (
                    <div key={goal} className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-destructive/10">
                      <div className="w-5 h-5 rounded-full bg-destructive/15 flex items-center justify-center flex-shrink-0">
                        <X className="w-3 h-3 text-destructive" />
                      </div>
                      <span className="text-sm text-muted-foreground italic">"{goal}"</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-destructive/70 mt-4 font-medium">❌ Vague. No daily action. Easy to forget.</p>
              </CardContent>
            </Card>

            {/* Systems column */}
            <Card className="border-chart-3/30 bg-chart-3/5">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-chart-3/15 flex items-center justify-center">
                    <Repeat className="w-5 h-5 text-chart-3" />
                  </div>
                  <div>
                    <p className="font-bold text-base">Systems</p>
                    <p className="text-xs text-muted-foreground">Specific daily actions</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    "Walk 20 min every morning",
                    "Read 10 pages after dinner",
                    "Write for 15 min before work",
                    "Practice 20 min after breakfast",
                    "Cook one new recipe on Sundays",
                  ].map((system) => (
                    <div key={system} className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-chart-3/15">
                      <div className="w-5 h-5 rounded-full bg-chart-3/15 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-chart-3" />
                      </div>
                      <span className="text-sm text-foreground">"{system}"</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-chart-3 mt-4 font-medium">✅ Clear. Actionable. Repeatable every day.</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-2xl px-6 py-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-sm text-foreground font-medium">
                SystemForge turns your vague goals into specific daily systems — in under 5 minutes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-14 sm:py-20 md:py-24 px-4 border-t border-border bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <Badge variant="secondary" className="mb-3 text-xs">Simple as 1-2-3</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">How SystemForge works</h2>
            <p className="text-muted-foreground text-base md:text-lg">Set up in 60 seconds. Designed to keep working when motivation disappears.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            {steps.map((s, i) => (
              <div key={s.step} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2.5rem)] right-0 h-px border-t border-dashed border-border" />
                )}
                <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-5 shadow-md">
                  <s.icon className="w-7 h-7 text-white" />
                </div>
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mx-auto mb-3">
                  {s.step}
                </div>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Highlights (8 cards, 4x2) ── */}
      <section id="features" className="py-14 sm:py-20 md:py-24 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <Badge variant="secondary" className="mb-3 text-xs">Everything you need</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Simple tools. Powerful results.</h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
              Every feature is designed to be instantly understandable — even if you've never used a productivity app before.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {allFeatures.map((f) => (
              <Card
                key={f.title}
                className="card-interactive border-border/60"
              >
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${f.color}`}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1.5 leading-snug">{f.title}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 6: Product Preview (Tabbed Showcase) ── */}
      <section className="py-14 sm:py-20 md:py-24 px-4 border-t border-border bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <Badge variant="secondary" className="mb-3 text-xs">See it in action</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
              A real product built for real people
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
              Every screen is designed to feel calm, clear, and encouraging.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Tab bar: 2×2 grid on mobile, single row on sm+ */}
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-2xl mx-auto mb-8 h-auto p-1 gap-1 bg-muted rounded-2xl">
              <TabsTrigger
                value="onboarding"
                className="rounded-xl text-xs py-2.5 leading-tight data-[state=active]:bg-background data-[state=active]:shadow-sm"
                data-testid="tab-onboarding"
              >
                <span className="sm:hidden">Setup</span>
                <span className="hidden sm:inline">Personalization</span>
              </TabsTrigger>
              <TabsTrigger
                value="system-builder"
                className="rounded-xl text-xs py-2.5 leading-tight data-[state=active]:bg-background data-[state=active]:shadow-sm"
                data-testid="tab-system-builder"
              >
                <span className="sm:hidden">Builder</span>
                <span className="hidden sm:inline">System Builder</span>
              </TabsTrigger>
              <TabsTrigger
                value="checkin"
                className="rounded-xl text-xs py-2.5 leading-tight data-[state=active]:bg-background data-[state=active]:shadow-sm"
                data-testid="tab-checkin"
              >
                <span className="sm:hidden">Check-In</span>
                <span className="hidden sm:inline">Daily Check-In</span>
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="rounded-xl text-xs py-2.5 leading-tight data-[state=active]:bg-background data-[state=active]:shadow-sm"
                data-testid="tab-analytics"
              >
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Body: stacked on mobile/tablet, side-by-side on lg+ */}
            <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-14 lg:items-center max-w-4xl mx-auto">
              {/* Left column: context description — desktop only */}
              <div className="hidden lg:block">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 14 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <h3 className="text-2xl font-bold mb-3 leading-snug">
                      {TAB_META[activeTab].heading}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {TAB_META[activeTab].body}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Right column (or only column on mobile): the preview card */}
              <div className="w-full max-w-xs sm:max-w-sm mx-auto lg:max-w-none">
                <TabsContent value="onboarding" className="mt-0">
                  <OnboardingPreview />
                  <p className="text-center text-sm text-muted-foreground mt-4 lg:hidden">
                    {TAB_META.onboarding.caption}
                  </p>
                </TabsContent>
                <TabsContent value="system-builder" className="mt-0">
                  <SystemBuilderPreview />
                  <p className="text-center text-sm text-muted-foreground mt-4 lg:hidden">
                    {TAB_META["system-builder"].caption}
                  </p>
                </TabsContent>
                <TabsContent value="checkin" className="mt-0">
                  <CheckInPreview />
                  <p className="text-center text-sm text-muted-foreground mt-4 lg:hidden">
                    {TAB_META.checkin.caption}
                  </p>
                </TabsContent>
                <TabsContent value="analytics" className="mt-0">
                  <AnalyticsPreview />
                  <p className="text-center text-sm text-muted-foreground mt-4 lg:hidden">
                    {TAB_META.analytics.caption}
                  </p>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </section>

      {/* ── Templates ── */}
      <section id="templates" className="py-14 sm:py-20 md:py-24 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <Badge variant="secondary" className="mb-3 text-xs">Don't start from scratch</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Start with a proven template</h2>
            <p className="text-muted-foreground text-base md:text-lg">
              Not sure what system to build? Pick one — already proven to work.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: "💪", name: "Morning Movement", category: "Fitness", desc: "5 pushups after brushing teeth", time: "~5 min/day", difficulty: "Easy" },
              { icon: "📚", name: "Daily Reading", category: "Learning", desc: "1 page before bed", time: "~10 min/day", difficulty: "Easy" },
              { icon: "🧘", name: "Mindful Morning", category: "Mindfulness", desc: "3 minutes of breathing after waking up", time: "~3 min/day", difficulty: "Easy" },
              { icon: "✍️", name: "Daily Writing", category: "Creativity", desc: "100 words at 8am", time: "~15 min/day", difficulty: "Medium" },
              { icon: "💧", name: "Hydration Habit", category: "Health", desc: "Drink a glass of water with each meal", time: "~0 min/day", difficulty: "Easy" },
              { icon: "🎯", name: "Focus Block", category: "Productivity", desc: "25-min deep work before email", time: "~25 min/day", difficulty: "Medium" },
            ].map((t) => (
              <Card key={t.name} className="hover-elevate border-border/60 cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm mb-1">{t.name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t.category}</Badge>
                        <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", t.difficulty === "Easy" ? "bg-chart-3/10 text-chart-3 border-chart-3/20" : "bg-chart-4/10 text-chart-4 border-chart-4/20")}>
                          {t.difficulty}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{t.desc}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {t.time}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/signup">
              <Button variant="outline" className="gap-2 rounded-full" data-testid="button-view-templates">
                <LayoutGrid className="w-4 h-4" />
                Browse all templates
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Honest trust section ── */}
      <section className="py-14 sm:py-20 md:py-24 px-4 border-t border-border bg-muted/20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 md:mb-10">
            <Badge variant="secondary" className="mb-3 text-xs">Why we built this</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Built honestly, from scratch</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <Card className="border-primary/20 bg-primary/4">
              <CardContent className="p-6">
                <Quote className="w-5 h-5 text-primary/40 mb-3" />
                <p className="text-sm text-foreground leading-relaxed mb-4">
                  "Most apps let you track habits. We wanted to build something that helps you design why a habit will actually stick — the trigger, the minimum action, the fallback. That's the whole idea."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">The SystemForge Team</p>
                    <p className="text-xs text-muted-foreground">Independent product, early stage</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-4">
              {[
                { icon: Shield, title: "No fake social proof", body: "We're early. We'd rather be honest about that than show inflated numbers." },
                { icon: Brain, title: "Grounded in research", body: "The builder is based on BJ Fogg's Tiny Habits, identity theory, and implementation intentions." },
                { icon: Heart, title: "Privacy-first", body: "Your habits and journals are private to you. We don't sell data or show ads." },
              ].map(item => (
                <div key={item.title} className="flex gap-3 p-4 rounded-xl border bg-background/60">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-0.5">{item.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-14 sm:py-20 md:py-24 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <Badge variant="secondary" className="mb-3 text-xs">Simple pricing</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Start free. Upgrade when you're ready.</h2>
            <p className="text-muted-foreground text-base md:text-lg">All plans include a 14-day free trial. No credit card required.</p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <span className={cn("text-sm", !billingYearly && "font-semibold text-foreground", billingYearly && "text-muted-foreground")}>Monthly</span>
              <button
                onClick={() => setBillingYearly(!billingYearly)}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors",
                  billingYearly ? "bg-primary" : "bg-muted-foreground/30",
                )}
                data-testid="toggle-billing-yearly"
              >
                <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform", billingYearly ? "translate-x-6" : "translate-x-1")} />
              </button>
              <span className={cn("text-sm flex items-center gap-1.5", billingYearly && "font-semibold text-foreground", !billingYearly && "text-muted-foreground")}>
                Yearly
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-chart-3/15 text-chart-3">Save 20%</Badge>
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  "relative flex flex-col hover-elevate transition-all duration-200",
                  plan.badge ? "border-primary/40 shadow-lg scale-[1.02]" : "border-border/60",
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="gradient-brand text-white text-xs px-3 py-1 border-0 shadow-sm">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardContent className="p-5 flex flex-col flex-1 pt-6">
                  <p className="text-sm font-bold mb-1">{plan.name}</p>
                  <p className="text-xs text-muted-foreground mb-3">{plan.tagline}</p>
                  <div className="flex items-end gap-0.5 mb-5">
                    <span className="text-3xl font-extrabold">
                      {billingYearly ? plan.yearlyPrice : plan.price}
                    </span>
                    <span className="text-muted-foreground text-sm mb-1">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 flex-1 mb-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-chart-3 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.href}>
                    <Button variant={plan.ctaVariant} className="w-full rounded-xl" size="sm" data-testid={`button-plan-${plan.name.toLowerCase().replace(/\s/g, "-")}`}>
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">All plans include a 14-day free trial. No credit card required.</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-14 sm:py-20 md:py-24 px-4 border-t border-border bg-muted/20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <Badge variant="secondary" className="mb-3 text-xs">Questions answered</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-14 sm:py-20 md:py-24 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden gradient-brand p-8 sm:p-12 md:p-16 text-white">
            <div className="absolute inset-0 opacity-10 bg-white rounded-full scale-150 -translate-y-1/2 pointer-events-none" />
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 sm:mb-4 opacity-80" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 leading-tight">
              You do not need a better mood.
            </h2>
            <p className="text-white/80 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 max-w-xl mx-auto leading-relaxed">
              You need a system that still works in a bad one. Build yours in 60 seconds — free, no credit card needed.
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                className="btn-scale bg-white text-primary hover:bg-white/90 gap-2 h-12 px-8 text-base font-semibold shadow-lg rounded-full"
                data-testid="button-final-cta"
              >
                Build My First System
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="text-white/60 text-xs mt-4">No credit card required · Takes 60 seconds</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 sm:py-12 px-4 border-t border-border bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md gradient-brand flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <span className="font-bold text-sm">SystemForge</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Built for people who are tired of starting over.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Product</p>
              <div className="flex flex-col gap-2">
                {["Features", "How It Works", "Templates", "Pricing"].map((item) => (
                  <a key={item} href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{item}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Company</p>
              <div className="flex flex-col gap-2">
                {["About", "Blog", "Careers", "Press"].map((item) => (
                  <a key={item} href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{item}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Legal</p>
              <div className="flex flex-col gap-2">
                {["Privacy Policy", "Terms of Service", "Cookie Policy", "Support"].map((item) => (
                  <a key={item} href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{item}</a>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">© 2026 SystemForge. All rights reserved.</p>
            <p className="text-xs text-muted-foreground">Not another habit tracker. A system that survives real life.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
