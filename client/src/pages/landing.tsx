import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { SiteLogo } from "@/components/site-logo";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Target, Zap, CheckSquare, TrendingUp, BookOpen,
  ArrowRight, Star, Check, ChevronDown,
  Flame, LayoutGrid, Heart, Quote,
  BarChart2, Shield, Brain, Trophy, RefreshCw,
  Calendar, Clock, Users, Menu, X,
  Repeat, Flag, Cog, CircleCheck, PenLine, Copy,
  UserCircle2, ChevronRight, Mail, Loader2, MessageSquare,
  Camera, Globe, Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { captureEmailLead } from "@/services/user.service";
import { track } from "@/lib/track";
import { Helmet } from "react-helmet-async";
import { HeroAnimation } from "@/components/app/HeroAnimation";

// ─── A/B variant ───────────────────────────────────────────────────────────
function useCtaVariant(): "A" | "B" {
  return useMemo(() => {
    try {
      const stored = localStorage.getItem("strivo_cta_variant");
      if (stored === "A" || stored === "B") return stored;
      const v = Math.random() < 0.5 ? "A" : "B";
      localStorage.setItem("strivo_cta_variant", v);
      return v;
    } catch {
      return "A";
    }
  }, []);
}

// ─── Animated counter ──────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1400) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setCount(Math.round(start));
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return { ref, count };
}

// ─── Data ──────────────────────────────────────────────────────────────────
const allFeatures = [
  { icon: Target,     title: "Define what you want to achieve",             desc: "Set a goal with a category, priority, and timeline. See all your goals in one clear place.",                                                                                color: "bg-primary/10 text-primary"         },
  { icon: Cog,        title: "Turn your goal into a daily plan",             desc: "A guided wizard that builds your habit step by step — no guessing, no overwhelm.",                                                                                           color: "bg-chart-2/10 text-chart-2"         },
  { icon: CircleCheck,title: "Track how today went in seconds",              desc: "Mark each habit as done, partial, or missed. Add mood, difficulty, and a progress photo — in under 30 seconds.",                                                             color: "bg-chart-3/10 text-chart-3"         },
  { icon: Flame,      title: "Stay consistent — even when motivation drops", desc: "Chain Calendar shows your unbroken run of days. Consistency alerts warn you before a slump hits.",                                                                            color: "bg-chart-4/10 text-chart-4"         },
  { icon: BarChart2,  title: "See what's working",                           desc: "Difficulty trend charts and plain-language insights — spot patterns and fix what's slowing you down.",                                                                       color: "bg-chart-5/10 text-chart-5"         },
  { icon: Globe,      title: "Learn from the community",                     desc: "Browse habit systems shared by real users. Publish your own and help others build consistency.",                                                                              color: "bg-primary/10 text-primary"         },
  { icon: Gift,       title: "Invite friends, earn streak freezes",          desc: "Share your referral link and you both get a streak freeze — a safety net for your next tough day.",                                                                          color: "bg-chart-2/10 text-chart-2"         },
  { icon: RefreshCw,  title: "Bounce back when life gets in the way",        desc: "Recovery Flow guides you after a missed day. Tomorrow Intention lets you pre-commit to the next one.",                                                                        color: "bg-chart-3/10 text-chart-3"         },
];

const steps = [
  { step: "1", title: "Choose who you're becoming",    desc: "Pick an identity to build through repetition — consistent, focused, fit, calm. Not a goal, a persona.",                                                               icon: UserCircle2 },
  { step: "2", title: "Set your worst-day minimum",    desc: "Define the smallest version that still counts. This is what keeps the system alive when full effort isn't possible.",                                                  icon: Zap         },
  { step: "3", title: "Keep going without restarting", desc: "On good days, do more. On hard days, do the minimum. If you miss, the recovery flow guides you back without guilt.",                                                   icon: RefreshCw   },
];

const faqs = [
  { q: "What is a 'system' in Strivo?",                  a: "A system is a simple, repeatable daily action tied to your goal — like walking 20 minutes every morning to get fit. Instead of just saying 'get fit,' a system tells you exactly what to do each day, so you never have to think about it." },
  { q: "Is this good for complete beginners?",                 a: "Yes — it's designed for people who have never used a habit app before. Every step is explained in plain English with real examples. You don't need to know anything about habit science going in." },
  { q: "Can I use it for fitness, study, or productivity goals?", a: "Absolutely. Users track fitness routines, study schedules, creative work, mindfulness, business habits, and much more. If you want to do it consistently, Strivo can help you build a system for it." },
  { q: "Does it work on mobile?",                              a: "Yes. Strivo works great on phones and tablets. The daily check-in is designed to take under 30 seconds — perfect for a quick tap on your phone each morning." },
  { q: "What's included in the free plan?",                    a: "The free plan includes up to 2 active goals, 3 active systems, daily check-ins, streak tracking, starter templates, and basic analytics. It's plenty to get started and see real results." },
  { q: "How is this different from other habit trackers?",     a: "Most habit apps just let you check boxes. Strivo builds real systems — with an identity statement, a trigger, a minimum action, and a fallback plan. It also warns you before motivation slumps hit, visualises your unbroken chain on a Calendar, and guides you through a Recovery Flow when you miss a day. It's designed to survive real life, not just work when you're motivated." },
  { q: "Can I cancel my paid plan at any time?",               a: "Yes, absolutely. There are no contracts or lock-in periods. You can cancel whenever you like from your account settings. You'll keep access until the end of your current billing period, then revert to the free plan automatically." },
  { q: "Is my data private and secure?",                       a: "Your habits, journals, and personal data are private to you. We use Firebase's secure infrastructure, never sell your data, and don't show you ads. You can request a full export or deletion of your data at any time." },
  { q: "What happens if I miss a day?",                        a: "Nothing bad. Strivo's Recovery Flow kicks in — it asks what got in the way, helps you lower the friction for tomorrow, and gets you back on track without guilt. Missing one day doesn't erase your progress or reset your mindset." },
  { q: "How does the AI Coach work?",                          a: "The AI Coach (available on Pro and Elite plans) is a conversational coach that knows your habits, goals, and recent check-ins. You can ask it for motivation, accountability, advice on building tougher habits, or just a pep talk. It's powered by a large language model with habit-science context built in." },
];

