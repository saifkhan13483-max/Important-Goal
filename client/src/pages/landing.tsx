import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles, Target, Zap, CheckSquare, TrendingUp, BookOpen,
  ArrowRight, Shield, Brain, Star, Check, ChevronDown,
  Flame, LayoutGrid, Users, Lightbulb, Heart, Quote,
  BarChart2, Clock, RefreshCw, HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Target,
    title: "Set Clear Goals",
    desc: "Write down what you want. Give it a deadline and a category. See all your goals in one place — no more scattered notes.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Zap,
    title: "Build Your Daily System",
    desc: "Turn each goal into a simple daily action. We guide you step by step — no guessing required.",
    color: "bg-chart-2/10 text-chart-2",
  },
  {
    icon: CheckSquare,
    title: "Check In Every Day",
    desc: "One tap to mark your habit done, partial, or missed. Takes less than 10 seconds. Builds real momentum.",
    color: "bg-chart-3/10 text-chart-3",
  },
  {
    icon: Flame,
    title: "Build Streaks",
    desc: "Watch your consistency grow day by day. Streaks keep you motivated and show you that you're truly changing.",
    color: "bg-chart-4/10 text-chart-4",
  },
  {
    icon: BarChart2,
    title: "See Your Progress",
    desc: "Simple charts show you how consistent you've been. Spot patterns. Celebrate wins. Adjust what's not working.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: BookOpen,
    title: "Reflect & Grow",
    desc: "A short journal prompt each day helps you process what's working and what isn't — so you grow faster.",
    color: "bg-chart-2/10 text-chart-2",
  },
];

const steps = [
  {
    step: "1",
    title: "Tell us your goal",
    desc: "Write down what you want to achieve. It can be anything — fitness, learning, focus, creativity.",
    icon: Target,
  },
  {
    step: "2",
    title: "Build a simple daily system",
    desc: "We walk you through 7 quick questions that turn your goal into a clear, daily action you can actually do.",
    icon: Zap,
  },
  {
    step: "3",
    title: "Check in every day",
    desc: "Mark your habit done or missed. One tap. No pressure. Small actions, done consistently, beat big plans done rarely.",
    icon: CheckSquare,
  },
];

const transformation = {
  goal: "I want to get fit",
  system: {
    identity: "I am someone who moves their body every day.",
    trigger: "After I brush my teeth in the morning…",
    action: "I do 5 pushups — that's the minimum. I can always do more.",
    reward: "I make my favourite coffee as a reward.",
    backup: "If I miss morning, I do 10 squats before bed. No excuses, just 10.",
  },
};

const testimonials = [
  {
    name: "Priya M.",
    role: "Freelance Designer",
    avatar: "PM",
    quote: "I've tried every productivity app. SystemForge is the first one that helped me actually understand WHY I kept failing. The system builder changed everything.",
    rating: 5,
  },
  {
    name: "James O.",
    role: "Software Engineer",
    avatar: "JO",
    quote: "The identity step blew my mind. Instead of 'I want to exercise', I now say 'I am someone who moves daily'. That mindset shift was worth the whole app.",
    rating: 5,
  },
  {
    name: "Fatima K.",
    role: "Teacher",
    avatar: "FK",
    quote: "I was a complete beginner to habit-building. The wizard held my hand through every step. I've kept my reading habit for 47 days straight!",
    rating: 5,
  },
];

