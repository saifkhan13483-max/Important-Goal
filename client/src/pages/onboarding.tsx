import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, ArrowRight, ArrowLeft, Check, Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/auth.store";

const CONFETTI_COLORS = [
  "#a78bfa", "#818cf8", "#34d399", "#fbbf24", "#f472b6",
  "#60a5fa", "#fb923c", "#e879f9", "#4ade80", "#f87171",
];

function Confetti({ active }: { active: boolean }) {
  const particles = useRef(
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2.5 + Math.random() * 1.5,
      size: 6 + Math.random() * 7,
      rotate: Math.random() * 360,
      shape: Math.random() > 0.5 ? "circle" : "rect",
    }))
  ).current;

  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: -20,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.shape === "rect" ? 0.5 : 1),
            borderRadius: p.shape === "circle" ? "50%" : 2,
            background: p.color,
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

const focusAreas = [
  { value: "fitness",      label: "Fitness & Health",     icon: "💪" },
  { value: "study",        label: "Study & Learning",     icon: "📚" },
  { value: "career",       label: "Career Growth",        icon: "🚀" },
  { value: "business",     label: "Business",             icon: "💼" },
  { value: "relationship", label: "Relationships",        icon: "🤝" },
  { value: "mindset",      label: "Mindset & Well-being", icon: "🧠" },
  { value: "finance",      label: "Finance",              icon: "📈" },
  { value: "creativity",   label: "Creativity",           icon: "🎨" },
  { value: "custom",       label: "Something else…",      icon: "✨" },
];

interface OnboardingData {
  name: string;
  focusArea: string;
  customFocusArea: string;
  identityStatement: string;
}

const STEPS = [
  { id: "name",     title: "Welcome! What should we call you?", skippable: false },
  { id: "identity", title: "Who are you becoming?",             skippable: true  },
  { id: "focus",    title: "What's your primary focus?",        skippable: false },
  { id: "done",     title: "You're all set! 🎉",               skippable: false },
];

