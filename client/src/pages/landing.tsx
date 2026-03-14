import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles, Target, Zap, CheckSquare, TrendingUp, BookOpen,
  ArrowRight, ChevronRight, Shield, Repeat, Brain, Star,
} from "lucide-react";

const features = [
  { icon: Target, title: "Smart Goal Management", desc: "Define clear goals with deadlines, categories, and priorities. Never lose sight of what matters." },
  { icon: Zap, title: "System Builder", desc: "Transform vague intentions into actionable systems with identity, triggers, minimum actions, and fallback plans." },
  { icon: CheckSquare, title: "Daily Check-ins", desc: "Track your systems every day. Mark done, partial, or missed. Build unstoppable momentum." },
  { icon: TrendingUp, title: "Analytics & Streaks", desc: "See your consistency over time. Celebrate streaks. Identify patterns. Improve what's not working." },
  { icon: BookOpen, title: "Reflective Journaling", desc: "End each day with intentional reflection. Process your wins, learn from setbacks, and grow faster." },
  { icon: Brain, title: "Template Library", desc: "Start with proven system templates for fitness, study, mindset, business, and more." },
];

const steps = [
  { step: "01", title: "Set a Goal", desc: "Define what you want to achieve with clarity and a deadline." },
  { step: "02", title: "Build a System", desc: "Design a repeatable daily system with triggers, actions, and rewards." },
  { step: "03", title: "Check in Daily", desc: "Mark your progress each day. One tap is all it takes." },
  { step: "04", title: "Grow Consistently", desc: "Watch your streaks climb. Review your analytics. Evolve your systems." },
];

const exampleSystem = {
  goal: "Get fit and build strength",
  identity: "I am someone who moves their body every single day.",
  trigger: "After I brush my teeth each morning, I put on my workout gear.",
  action: "Do at least 5 push-ups — even on the hardest days.",
  reward: "Make my favourite coffee as a post-workout treat.",
  fallback: "If I miss morning, I do 10 squats before bed — no exceptions.",
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md gradient-brand flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm">SystemForge</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="link-login">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" data-testid="link-signup">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6">
            <Sparkles className="w-3 h-3 mr-1.5" />
            Turn goals into systems
          </Badge>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Most people set goals.
            <br />
            <span className="gradient-text">Few build systems.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            A goal gives you direction. A system creates daily progress.
            SystemForge helps you convert vague intentions into powerful,
            repeatable habits that actually stick.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2" data-testid="button-hero-cta">
                Start Building Systems
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" data-testid="button-hero-signin">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Goals without systems are just wishes.
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            You've written down goals before. Maybe in January. Maybe after a bad day.
            But without a clear daily system — a trigger, a minimum action, a fallback plan —
            those goals fade. Life gets busy. Motivation runs out. SystemForge fixes that.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-muted/30 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">How it works</h2>
            <p className="text-muted-foreground text-lg">Four steps to sustainable progress</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div key={s.step} className="relative text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold text-base mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Everything you need to succeed</h2>
            <p className="text-muted-foreground text-lg">A complete toolkit for building lasting systems</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f) => (
              <Card key={f.title} className="hover-elevate">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* System Example */}
      <section className="py-20 px-4 bg-muted/30 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">See a system in action</h2>
            <p className="text-muted-foreground text-lg">From goal to daily habit in minutes</p>
          </div>
          <Card>
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-semibold text-lg">{exampleSystem.goal}</span>
              </div>
              <div className="grid gap-4">
                {[
                  { label: "Identity", value: exampleSystem.identity, color: "text-primary" },
                  { label: "Trigger", value: exampleSystem.trigger, color: "text-chart-2" },
                  { label: "Minimum Action", value: exampleSystem.action, color: "text-chart-3" },
                  { label: "Reward", value: exampleSystem.reward, color: "text-chart-4" },
                  { label: "Fallback Plan", value: exampleSystem.fallback, color: "text-chart-5" },
                ].map((item) => (
                  <div key={item.label} className="flex gap-3 items-start p-3 rounded-md bg-muted/50">
                    <span className={`text-xs font-bold uppercase tracking-wide ${item.color} mt-0.5 w-28 flex-shrink-0`}>{item.label}</span>
                    <span className="text-sm text-foreground leading-relaxed">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 border-t border-border text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-xl gradient-brand flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to stop setting goals and start building systems?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join thousands who've turned their vague aspirations into consistent daily action.
          </p>
          <Link href="/signup">
            <Button size="lg" className="gap-2" data-testid="button-footer-cta">
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded gradient-brand flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-sm font-medium">SystemForge</span>
          </div>
          <p className="text-sm text-muted-foreground">Built to help you build systems that last.</p>
        </div>
      </footer>
    </div>
  );
}