const pricingPlans = [
  {
    name: "Free", price: "$0", yearlyPrice: "$0", period: "/month",
    tagline: "Perfect for trying it out", badge: null,
    features: ["Up to 2 active goals", "Up to 3 active systems", "Daily check-ins", "Basic streak tracking", "3 starter templates", "Light analytics", "Basic journaling"],
    cta: "Get Started", ctaVariant: "outline" as const, href: "/signup",
  },
  {
    name: "Starter", price: "$5", yearlyPrice: "$4", period: "/month",
    tagline: "For people building consistency", badge: null,
    features: ["Up to 10 active goals", "Unlimited systems", "Full template library", "Advanced streak tracking", "Weekly reflection prompts", "Better analytics", "Future self audio", "Dark mode", "Export basic reports"],
    cta: "Get Started", ctaVariant: "outline" as const, href: "/pricing",
  },
  {
    name: "Pro", price: "$12", yearlyPrice: "$9", period: "/month",
    tagline: "For ambitious, data-driven users", badge: "Most Popular",
    features: ["Unlimited goals", "Unlimited systems", "AI Coach (10 msgs/day)", "Advanced analytics dashboard", "Mood & habit correlation insights", "Premium templates", "Advanced journaling", "CSV / PDF exports", "Priority support"],
    cta: "Get Started", ctaVariant: "default" as const, href: "/pricing",
  },
  {
    name: "Elite", price: "$25", yearlyPrice: "$19", period: "/month",
    tagline: "For power users who want everything", badge: "All-Inclusive",
    features: ["Unlimited goals & systems", "AI Coach (unlimited msgs/day)", "Advanced analytics & AI insights", "Full template library", "AI journal prompts", "CSV / PDF exports", "Future self audio", "Priority support", "Team workspace", "Coach dashboard"],
    cta: "Go Elite", ctaVariant: "outline" as const, href: "/pricing",
  },
];

const navLinks = [
  { label: "How It Works",href: "#how-it-works"},
  { label: "Features",    href: "#features"    },
  { label: "Templates",   href: "#templates"   },
  { label: "Pricing",     href: "#pricing"     },
  { label: "FAQ",         href: "#faq"         },
  { label: "Support",     href: "/support"     },
];

const testimonials = [
  { quote: "I've tried every habit app. This is the first one that has a plan for when I mess up. The fallback feature alone changed everything for me.",                                                                                                       name: "Marcus Rivera",  role: "Personal trainer",  goal: "Fitness",         initials: "MR", avatarColor: "bg-chart-2/20 text-chart-2",  verified: true },
  { quote: "I liked that it didn't let me set a big ambitious goal and call it done. It forced me to ask — okay, but what will you actually do tomorrow morning?",                                                                                             name: "Priya Sharma",   role: "Software engineer", goal: "Daily reading",    initials: "PS", avatarColor: "bg-primary/20 text-primary",   verified: true },
  { quote: "The identity framing is subtle but it genuinely works. I stopped saying 'I'm trying to study more' and started saying 'I'm someone who studies every day.' Different mindset.",                                                                    name: "Tom Whitfield",  role: "Grad student",      goal: "Exam prep",        initials: "TW", avatarColor: "bg-chart-5/20 text-chart-5",  verified: true },
  { quote: "The minimum action concept saved me. On rough days I just do the 2-minute version and it keeps the streak alive. No guilt, just consistency.",                                                                                                     name: "Aisha Kamara",   role: "Nurse",             goal: "Meditation",       initials: "AK", avatarColor: "bg-chart-3/20 text-chart-3",  verified: true },
  { quote: "The recovery flow is brilliant. Instead of feeling like a failure after missing a day, it just asks what got in the way and how to make tomorrow easier.",                                                                                         name: "Daniel Moreau",  role: "Entrepreneur",      goal: "Deep work",        initials: "DM", avatarColor: "bg-chart-4/20 text-chart-4",  verified: true },
  { quote: "The trigger setup step made me realise I'd been trying to build habits at random times. Anchoring to my coffee routine made the habit automatic within two weeks.",                                                                                 name: "Sophie Laurent", role: "Marketing lead",    goal: "Morning routine",  initials: "SL", avatarColor: "bg-primary/20 text-primary",   verified: true },
];