export default function Onboarding() {
  const { user, updateProfile, updatePending } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { setTheme } = useAppStore();
  const [step, setStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    name:              user?.name || "",
    focusArea:         "",
    customFocusArea:   "",
    identityStatement: "",
  });

  const current = STEPS[step];
  const total   = STEPS.length;

  const effectiveFocusArea = data.focusArea === "custom"
    ? (data.customFocusArea.trim() || "")
    : data.focusArea;

  useEffect(() => {
    if (current.id === "done") {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(t);
    }
  }, [current.id]);

  const canProceed = () => {
    if (current.id === "name")  return data.name.trim().length >= 2;
    if (current.id === "focus") return !!data.focusArea && (data.focusArea !== "custom" || data.customFocusArea.trim().length >= 2);
    return true;
  };

  const handleNext = async () => {
    if (step < total - 1) {
      setStep(s => s + 1);
      return;
    }

    try {
      await updateProfile({
        name:              data.name.trim() || user?.name,
        focusArea:         effectiveFocusArea || data.focusArea,
        identityStatement: data.identityStatement.trim() || null,
        onboardingCompleted: true,
      } as any);

      navigate("/systems/new");
    } catch {
      toast({
        title:       "Error",
        description: "Failed to save your profile. Please try again.",
        variant:     "destructive",
      });
    }
  };

  const subtitleMap: Record<string, string> = {
    name:     "This is how we'll greet you in the app.",
    identity: "The foundation of every system you'll build.",
    focus:    "Choose the area where you want to build systems first.",
    done:     "Let's build your first system — it takes under 60 seconds.",
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Confetti active={showConfetti} />

      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-6 h-6 text-white" />
          </div>

          <div className="flex justify-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i < step  ? "bg-primary w-5" :
                  i === step ? "bg-primary w-8" :
                  "bg-muted w-4"
                )}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground mb-2">Step {step + 1} of {total}</p>
          <h1 className="text-2xl font-bold">{current.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{subtitleMap[current.id]}</p>
        </div>

        <Card>
          <CardContent className="p-6">

            {current.id === "name" && (
              <div className="space-y-3">
                <Label htmlFor="ob-name">Your name</Label>
                <Input
                  id="ob-name"
                  placeholder="e.g. Alex Johnson"
                  value={data.name}
                  onChange={e => setData(d => ({ ...d, name: e.target.value }))}
                  data-testid="input-onboarding-name"
                  autoFocus
                  className="text-base"
                  onKeyDown={e => { if (e.key === "Enter" && canProceed()) handleNext(); }}
                />
                {data.name.trim().length > 0 && data.name.trim().length < 2 && (
                  <p className="text-xs text-destructive">Name must be at least 2 characters</p>
                )}
              </div>
            )}

            {current.id === "identity" && (
              <div className="space-y-5">
                <div className="bg-primary/8 rounded-xl p-4 border border-primary/20">
                  <p className="text-sm font-semibold text-primary mb-1">Why this matters</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    People who build habits around <strong className="text-foreground">identity</strong> — not just outcomes — are far more consistent.
                    "I am a runner" outlasts "I want to run more."
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-identity" className="text-base font-semibold">Complete this sentence:</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                    <span className="text-sm font-medium text-muted-foreground flex-shrink-0">I AM a person who</span>
                    <input
                      id="ob-identity"
                      placeholder="shows up every day, no matter what."
                      value={data.identityStatement}
                      onChange={e => setData(d => ({ ...d, identityStatement: e.target.value }))}
                      data-testid="input-onboarding-identity"
                      autoFocus
                      className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-muted-foreground/50"
                      onKeyDown={e => { if (e.key === "Enter") handleNext(); }}
                    />
                  </div>
                </div>
                {data.identityStatement.trim() && (
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Your Identity Statement</p>
                    <p className="text-lg font-bold text-foreground leading-snug">
                      "I AM a person who {data.identityStatement.trim()}."
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Examples — click to use:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      "exercises every morning, even if just for 5 minutes",
                      "reads every day and keeps learning",
                      "shows up consistently and follows through",
                    ].map(example => (
                      <button
                        key={example}
                        onClick={() => setData(d => ({ ...d, identityStatement: example }))}
                        className="text-left text-xs p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        "I AM a person who {example}."
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {current.id === "focus" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {focusAreas.map(area => (
                    <button
                      key={area.value}
                      onClick={() => setData(d => ({ ...d, focusArea: area.value }))}
                      data-testid={`button-focus-${area.value}`}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-md border text-left transition-all",
                        data.focusArea === area.value
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      <span className="text-xl">{area.icon}</span>
                      <span className="text-sm font-medium">{area.label}</span>
                    </button>
                  ))}
                </div>
                {data.focusArea === "custom" && (
                  <div className="space-y-2">
                    <Label htmlFor="ob-custom-focus" className="flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5" />
                      Describe your focus area
                    </Label>
                    <Input
                      id="ob-custom-focus"
                      placeholder="e.g. Language learning, parenting, spirituality…"
                      value={data.customFocusArea}
                      onChange={e => setData(d => ({ ...d, customFocusArea: e.target.value }))}
                      data-testid="input-custom-focus-area"
                      autoFocus
                      className="text-base"
                      onKeyDown={e => { if (e.key === "Enter" && canProceed()) handleNext(); }}
                    />
                  </div>
                )}
              </div>
            )}

            {current.id === "done" && (
              <div className="space-y-5 text-center">
                <div className="w-20 h-20 rounded-full gradient-brand flex items-center justify-center mx-auto shadow-lg">
                  <Check className="w-10 h-10 text-white" />
                </div>
                <div>
                  <p className="font-bold text-xl">
                    Ready, {(data.name || user?.name || "there").split(" ")[0]}!
                  </p>
                  {data.identityStatement && (
                    <div className="mt-3 p-3 rounded-xl bg-primary/8 border border-primary/20">
                      <p className="text-sm font-bold text-primary leading-snug">
                        "I AM a person who {data.identityStatement}."
                      </p>
                    </div>
                  )}
                  <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
                    Next: build your first system in under 60 seconds.
                    Three questions — then you're live.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
                  {[
                    { icon: "⚡", label: "Pick a trigger" },
                    { icon: "✅", label: "Set tiny action" },
                    { icon: "🔥", label: "Start building" },
                  ].map(item => (
                    <div key={item.label} className="p-3 rounded-xl bg-muted/50">
                      <div className="text-lg mb-1">{item.icon}</div>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        <div className="flex justify-between mt-5">
          {step > 0 ? (
            <Button
              variant="ghost"
              onClick={() => setStep(s => s - 1)}
              data-testid="button-ob-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {current.skippable && current.id !== "done" && (
              <button
                onClick={() => setStep(s => s + 1)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                data-testid="button-ob-skip"
              >
                Skip
              </button>
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed() || (current.id === "done" && updatePending)}
              data-testid="button-ob-next"
            >
              {current.id === "done" ? (
                updatePending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    Build my first system
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