const faqs = [
  {
    q: "Do I need to know anything about habits or productivity to use this?",
    a: "Not at all. SystemForge is designed for complete beginners. Every step has a plain-language explanation and an example. You just answer simple questions and we build the system for you.",
  },
  {
    q: "What's the difference between a goal and a system?",
    a: "A goal is what you want — 'run a marathon'. A system is how you get there every single day — 'after breakfast, I put on my shoes and walk for 10 minutes'. Goals give direction. Systems create daily progress.",
  },
  {
    q: "How much time does it take each day?",
    a: "Checking in takes under 30 seconds. Building a system for the first time takes about 5 minutes with our guided wizard. That's it.",
  },
  {
    q: "What if I miss a day?",
    a: "Missing a day is normal. That's exactly why we help you create a 'backup plan' — a smaller version of your habit you can always do, even on your worst days. One missed day is never a failure.",
  },
  {
    q: "Can I use this for any kind of goal?",
    a: "Yes. Users track fitness, study habits, creative work, mindfulness, business tasks, relationships, and much more. If it's something you want to do consistently, SystemForge can help.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes! The free plan lets you create 2 goals and 3 systems — which is plenty to get started and see results. You can upgrade anytime if you want more.",
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
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
    cta: "Start for free",
    ctaVariant: "outline" as const,
    href: "/signup",
  },
  {
    name: "Starter",
    price: "$9",
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
    cta: "Get Starter",
    ctaVariant: "outline" as const,
    href: "/signup",
  },
  {
    name: "Pro",
    price: "$19",
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
    cta: "Get Pro",
    ctaVariant: "default" as const,
    href: "/signup",
  },
  {
    name: "Team / Coach",
    price: "$49",
    period: "/month",
    tagline: "For coaches and accountability groups",
    badge: null,
    features: [
      "Everything in Pro",
      "Multi-user workspace",
      "Team progress overview",
      "Shared templates",
      "Accountability tracking",
      "Coach dashboard",
      "Group analytics",
      "Priority onboarding support",
    ],
    cta: "Get Team",
    ctaVariant: "outline" as const,
    href: "/signup",
  },
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
        <ChevronDown
          className={cn("w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  const [billingYearly, setBillingYearly] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md gradient-brand flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">SystemForge</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="link-login">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="gap-1.5" data-testid="link-signup">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/8 rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-chart-2/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 px-3 py-1.5 text-xs font-medium gap-1.5">
            <Sparkles className="w-3 h-3" />
            The habit system that actually works
          </Badge>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            Most people set goals.
            <br />
            <span className="gradient-text">Few build systems.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed">
            A goal gives you direction. A system creates daily progress.
          </p>
          <p className="text-base text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            SystemForge guides you — step by step — to turn any goal into a simple, repeatable daily habit. No jargon. No overwhelm. Just clear, friendly guidance.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mb-10">
            <Link href="/signup">
              <Button size="lg" className="gap-2 h-12 px-6 text-base" data-testid="button-hero-cta">
                Start Building for Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-12 px-6 text-base" data-testid="button-hero-signin">
                Sign In
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Free forever · No credit card required · Takes 2 minutes to set up
          </p>
        </div>
      </section>

      {/* ── Problem section ── */}
      <section className="py-20 px-4 border-t border-border bg-muted/20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive rounded-full px-4 py-1.5 text-xs font-semibold mb-6">
            Sound familiar?
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
            "I keep setting goals, but nothing sticks."
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            You've written goals in a notebook. In a notes app. On a whiteboard. In January.
            But life gets busy, motivation runs out, and the goals disappear.
          </p>
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 text-left max-w-xl mx-auto">
            <p className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">The real problem</p>
            <div className="space-y-3">
              {[
                { problem: "Goals are too vague", fix: "Systems are specific and daily" },
                { problem: "Motivation always fades", fix: "Systems don't rely on motivation" },
                { problem: "Missing a day feels like failure", fix: "Your backup plan keeps you going" },
                { problem: "You don't know what to do next", fix: "We guide every step" },
              ].map((item) => (
                <div key={item.problem} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-destructive text-xs font-bold">✗</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground line-through">{item.problem}</span>
                    <span className="text-sm text-foreground font-medium"> → {item.fix}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 text-xs">Simple as 1-2-3</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">How SystemForge works</h2>
            <p className="text-muted-foreground text-lg">Three steps. That's it. No complicated setup.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.step} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] right-0 h-px border-t border-dashed border-border" />
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

      {/* ── Goal → System transformation example ── */}
      <section className="py-24 px-4 bg-muted/20 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 text-xs">Real example</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">See exactly what a system looks like</h2>
            <p className="text-muted-foreground text-lg">A vague goal becomes a clear daily action in minutes.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 items-start">
            {/* Before */}
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
                    <span className="text-destructive text-xs font-bold">✗</span>
                  </div>
                  <span className="text-xs font-semibold text-destructive uppercase tracking-wide">Just a goal</span>
                </div>
                <p className="text-xl font-bold text-foreground mb-2">"{transformation.goal}"</p>
                <p className="text-sm text-muted-foreground">Vague. No action. Easy to forget. Will never happen.</p>
              </CardContent>
            </Card>

            {/* After */}
            <Card className="border-chart-3/30 bg-chart-3/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-chart-3/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-chart-3" />
                  </div>
                  <span className="text-xs font-semibold text-chart-3 uppercase tracking-wide">A real system</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Who I'm becoming", value: transformation.system.identity, color: "text-primary" },
                    { label: "When it happens", value: transformation.system.trigger, color: "text-chart-2" },
                    { label: "The smallest action", value: transformation.system.action, color: "text-chart-3" },
                    { label: "My reward", value: transformation.system.reward, color: "text-chart-4" },
                    { label: "My backup plan", value: transformation.system.backup, color: "text-muted-foreground" },
                  ].map((item) => (
                    <div key={item.label} className="p-2.5 rounded-lg bg-background/70 border border-border/50">
                      <p className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${item.color}`}>{item.label}</p>
                      <p className="text-sm text-foreground leading-relaxed">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            SystemForge guides you to build this in under 5 minutes — with examples at every step.
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 text-xs">Everything you need</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Simple tools. Powerful results.</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Every feature is designed to be instantly understandable — even if you've never used a productivity app before.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f) => (
              <Card key={f.title} className="hover-elevate border-border/60 group">
                <CardContent className="p-6">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Template preview ── */}
      <section className="py-24 px-4 bg-muted/20 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 text-xs">Don't start from scratch</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Start with a proven template</h2>
            <p className="text-muted-foreground text-lg">
              Not sure what system to build? Pick one of our templates — already proven to work.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: "💪", name: "Morning Movement", category: "Fitness", desc: "5 pushups after brushing teeth" },
              { icon: "📚", name: "Daily Reading", category: "Learning", desc: "1 page before bed" },
              { icon: "🧘", name: "Mindful Morning", category: "Mindfulness", desc: "3 minutes of breathing after waking up" },
              { icon: "✍️", name: "Daily Writing", category: "Creativity", desc: "100 words at 8am" },
              { icon: "💧", name: "Hydration Habit", category: "Health", desc: "Drink a glass of water with each meal" },
              { icon: "🎯", name: "Focus Block", category: "Productivity", desc: "25-min deep work before email" },
            ].map((t) => (
              <Card key={t.name} className="hover-elevate border-border/60 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{t.name}</p>
                        <Badge variant="secondary" className="text-xs px-1.5">{t.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/signup">
              <Button variant="outline" className="gap-2" data-testid="button-view-templates">
                <LayoutGrid className="w-4 h-4" />
                Browse all templates
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Beginner reassurance ── */}
      <section className="py-24 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 text-xs">Built for beginners</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">You don't need to be a productivity expert</h2>
            <p className="text-muted-foreground text-lg">
              SystemForge is designed for real people with real lives — not productivity gurus.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: Lightbulb,
                title: "Every step is explained",
                desc: "We tell you what to do, why it works, and give you real examples you can use immediately.",
              },
              {
                icon: Heart,
                title: "Missing days is normal",
                desc: "We help you create a backup plan so one bad day never breaks your streak permanently.",
              },
              {
                icon: RefreshCw,
                title: "Start small on purpose",
                desc: "We encourage you to make habits embarrassingly small. That's actually the secret.",
              },
              {
                icon: Shield,
                title: "No judgment. Ever.",
                desc: "The app tracks your data so you can learn, not so you can feel bad about yourself.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-4 rounded-xl border border-border/60 bg-card">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">{item.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 p-5 rounded-xl bg-primary/5 border border-primary/20 text-center">
            <p className="text-sm font-medium text-foreground mb-1">
              💡 The SystemForge promise
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
              "Start small. A good system is easy to repeat. Your goal gives direction — your system creates daily progress. On hard days, your backup plan keeps you moving."
            </p>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 px-4 bg-muted/20 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 text-xs">What users say</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Real people. Real results.</h2>
            <p className="text-muted-foreground text-lg">Beginners and veterans alike are building better habits.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <Card key={t.name} className="hover-elevate border-border/60">
                <CardContent className="p-6">
                  <div className="flex mb-3">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-chart-4 fill-chart-4" />
                    ))}
                  </div>
                  <div className="mb-4">
                    <Quote className="w-5 h-5 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-foreground leading-relaxed">{t.quote}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 text-xs">Simple pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Start free. Grow when you're ready.</h2>
            <p className="text-muted-foreground text-lg mb-8">No tricks. No hidden fees. Cancel anytime.</p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-3 bg-muted rounded-xl p-1">
              <button
                onClick={() => setBillingYearly(false)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  !billingYearly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingYearly(true)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                  billingYearly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                Yearly
                <Badge className="text-xs px-1.5 py-0 bg-chart-3/20 text-chart-3 border-0">Save 20%</Badge>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {pricingPlans.map((plan) => {
              const yearlyPrice = plan.price === "$0" ? "$0" : `$${Math.round(parseInt(plan.price.slice(1)) * 0.8)}`;
              const displayPrice = billingYearly ? yearlyPrice : plan.price;
              const isPro = plan.badge === "Most Popular";
              return (
                <Card
                  key={plan.name}
                  className={cn(
                    "relative flex flex-col border-border/60 hover-elevate",
                    isPro && "border-primary/40 ring-1 ring-primary/20 shadow-md",
                  )}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="gradient-brand text-white border-0 px-3 py-0.5 text-xs shadow-sm">
                        {plan.badge}
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-5 flex flex-col flex-1">
                    <div className="mb-5">
                      <p className="font-bold text-base mb-0.5">{plan.name}</p>
                      <p className="text-xs text-muted-foreground mb-4">{plan.tagline}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold">{displayPrice}</span>
                        <span className="text-sm text-muted-foreground">{plan.price === "$0" ? "" : plan.period}</span>
                      </div>
                      {billingYearly && plan.price !== "$0" && (
                        <p className="text-xs text-chart-3 font-medium mt-1">billed annually</p>
                      )}
                    </div>

                    <div className="space-y-2 mb-6 flex-1">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-muted-foreground leading-snug">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Link href={plan.href}>
                      <Button
                        variant={plan.ctaVariant}
                        className={cn("w-full", isPro && "gradient-brand text-white border-0 hover:opacity-90")}
                        data-testid={`button-pricing-${plan.name.toLowerCase()}`}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-muted-foreground">
              All plans include a 14-day money-back guarantee. Questions?{" "}
              <a href="#faq" className="text-primary underline underline-offset-4">See FAQ</a>
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-4 bg-muted/20 border-t border-border">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 text-xs">Questions</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Frequently asked questions</h2>
            <p className="text-muted-foreground text-lg">Everything you need to know before getting started.</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-28 px-4 border-t border-border text-center relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/6 rounded-full blur-3xl" />
        </div>
        <div className="max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
            Ready to stop setting goals and start building systems?
          </h2>
          <p className="text-muted-foreground text-lg mb-3">
            Join people who've turned vague aspirations into consistent daily action.
          </p>
          <p className="text-sm text-muted-foreground mb-10">
            It starts with one small habit. Then another. Then another.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2 h-12 px-8 text-base" data-testid="button-footer-cta">
                Start Building for Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Free plan · No credit card · 2-minute setup
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded gradient-brand flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-bold">SystemForge</span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
              <Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link>
              <Link href="/signup" className="hover:text-foreground transition-colors">Get started</Link>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">© 2026 SystemForge. Built to help you build systems that last.</p>
            <p className="text-xs text-muted-foreground">
              Small actions done consistently beat big plans done rarely.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