// ─── Sub-components ─────────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        data-testid={`faq-item-${q.slice(0, 20).replace(/\s/g, "-").toLowerCase()}`}
      >
        <span className="font-medium text-sm md:text-base leading-snug">{q}</span>
        <ChevronDown className={cn("w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
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
            <div className="px-5 pb-5 border-t border-border/40 pt-4">
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
          <div key={item} className={cn("rounded-xl border p-2.5 text-xs font-medium text-center cursor-pointer transition-all", i === 0 ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:border-primary/50")}>
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
        {[{ label: "Every day", active: true }, { label: "Weekdays only", active: false }, { label: "3× per week", active: false }, { label: "Custom", active: false }].map((opt) => (
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
          <p className="text-[10px] text-muted-foreground">Thursday, March 26</p>
          <p className="text-xs font-bold">Good morning, Alex! 👋</p>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-primary flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary">2/3</span>
        </div>
      </div>
      <div className="space-y-2">
        {[
          { name: "Morning Movement", goal: "Get Fit",       done: true,  streak: 12 },
          { name: "Daily Reading",    goal: "Learn More",    done: true,  streak: 7  },
          { name: "Focus Block",      goal: "Be Productive", done: false, streak: 4  },
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
            <div className="w-full rounded-t-md" style={{ height: `${h}%`, background: h === 100 ? "linear-gradient(135deg, hsl(258 84% 62%) 0%, hsl(280 80% 65%) 100%)" : "hsl(var(--primary) / 0.25)" }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mb-3">
        {days.map((d, i) => <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground">{d}</div>)}
      </div>
      <div className="space-y-1.5">
        {["You're most consistent on weekdays.", "Mood is higher on days you check in."].map((insight) => (
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
    <div className="relative mx-auto max-w-3xl mt-6 sm:mt-14 mb-2 px-2 sm:px-4">
      <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-border shadow-2xl bg-card">
        {/* Browser chrome bar */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-border bg-muted/60">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-400/70" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-chart-4/70" />
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-chart-3/70" />
          </div>
          <div className="flex-1 mx-2 sm:mx-4 h-5 rounded-md bg-background/80 border border-border flex items-center px-2 sm:px-3 gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-chart-3/50" />
            <div className="text-[9px] sm:text-[10px] text-muted-foreground truncate">strivo.life/dashboard</div>
          </div>
        </div>
        <div className="flex h-56 sm:h-72 md:h-80">
          {/* Sidebar — hidden on mobile */}
          <div className="w-36 sm:w-44 border-r border-border bg-sidebar hidden sm:flex flex-col p-3 gap-1">
            <div className="flex items-center p-2 mb-2">
              <SiteLogo className="h-5" />
            </div>
            {[
              { icon: BarChart2, label: "Dashboard", active: true  },
              { icon: Target,    label: "My Goals",  active: false },
              { icon: Zap,       label: "My Systems", active: false },
              { icon: CheckSquare, label: "Check-ins", active: false },
              { icon: TrendingUp,  label: "Analytics", active: false },
            ].map(item => (
              <div key={item.label} className={cn("flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all", item.active ? "bg-sidebar-accent text-sidebar-primary font-medium" : "text-muted-foreground hover:bg-sidebar-accent/50")}>
                <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                {item.label}
              </div>
            ))}
          </div>
          {/* Main content */}
          <div className="flex-1 p-2.5 sm:p-4 overflow-hidden bg-background flex flex-col gap-2 sm:gap-3">
            <div className="flex sm:hidden items-center justify-around border-b border-border pb-2 mb-0.5">
              {[{ icon: BarChart2, label: "Home", active: true }, { icon: Target, label: "Goals", active: false }, { icon: Zap, label: "Systems", active: false }, { icon: CheckSquare, label: "Today", active: false }].map(item => (
                <div key={item.label} className={cn("flex flex-col items-center gap-0.5", item.active ? "text-primary" : "text-muted-foreground")}>
                  <item.icon className="w-3.5 h-3.5" />
                  <span className="text-[8px] font-medium">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg sm:rounded-xl gradient-brand p-2 sm:p-3 text-white relative overflow-hidden flex-shrink-0">
              <div className="absolute inset-0 opacity-10 bg-white rounded-full scale-150 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              <p className="text-[9px] sm:text-[10px] text-white/70">Thursday, March 26</p>
              <p className="text-[11px] sm:text-sm font-bold">Good morning, Alex! 👋</p>
              <p className="text-[9px] sm:text-[10px] text-white/80 hidden sm:block">Ready to make progress today?</p>
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 flex-shrink-0">
              {[{ label: "Goals", value: "3", color: "text-primary" }, { label: "Systems", value: "5", color: "text-chart-2" }, { label: "Today", value: "2/5", color: "text-chart-3" }, { label: "Streak", value: "12d", color: "text-chart-4" }].map(m => (
                <div key={m.label} className="bg-card border border-border rounded-lg p-1.5 sm:p-2 text-center">
                  <p className={`text-[11px] sm:text-sm font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-[8px] sm:text-[9px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-lg p-2 sm:p-2.5 flex-1 min-h-0 overflow-hidden">
              <p className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2">Today's Systems</p>
              <div className="space-y-1 sm:space-y-1.5">
                {[{ title: "Morning Movement", done: true }, { title: "Daily Reading", done: true }, { title: "Focus Block", done: false }].map(s => (
                  <div key={s.title} className="flex items-center justify-between gap-2">
                    <span className="text-[9px] sm:text-[10px] text-foreground truncate">{s.title}</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <div className={cn("w-4 h-4 sm:w-5 sm:h-5 rounded text-[7px] sm:text-[8px] flex items-center justify-center border", s.done ? "bg-chart-3 text-white border-chart-3" : "bg-muted border-border")}>{s.done ? "✓" : ""}</div>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center border bg-muted border-border" />
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center border bg-muted border-border" />
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
  onboarding:       { heading: "Personalize in 2 minutes",         body: "Tell us what matters to you and we'll tailor your entire experience. No overwhelming options — just the essentials, set up in a few taps.",                                                                             caption: "Your personal setup — done in 2 minutes."               },
  "system-builder": { heading: "Build any habit, step by step",    body: "A guided 7-step wizard turns a vague intention into a concrete daily action — complete with identity statement, trigger, minimum action, fallback plan, and a Structure Preview before you commit. No guesswork, no blank slate.",   caption: "A guided wizard that builds your habit step by step."    },
  checkin:          { heading: "Check in under 30 seconds",         body: "One tap per habit — Done, Partial, or Missed. No lengthy journaling, no friction. Just a quick, honest record that keeps you moving.",                                                                                 caption: "One tap to track each habit — under 30 seconds total."   },
  analytics:        { heading: "See patterns, not just numbers",    body: "Plain-language insights show which days you're strongest and where to focus next. No data science degree required.",                                                                                                   caption: "Plain-language insights, not confusing charts."          },
};

function EmailCaptureForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    setStatus("loading");
    try {
      const result = await captureEmailLead(email, "landing-newsletter");
      if (result.alreadyExists) {
        setStatus("success");
        setMessage("You're already on the list — we'll be in touch soon!");
      } else {
        track("newsletter_subscribed", { source: "landing-newsletter" });
        setStatus("success");
        setMessage("You're in! Check your inbox for a welcome message.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center justify-center gap-2 text-chart-3 font-medium" data-testid="email-capture-success">
        <div className="w-8 h-8 rounded-full bg-chart-3/10 flex items-center justify-center">
          <Check className="w-4 h-4" />
        </div>
        <span className="text-sm">{message}</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3" data-testid="email-capture-form">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setStatus("idle"); setMessage(""); }}
          className="flex-1 h-11 rounded-xl"
          required
          data-testid="input-email-capture"
          aria-label="Email address for newsletter"
        />
        <Button type="submit" className="h-11 px-6 gap-2 shrink-0 rounded-xl" disabled={status === "loading"} data-testid="button-email-capture-submit">
          {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          {status === "loading" ? "Subscribing..." : "Subscribe Free"}
        </Button>
      </form>
      {status === "error" && (
        <p className="text-xs text-destructive text-center mt-2">{message}</p>
      )}
    </div>
  );
}


// ─── Animated stat ──────────────────────────────────────────────────────────
function AnimatedStat({ value, label, icon: Icon, suffix = "" }: { value: number; label: string; icon: any; suffix?: string }) {
  const { ref, count } = useCountUp(value, 1200);
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon className="w-4 h-4 text-primary mb-1 opacity-70" />
      <span ref={ref} className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums block">
        {count.toLocaleString()}{suffix}
      </span>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Sticky mobile CTA bar ──────────────────────────────────────────────────
function MobileCtaBar({ ctaVariant }: { ctaVariant: "A" | "B" }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden px-4 py-3 bg-background/95 backdrop-blur-xl border-t border-border safe-area-pb"
        >
          <Link href="/signup">
            <Button
              size="lg"
              className="w-full rounded-full gap-2 h-12 font-semibold"
              data-testid="button-sticky-cta"
              onClick={() => track("sticky_cta_click", { variant: ctaVariant })}
            >
              {ctaVariant === "A" ? "Build My System Free" : "Start Building — It's Free"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Social proof avatar cluster ────────────────────────────────────────────
const AVATAR_SEEDS = ["Marcus Rivera", "Priya Sharma", "Tom Whitfield", "Aisha Kamara", "Daniel Moreau"];

function SocialProofRow() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2.5 flex-shrink-0">
        {AVATAR_SEEDS.map((seed, i) => (
          <img
            key={seed}
            src={`https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
            alt={`User ${i + 1}`}
            width={32} height={32}
            className="w-8 h-8 rounded-full border-2 border-background object-cover bg-muted flex-shrink-0"
            loading="lazy"
          />
        ))}
        <div className="w-8 h-8 rounded-full border-2 border-background bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground flex-shrink-0">
          +
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Join 10,000+ habit builders</p>
        <div className="flex items-center gap-1 mt-0.5">
          {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 text-chart-4 fill-chart-4" />)}
          <span className="text-xs text-muted-foreground ml-1">4.8 / 5</span>
        </div>
      </div>
    </div>
  );
}

// ─── Hero floating notification ─────────────────────────────────────────────
const ACTIVITY_NOTIFICATIONS = [
  { name: "Sophie L.", action: "hit a 21-day streak 🔥" },
  { name: "Marcus R.", action: "completed Morning Movement ✅" },
  { name: "Aisha K.",  action: "bounced back after a missed day 💪" },
  { name: "Tom W.",    action: "built their first system 🎯" },
];

function HeroNotification() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % ACTIVITY_NOTIFICATIONS.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(cycle);
  }, []);

  const n = ACTIVITY_NOTIFICATIONS[index];
  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2.5 bg-card border border-border rounded-full px-3.5 py-2 shadow-md text-xs"
        >
          <img
            src={`https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(n.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`}
            alt="" width={22} height={22} className="w-5.5 h-5.5 rounded-full bg-muted border border-border/40 flex-shrink-0"
          />
          <span className="font-semibold text-foreground">{n.name}</span>
          <span className="text-muted-foreground">{n.action}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function Landing() {
  const [billingYearly, setBillingYearly] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("onboarding");
  const [activeSection, setActiveSection] = useState("");
  const ctaVariant = useCtaVariant();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sectionIds = ["how-it-works", "features", "templates", "pricing", "faq"];
    const observers: IntersectionObserver[] = [];
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: "-40% 0px -50% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Strivo — Build Habits That Survive Real Life</title>
        <link rel="canonical" href="https://strivo.life/" />
        <meta name="description" content="Turn any goal into a daily system with a minimum action and a recovery plan — so you keep going even when motivation doesn't. Free to start." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://strivo.life/" />
        <meta property="og:site_name" content="Strivo" />
        <meta property="og:title" content="Strivo — Build Habits That Survive Real Life" />
        <meta property="og:description" content="Stop starting over. Turn any goal into a daily system with a minimum action, fallback plan, and recovery path. Free to start." />
        <meta property="og:image" content="https://strivo.life/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Strivo — Build Habits That Survive Real Life" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@strivoapp" />
        <meta name="twitter:title" content="Strivo — Build Habits That Survive Real Life" />
        <meta name="twitter:description" content="Stop starting over. Turn any goal into a daily system with a minimum action and recovery plan. Free to start." />
        <meta name="twitter:image" content="https://strivo.life/og-image.png" />
      </Helmet>

      <a href="#main-content" className="skip-to-content">Skip to main content</a>

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <nav
        aria-label="Main navigation"
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled ? "border-b border-border bg-background/90 backdrop-blur-xl shadow-sm" : "bg-transparent border-transparent",
        )}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <SiteLogo className="h-9" />
          </div>

          <div className="hidden md:flex items-center gap-7 text-sm text-muted-foreground font-medium">
            {navLinks.map((link) => {
              const sectionId = link.href.replace("#", "");
              const isActive = activeSection === sectionId;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  className={cn(
                    "transition-colors relative pb-0.5",
                    isActive
                      ? "text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-primary"
                      : "hover:text-foreground"
                  )}
                >
                  {link.label}
                </a>
              );
            })}
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
                <div className="flex items-center mb-8">
                  <SiteLogo className="h-8" />
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

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section
        id="main-content"
        aria-label="Hero"
        className="relative min-h-[100svh] flex items-center overflow-hidden px-4 pt-16"
      >
        {/* ── Background: dot grid + gradient blobs ── */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          {/* Subtle dot grid */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          {/* Colour blobs */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/[0.18] rounded-full blur-[120px]" />
          <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-chart-2/[0.10] rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[350px] bg-chart-5/[0.08] rounded-full blur-[80px]" />
        </div>

        <div className="max-w-7xl mx-auto w-full py-12 sm:py-16 lg:py-0">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* ── LEFT: Copy ──────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-start text-left"
            >
              {/* Social proof pill */}
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-6"
              >
                <SocialProofRow />
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="text-[2.1rem] leading-[1.1] sm:text-5xl lg:text-[3.5rem] xl:text-[4rem] font-extrabold tracking-tight mb-5"
              >
                Stop starting over.{" "}
                <span className="gradient-text">Build something that survives hard days.</span>
              </motion.h1>

              {/* Sub-headline */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="text-base sm:text-lg text-muted-foreground max-w-lg mb-6 leading-relaxed"
              >
                Turn any goal into a daily system with a minimum action and a recovery plan — so you keep going even when motivation doesn't.
              </motion.p>

              {/* Trust bullets */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.38 }}
                className="flex flex-col gap-2 mb-8"
              >
                {[
                  "No perfect routines — just a minimum that still counts",
                  "No guilt spirals — recovery flow gets you back on track",
                  "No 'start again Monday' — the system survives one missed day",
                ].map((item) => (
                  <span key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-chart-3/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-chart-3" />
                    </span>
                    {item}
                  </span>
                ))}
              </motion.div>

              {/* CTA buttons */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.46 }}
                className="flex flex-col sm:flex-row gap-3 mb-4 w-full sm:w-auto"
              >
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="btn-scale gap-2 h-13 px-8 text-base font-semibold rounded-full w-full shadow-lg shadow-primary/25"
                    data-testid="button-hero-cta"
                    data-cta-variant={ctaVariant}
                    onClick={() => track("hero_cta_click", { variant: ctaVariant })}
                  >
                    {ctaVariant === "A" ? "Build My System Free" : "Start Building — It's Free"}
                    <ArrowRight className="w-4 h-4 flex-shrink-0" />
                  </Button>
                </Link>
                <a href="#how-it-works" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="btn-scale h-13 px-7 text-base rounded-full w-full"
                    data-testid="button-hero-how-it-works"
                  >
                    See How It Works
                  </Button>
                </a>
              </motion.div>

              {/* Trust micro-line */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.56 }}
                className="text-xs text-muted-foreground/70"
              >
                Free forever · No credit card needed · 73% still active after 30 days
              </motion.p>
            </motion.div>

            {/* ── RIGHT: Cinematic hero animation ──────────────── */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative hidden lg:block"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/20" style={{ aspectRatio: "16/10" }}>
                {/* Outer glow ring */}
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/30 via-transparent to-chart-2/20 z-10 pointer-events-none" />
                <HeroAnimation className="absolute inset-0 w-full h-full" />
              </div>
            </motion.div>

          </div>

          {/* Mobile/tablet hero visual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="lg:hidden mt-10 pb-6 w-full max-w-sm mx-auto"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/20" style={{ aspectRatio: "16/10" }}>
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/30 via-transparent to-chart-2/20 z-10 pointer-events-none" />
              <HeroAnimation className="absolute inset-0 w-full h-full" />
            </div>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-1.5"
        >
          <p className="text-[10px] text-muted-foreground/50 tracking-widest uppercase">Scroll</p>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground/30" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Social proof stats strip ───────────────────────────── */}
      <section className="py-8 sm:py-10 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <AnimatedStat value={10000} suffix="+" label="Active users"              icon={Users}      />
            <AnimatedStat value={340000} suffix="+" label="Habits tracked"           icon={CheckSquare} />
            <div className="flex flex-col items-center gap-1">
              <Star className="w-4 h-4 text-primary mb-1 opacity-70" />
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums block">
                4.8<span className="text-base font-semibold">/5</span>
              </span>
              <p className="text-xs text-muted-foreground">Average rating</p>
            </div>
            <AnimatedStat value={73} suffix="%" label="Still active after 30 days"   icon={Flame}       />
          </div>
        </div>
      </section>

      {/* ── Goals vs Systems ────────────────────────────────────── */}
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
                  {["Get fit", "Read more books", "Be more productive", "Learn a new skill", "Eat healthier"].map((goal) => (
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
                  {["Walk 20 min every morning", "Read 10 pages after dinner", "Write for 15 min before work", "Practice 20 min after breakfast", "Cook one new recipe on Sundays"].map((system) => (
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
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-2xl px-6 py-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-sm text-foreground font-medium">
                Strivo turns your vague goals into specific daily systems — in under 5 minutes.
              </p>
            </div>
          </div>
          {/* What a system includes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: UserCircle2, label: "An identity",      sub: "Who you're building yourself into — not just what you want to do.", color: "text-primary bg-primary/10"  },
              { icon: Zap,         label: "A minimum action", sub: "The smallest version that still counts — keeps you going on bad days.", color: "text-chart-4 bg-chart-4/10" },
              { icon: RefreshCw,   label: "A recovery plan",  sub: "A pre-built path back after a miss — no guilt, no restart Mondays.", color: "text-chart-3 bg-chart-3/10"  },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center gap-2.5 p-5 rounded-2xl border bg-background/60 text-center">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <p className="font-semibold text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section id="how-it-works" className="py-14 sm:py-20 md:py-24 px-4 border-t border-border bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <Badge variant="secondary" className="mb-3 text-xs">Simple as 1-2-3</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">How Strivo works</h2>
            <p className="text-muted-foreground text-base md:text-lg">Set up in 60 seconds. Designed to keep working when motivation disappears.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-0 sm:gap-10">
            {steps.map((s, i) => (
              <div key={s.step}>
                <div className="relative text-center pb-2 sm:pb-0">
                  {/* Desktop horizontal connector */}
                  {i < steps.length - 1 && (
                    <div className="hidden sm:block absolute top-9 left-[calc(50%+3.5rem)] right-[-1rem] h-px border-t-2 border-dashed border-primary/25" />
                  )}
                  <div className="relative w-18 h-18 mx-auto mb-5">
                    <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
                      <s.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border-2 border-primary text-primary text-xs font-extrabold flex items-center justify-center shadow-sm">
                      {s.step}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                </div>
                {/* Mobile vertical connector */}
                {i < steps.length - 1 && (
                  <div className="flex flex-col items-center gap-1 py-4 sm:hidden">
                    <div className="w-px h-5 bg-primary/25" />
                    <ChevronDown className="w-4 h-4 text-primary/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature highlights (8 cards) ────────────────────────── */}
      <section id="features" className="py-14 sm:py-20 md:py-24 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <Badge variant="secondary" className="mb-3 text-xs">Everything you need</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Simple tools. Powerful results.</h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
              Everything built around one idea: make it easier to show up on hard days.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {allFeatures.map((f) => (
              <Card key={f.title} className="card-interactive border-border/60 transition-all">
                <CardContent className="p-4 sm:p-5">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-3 ${f.color}`}>
                    <f.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <h3 className="font-semibold text-xs sm:text-sm mb-1.5 leading-snug">{f.title}</h3>
                  <p className="text-muted-foreground text-[11px] sm:text-xs leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tabbed product showcase ──────────────────────────────── */}
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
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-2xl mx-auto mb-8 h-auto p-1 gap-1 bg-muted rounded-2xl">
              <TabsTrigger value="onboarding"     className="rounded-xl text-xs py-2.5 leading-tight data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-onboarding">
                <span className="sm:hidden">Setup</span><span className="hidden sm:inline">Personalization</span>
              </TabsTrigger>
              <TabsTrigger value="system-builder" className="rounded-xl text-xs py-2.5 leading-tight data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-system-builder">
                <span className="sm:hidden">Builder</span><span className="hidden sm:inline">System Builder</span>
              </TabsTrigger>
              <TabsTrigger value="checkin"        className="rounded-xl text-xs py-2.5 leading-tight data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-checkin">
                <span className="sm:hidden">Check-In</span><span className="hidden sm:inline">Daily Check-In</span>
              </TabsTrigger>
              <TabsTrigger value="analytics"      className="rounded-xl text-xs py-2.5 leading-tight data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-analytics">
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Mobile text — shown above preview on smaller screens */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + "-mobile"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden text-center mb-6 px-2"
            >
              <h3 className="text-xl sm:text-2xl font-bold mb-2 leading-snug">{TAB_META[activeTab].heading}</h3>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-md mx-auto">{TAB_META[activeTab].body}</p>
            </motion.div>
          </AnimatePresence>

          <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-14 lg:items-center max-w-4xl mx-auto">
              <div className="hidden lg:block">
                <AnimatePresence mode="wait">
                  <motion.div key={activeTab} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                    <h3 className="text-2xl font-bold mb-3 leading-snug">{TAB_META[activeTab].heading}</h3>
                    <p className="text-muted-foreground leading-relaxed">{TAB_META[activeTab].body}</p>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="w-full max-w-xs sm:max-w-sm mx-auto lg:max-w-none">
                <TabsContent value="onboarding"     className="mt-0"><OnboardingPreview /></TabsContent>
                <TabsContent value="system-builder" className="mt-0"><SystemBuilderPreview /></TabsContent>
                <TabsContent value="checkin"        className="mt-0"><CheckInPreview /></TabsContent>
                <TabsContent value="analytics"      className="mt-0"><AnalyticsPreview /></TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </section>

      {/* ── Templates ────────────────────────────────────────────── */}
      <section id="templates" className="py-14 sm:py-20 md:py-24 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <Badge variant="secondary" className="mb-3 text-xs">Don't start from scratch</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Start with a proven template</h2>
            <p className="text-muted-foreground text-base md:text-lg">
              Not sure what system to build? Pick one — already proven to work.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: "💪", name: "Morning Movement",  category: "Fitness",       desc: "5 pushups after brushing teeth",                   time: "~5 min/day",  difficulty: "Easy",   users: "2,400+" },
              { icon: "📚", name: "Daily Reading",     category: "Learning",      desc: "1 page before bed",                                time: "~10 min/day", difficulty: "Easy",   users: "1,900+" },
              { icon: "🧘", name: "Mindful Morning",   category: "Mindfulness",   desc: "3 minutes of breathing after waking up",           time: "~3 min/day",  difficulty: "Easy",   users: "1,600+" },
              { icon: "✍️", name: "Daily Writing",     category: "Creativity",    desc: "100 words at 8am",                                 time: "~15 min/day", difficulty: "Medium", users: "870+"   },
              { icon: "💧", name: "Hydration Habit",   category: "Health",        desc: "Drink a glass of water with each meal",            time: "~0 min/day",  difficulty: "Easy",   users: "1,200+" },
              { icon: "🎯", name: "Focus Block",       category: "Productivity",  desc: "25-min deep work before email",                    time: "~25 min/day", difficulty: "Medium", users: "1,100+" },
            ].map((t) => (
              <Link key={t.name} href="/signup">
                <Card className="hover-elevate border-border/60 cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md h-full">
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
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{t.desc}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> {t.users} using this
                      </p>
                      <span className="text-[10px] text-primary font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        Use this <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
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

      {/* ── Built honestly / trust ───────────────────────────────── */}
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
                    <p className="text-sm font-semibold">The Strivo Team</p>
                    <p className="text-xs text-muted-foreground">Independent product · Built for consistency</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-4">
              {[
                { icon: Shield, title: "Honest about what we are", body: "We're early-stage and growing. Our testimonials reflect real experiences. We'd rather earn your trust than overpromise."            },
                { icon: Brain,  title: "Grounded in research", body: "The builder is based on BJ Fogg's Tiny Habits, identity theory, and implementation intentions."         },
                { icon: Heart,  title: "Privacy-first",        body: "Your habits and journals are private to you. We don't sell data or show ads."                          },
              ].map(item => (
                <div key={item.title} className="flex gap-3 p-4 rounded-2xl border bg-background/60">
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

      {/* ── Testimonials (horizontal scroll on mobile) ─────────── */}
      <section className="py-14 sm:py-20 md:py-24 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <Badge variant="secondary" className="mb-3 text-xs">From our community</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Real results from real people</h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto mb-6">
              Honest stories from people who stopped restarting and started building systems that stick.
            </p>
            {/* Stat banner */}
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 sm:gap-8 bg-primary/5 border border-primary/15 rounded-2xl px-6 py-4 max-w-2xl mx-auto">
              {[
                { value: "73%", label: "Still active after 30 days" },
                { value: "4.8★", label: "Average user rating" },
                { value: "2.1×", label: "More consistent than goals alone" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-xl font-extrabold text-primary">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Responsive grid: 1-col mobile, 2-col tablet, 3-col desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-border/60 flex flex-col">
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 text-chart-4 fill-chart-4" />)}
                    {t.verified && (
                      <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5 gap-0.5 flex-shrink-0">
                        <Check className="w-2.5 h-2.5" /> Strivo user
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed flex-1 mb-4">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-2.5">
                    <img
                      src={`https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(t.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
                      alt={`${t.name} profile photo`} loading="lazy" width={36} height={36}
                      className="w-9 h-9 rounded-full flex-shrink-0 object-cover bg-muted border border-border/40"
                    />
                    <div>
                      <p className="text-sm font-semibold leading-none mb-0.5">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role} · {t.goal}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section id="pricing" className="py-14 sm:py-20 md:py-24 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <Badge variant="secondary" className="mb-3 text-xs">Simple pricing</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Start free. Upgrade when you're ready.</h2>
            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <span className={cn("text-sm", !billingYearly && "font-semibold text-foreground", billingYearly && "text-muted-foreground")}>Monthly</span>
              <button
                onClick={() => setBillingYearly(!billingYearly)}
                aria-label={`Switch to ${billingYearly ? "monthly" : "yearly"} billing`}
                className={cn("relative w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", billingYearly ? "bg-primary" : "bg-muted-foreground/30")}
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

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  "relative flex flex-col hover-elevate transition-all duration-200",
                  plan.badge ? "border-primary/50 shadow-xl shadow-primary/20 sm:scale-[1.03] bg-primary/[0.025]" : "border-border/60",
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="gradient-brand text-white text-xs px-3 py-1 border-0 shadow-sm">{plan.badge}</Badge>
                  </div>
                )}
                <CardContent className="p-5 flex flex-col flex-1 pt-6">
                  <p className="text-sm font-bold mb-1">{plan.name}</p>
                  <p className="text-xs text-muted-foreground mb-3">{plan.tagline}</p>
                  <div className="flex items-end gap-0.5 mb-5">
                    <span className="text-3xl font-extrabold">{billingYearly ? plan.yearlyPrice : plan.price}</span>
                    <span className="text-muted-foreground text-sm mb-1">{plan.period}</span>
                    {billingYearly && plan.name !== "Free" && (
                      <span className="text-[10px] text-chart-3 mb-1 ml-1">billed yearly</span>
                    )}
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

          {/* Guarantee strip */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mt-6 py-4 border-y border-border/50">
            {[
              { icon: Shield, text: "No contracts · Cancel anytime" },
              { icon: RefreshCw, text: "30-day money-back guarantee" },
              { icon: Trophy, text: "Free plan available — no card needed" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 text-xs text-muted-foreground">
                <item.icon className="w-3.5 h-3.5 text-chart-3 flex-shrink-0" />
                {item.text}
              </div>
            ))}
          </div>

          {/* Quick comparison — mobile: 2-card side-by-side; desktop: full table */}
          <div className="mt-8 max-w-3xl mx-auto">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Quick comparison</p>

            {/* Mobile version — 2-column card (Free vs Pro) */}
            <div className="md:hidden grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs font-bold mb-3">Free</p>
                <ul className="space-y-2">
                  {[
                    ["Goals",       "2"],
                    ["Systems",     "3"],
                    ["AI Coach",    "✗"],
                    ["Analytics",   "Basic"],
                    ["Templates",   "3 starter"],
                    ["Support",     "Community"],
                  ].map(([label, value]) => (
                    <li key={label} className="flex items-center justify-between gap-1 text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={cn("font-semibold", value === "✗" ? "text-muted-foreground/40" : "text-foreground")}>{value}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-primary/40 bg-primary/[0.025] p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <p className="text-xs font-bold text-primary">Pro</p>
                  <Badge className="gradient-brand text-white text-[9px] px-1.5 py-0 border-0 h-4">Popular</Badge>
                </div>
                <ul className="space-y-2">
                  {[
                    ["Goals",       "Unlimited"],
                    ["Systems",     "Unlimited"],
                    ["AI Coach",    "✓ 10/day"],
                    ["Analytics",   "Advanced"],
                    ["Templates",   "Full library"],
                    ["Support",     "Priority"],
                  ].map(([label, value]) => (
                    <li key={label} className="flex items-center justify-between gap-1 text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={cn("font-semibold", value.startsWith("✓") ? "text-primary" : "text-foreground")}>{value}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-span-2 text-center">
                <Link href="/pricing" className="text-xs text-primary hover:underline underline-offset-2">
                  See all 4 plans and full feature list →
                </Link>
              </div>
            </div>

            {/* Desktop version — full table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left p-3 font-semibold text-muted-foreground">Feature</th>
                    <th className="p-3 font-semibold text-center">Free</th>
                    <th className="p-3 font-semibold text-center">Starter</th>
                    <th className="p-3 font-semibold text-center text-primary">Pro</th>
                    <th className="p-3 font-semibold text-center text-chart-4">Elite</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    ["Goal limit",            "2",   "10",  "∞",    "∞"   ],
                    ["System limit",          "3",   "∞",   "∞",    "∞"   ],
                    ["AI Coach",              "✗",   "✗",   "✓",    "✓"   ],
                    ["AI msgs/day",           "✗",   "✗",   "10",   "∞"   ],
                    ["Advanced analytics",    "✗",   "✗",   "✓",    "✓"   ],
                    ["AI analytics insights", "✗",   "✗",   "✓",    "✓"   ],
                    ["Full templates",        "✗",   "✓",   "✓",    "✓"   ],
                    ["AI journal prompt",     "✗",   "✗",   "✓",    "✓"   ],
                    ["CSV/PDF export",        "✗",   "✗",   "✓",    "✓"   ],
                    ["Future self audio",     "✗",   "✓",   "✓",    "✓"   ],
                    ["Priority support",      "✗",   "✗",   "✓",    "✓"   ],
                    ["Team workspace",        "✗",   "✗",   "✗",    "✓"   ],
                    ["Coach dashboard",       "✗",   "✗",   "✗",    "✓"   ],
                  ] as const).map(([feature, free, starter, pro, elite]) => (
                    <tr key={feature} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-3 text-muted-foreground">{feature}</td>
                      <td className={`p-3 text-center ${free === "✗" ? "text-muted-foreground/40" : "text-foreground/60 font-semibold"}`}>{free}</td>
                      <td className={`p-3 text-center ${starter === "✗" ? "text-muted-foreground/40" : "text-foreground/80 font-semibold"}`}>{starter}</td>
                      <td className={`p-3 text-center ${pro === "✗" ? "text-muted-foreground/40" : "font-semibold text-primary"}`}>{pro}</td>
                      <td className={`p-3 text-center ${(elite as string) === "✗" ? "text-muted-foreground/40" : "font-semibold text-chart-4"}`}>{elite}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" className="py-14 sm:py-20 md:py-24 px-4 border-t border-border bg-muted/20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <Badge variant="secondary" className="mb-3 text-xs">Questions answered</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Frequently asked questions</h2>
            <p className="text-muted-foreground text-base md:text-lg">Still unsure?{" "}
              <a href="mailto:support@strivo.life" className="underline underline-offset-2 hover:text-foreground transition-colors">Ask us anything</a>.
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

      {/* ── Final CTA banner ─────────────────────────────────────── */}
      <section className="py-14 sm:py-20 md:py-24 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden gradient-brand p-8 sm:p-12 md:p-16 text-white">
            <div className="absolute inset-0 opacity-10 bg-white rounded-full scale-150 -translate-y-1/2 pointer-events-none" />
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 opacity-0 sm:opacity-100">
              <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-[10px] text-white/80">
                🔥 73% still active after 30 days
              </div>
            </div>
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 sm:mb-4 opacity-80" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 leading-tight">
              You don't need a better mood.
            </h2>
            <p className="text-white/80 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 max-w-xl mx-auto leading-relaxed">
              You need a system that still works in a bad one. Build yours in 60 seconds — free, no credit card needed.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="btn-scale bg-white text-primary hover:bg-white/90 gap-2 h-12 px-8 text-base font-semibold shadow-lg rounded-full w-full sm:w-auto"
                  data-testid="button-final-cta"
                >
                  Build My First System — Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 h-12 px-8 text-base font-semibold rounded-full border-white/40 text-white hover:bg-white/10 bg-transparent w-full sm:w-auto"
                  data-testid="button-final-signin"
                >
                  Sign in to my account
                </Button>
              </Link>
            </div>
            <p className="text-white/60 text-xs">No credit card · Takes 60 seconds · Cancel anytime</p>
          </div>

          {/* Newsletter strip below CTA */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">Prefer to try before committing? Get free weekly habit tips.</p>
            <div className="max-w-md mx-auto">
              <EmailCaptureForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="py-8 sm:py-12 px-4 border-t border-border bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 mb-8 sm:mb-10">
            {/* Brand */}
            <div className="sm:w-52 flex-shrink-0">
              <div className="flex items-center mb-3">
                <SiteLogo className="h-7" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Built for people who are tired of starting over.
              </p>
              <p className="text-[11px] text-muted-foreground/70 mb-4">
                Not another habit tracker — a system that survives real life.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://twitter.com/strivoapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center text-muted-foreground transition-colors"
                  aria-label="Follow Strivo on X (Twitter)"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </a>
                <a
                  href="mailto:support@strivo.life"
                  className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center text-muted-foreground transition-colors"
                  aria-label="Email Strivo support"
                >
                  <Mail className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Nav links — 3 equal columns on mobile + desktop */}
            <div className="flex-1 grid grid-cols-3 gap-4 sm:gap-8">
              {/* Product links */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Product</p>
                <div className="flex flex-col gap-2">
                  <a href="#features"    className="text-xs text-muted-foreground hover:text-foreground transition-colors">Features</a>
                  <a href="#how-it-works"className="text-xs text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
                  <a href="#templates"   className="text-xs text-muted-foreground hover:text-foreground transition-colors">Templates</a>
                  <a href="#pricing"     className="text-xs text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
                  <a href="#faq"         className="text-xs text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
                </div>
              </div>
              {/* Account links */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Account</p>
                <div className="flex flex-col gap-2">
                  <Link href="/signup"    className="text-xs text-muted-foreground hover:text-foreground transition-colors">Start Free</Link>
                  <Link href="/login"     className="text-xs text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
                  <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
                  <Link href="/pricing"   className="text-xs text-muted-foreground hover:text-foreground transition-colors">Plans</Link>
                </div>
              </div>
              {/* Legal */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Legal</p>
                <div className="flex flex-col gap-2">
                  <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
                  <Link href="/terms"   className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
                  <Link href="/support" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Support</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Strivo. All rights reserved.</p>
            <p className="text-xs text-muted-foreground text-center sm:text-right">Not another habit tracker. A system that survives real life.</p>
          </div>
        </div>
      </footer>

      {/* ── Sticky mobile CTA bar ────────────────────────────────── */}
      <MobileCtaBar ctaVariant={ctaVariant} />
    </div>
  );
}
