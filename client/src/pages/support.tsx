import { useState } from "react";
import { Link } from "wouter";
import { SiteLogo } from "@/components/site-logo";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Mail,
  MessageCircle,
  BookOpen,
  Zap,
  Shield,
  CreditCard,
  BarChart2,
  Bot,
  Globe,
} from "lucide-react";

const faqs = [
  {
    category: "Getting Started",
    icon: Zap,
    items: [
      {
        q: "What is a 'system' in Strivo?",
        a: "A system is a structured habit built around a trigger, a minimum action, and a reward loop. Instead of setting a vague goal like 'exercise more', you build a system: 'After my morning coffee (trigger), I do 5 push-ups (minimum action), then reward myself with 10 minutes of reading.' This approach focuses on identity and consistency over willpower.",
      },
      {
        q: "How do I create my first system?",
        a: "Head to the Systems page and click 'New System'. The System Builder wizard will guide you through 7 steps — from defining your identity to setting up your trigger, minimum action, fallback plan, and reward. It takes about 5 minutes.",
      },
      {
        q: "What's the difference between a Goal and a System?",
        a: "A Goal is an outcome you want to achieve (e.g. 'Run a 5K'). A System is the daily process that gets you there (e.g. 'Put on running shoes every morning and run for at least 1 minute'). Strivo encourages you to define both — goals give direction, systems build momentum.",
      },
      {
        q: "Can I use templates instead of building from scratch?",
        a: "Yes! Visit the Templates page to find pre-built systems for Fitness, Focus, Sleep, Learning, and more. You can adopt a template directly or customise it to fit your life.",
      },
    ],
  },
  {
    category: "Account & Settings",
    icon: Shield,
    items: [
      {
        q: "How do I reset my password?",
        a: "On the login page, click 'Forgot password?' and enter your email address. We'll send you a reset link within a few minutes. Check your spam folder if it doesn't arrive.",
      },
      {
        q: "Can I change my email address?",
        a: "Yes — go to Settings → Account and update your email. You'll receive a verification email at the new address before the change takes effect.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Settings → Danger Zone and click 'Delete Account'. This is permanent and removes all your data (goals, systems, check-ins, journal entries) within 30 days. Make sure to export any data you want to keep first.",
      },
      {
        q: "How do I change my display name or avatar?",
        a: "Visit Settings → Profile. You can update your name and upload a new profile photo there.",
      },
    ],
  },
  {
    category: "Billing & Plans",
    icon: CreditCard,
    items: [
      {
        q: "Is Strivo really free?",
        a: "Yes — the Free plan lets you create unlimited goals and systems, track check-ins, and access core analytics at no cost. Paid plans unlock premium features like advanced analytics, AI coaching, CSV exports, and priority support.",
      },
      {
        q: "How do I upgrade my plan?",
        a: "Go to Pricing (link in the nav) and select a plan. You'll be taken to a secure Stripe checkout. Once payment is confirmed, your account is upgraded instantly.",
      },
      {
        q: "Can I cancel my subscription at any time?",
        a: "Absolutely. You can cancel anytime from Settings → Billing. Your paid features remain active until the end of your current billing period, and you won't be charged again.",
      },
      {
        q: "Do you offer refunds?",
        a: "We offer a 7-day money-back guarantee on all paid plans. If you're not satisfied, email us at support@strivo.life within 7 days of your first payment and we'll refund you in full — no questions asked.",
      },
    ],
  },
  {
    category: "Analytics & Tracking",
    icon: BarChart2,
    items: [
      {
        q: "How are streaks calculated?",
        a: "A streak counts consecutive days on which you completed at least one check-in marked as done. Missing a day resets the streak to zero. The app uses your local time zone to determine day boundaries.",
      },
      {
        q: "What is the consistency rate?",
        a: "Your consistency rate is the percentage of scheduled days on which you completed your system over a given period (default: last 30 days). A rate above 70% is considered excellent — it means your system is realistic and sustainable.",
      },
      {
        q: "Can I export my data?",
        a: "Pro and Elite plan users can export their goals, systems, and check-in history as CSV or PDF from the Analytics page. Free plan users can request a data export by emailing us.",
      },
    ],
  },
  {
    category: "AI Coach",
    icon: Bot,
    items: [
      {
        q: "How does the AI Coach work?",
        a: "The AI Coach is powered by Llama 3 (via Groq) and is specialised in behavioural psychology and habit science. It has context about your systems and check-in history, so it can give personalised advice — not generic tips.",
      },
      {
        q: "Is my conversation with the AI Coach private?",
        a: "Your messages are sent to the AI model to generate a response, but they are not stored permanently or used to train AI models. See our Privacy Policy for full details.",
      },
      {
        q: "The AI Coach isn't responding. What should I do?",
        a: "If the AI Coach shows an error, it's usually a temporary issue with the AI service. Wait a moment and try again. If the problem persists for more than a few minutes, email us at support@strivo.life and include the error message if possible.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        data-testid={`faq-toggle-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="font-medium text-sm">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

export default function Support() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const visible = activeCategory
    ? faqs.filter((c) => c.category === activeCategory)
    : faqs;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Support | Strivo</title>
        <link rel="canonical" href="https://strivo.life/support" />
        <meta
          name="description"
          content="Get help with Strivo. Browse FAQs, learn how the app works, and contact our support team."
        />
      </Helmet>

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <SiteLogo className="h-9" />
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="link-login">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" data-testid="link-signup">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pt-28 pb-24">
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className="mb-8 gap-1.5 -ml-2 text-muted-foreground"
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Button>
        </Link>

        {/* ── Header ── */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Help & Support</h1>
          <p className="text-muted-foreground leading-relaxed">
            Find answers to common questions or reach out to us directly — we're
            happy to help.
          </p>
        </div>

        {/* ── Website creation banner ── */}
        <a
          href="mailto:saifkhan@strivo.life?subject=Website+Creation+Enquiry"
          data-testid="link-website-creation"
          className="flex items-center gap-4 p-5 rounded-2xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors group mb-6"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/25 transition-colors">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm mb-0.5">Need a Website Built?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Want to create any type of website? Get in touch and we'll make it happen.
            </p>
          </div>
          <p className="text-xs text-primary font-semibold shrink-0 hidden sm:block">
            saifkhan@strivo.life →
          </p>
        </a>

        {/* ── Contact cards ── */}
        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          <a
            href="mailto:support@strivo.life"
            data-testid="link-email-support"
            className="flex items-start gap-4 p-5 rounded-2xl border border-border hover:bg-muted/40 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm mb-0.5">Email Support</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We reply within 24 hours on business days.
              </p>
              <p className="text-xs text-primary mt-1.5 font-medium">
                support@strivo.life
              </p>
            </div>
          </a>

          <a
            href="mailto:support@strivo.life?subject=Feature+Request"
            data-testid="link-feature-request"
            className="flex items-start gap-4 p-5 rounded-2xl border border-border hover:bg-muted/40 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm mb-0.5">Feature Requests</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Have an idea that would make Strivo better? Let us know.
              </p>
              <p className="text-xs text-primary mt-1.5 font-medium">
                Share your idea →
              </p>
            </div>
          </a>
        </div>

        {/* ── FAQ ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Frequently Asked Questions</h2>
          </div>

          {/* Category filter pills */}
          <div
            className="flex flex-wrap gap-2 mb-6"
            data-testid="faq-category-filters"
          >
            <button
              onClick={() => setActiveCategory(null)}
              data-testid="faq-filter-all"
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activeCategory === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              All Topics
            </button>
            {faqs.map(({ category, icon: Icon }) => (
              <button
                key={category}
                onClick={() =>
                  setActiveCategory(
                    activeCategory === category ? null : category
                  )
                }
                data-testid={`faq-filter-${category.replace(/\s+/g, "-").toLowerCase()}`}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  activeCategory === category
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                <Icon className="w-3 h-3" />
                {category}
              </button>
            ))}
          </div>

          <div className="space-y-8">
            {visible.map(({ category, icon: Icon, items }) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {category}
                  </h3>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <FAQItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Still stuck CTA ── */}
        <div className="mt-12 rounded-2xl border border-border bg-muted/30 p-6 text-center">
          <p className="font-semibold mb-1">Still have a question?</p>
          <p className="text-sm text-muted-foreground mb-4">
            We're a small team and we personally read every message.
          </p>
          <a href="mailto:support@strivo.life" data-testid="button-contact-us">
            <Button>Contact Us</Button>
          </a>
        </div>

        {/* ── Footer links ── */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row gap-3">
          <Link href="/privacy">
            <Button variant="outline" size="sm">Privacy Policy</Button>
          </Link>
          <Link href="/terms">
            <Button variant="outline" size="sm">Terms of Service</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
