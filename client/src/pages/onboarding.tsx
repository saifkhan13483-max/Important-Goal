import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, ArrowRight, ArrowLeft, Check, Loader2, Zap, RefreshCw, CheckSquare, LayoutDashboard, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/auth.store";
import { FutureSelfAudioSetup } from "@/components/future-self-audio";

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

const IDENTITY_PRESETS = [
  { value: "consistent", label: "Consistent", emoji: "🔁", desc: "Shows up every day, no matter what" },
  { value: "focused",    label: "Focused",    emoji: "🎯", desc: "Directs energy at what matters most" },
  { value: "calm",       label: "Calm",       emoji: "🌿", desc: "Stays grounded in chaos" },
  { value: "fit",        label: "Fit",        emoji: "💪", desc: "Takes care of their body regularly" },
  { value: "disciplined",label: "Disciplined",emoji: "⚡", desc: "Follows through even when they don't feel like it" },
  { value: "creative",   label: "Creative",   emoji: "✨", desc: "Makes time for creative work consistently" },
];

const MINIMUM_ACTION_EXAMPLES = [
  "Read 1 page",
  "Do 5 push-ups",
  "Write 1 sentence",
  "Walk for 2 minutes",
  "Open the app and study for 3 minutes",
  "Drink one glass of water",
];

interface OnboardingData {
  name: string;
  identityPreset: string;
  customIdentity: string;
  minimumAction: string;
}

const STEPS = [
  { id: "name",            title: "What should we call you?",                skippable: false },
  { id: "identity",        title: "Who are you becoming?",                   skippable: false },
  { id: "minimumAction",   title: "What still counts on your worst day?",    skippable: false },
  { id: "futureSelfAudio", title: "Leave a message for your future self.",   skippable: true  },
  { id: "done",            title: "Your system is live.",                    skippable: false },
];

export default function Onboarding() {
  const { user, updateProfile, updatePending } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { setTheme } = useAppStore();
  const [step, setStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    name:            user?.name || "",
    identityPreset:  "",
    customIdentity:  "",
    minimumAction:   "",
  });

  const current = STEPS[step];
  const total   = STEPS.length;

  const selectedPreset = IDENTITY_PRESETS.find(p => p.value === data.identityPreset);
  const identityLabel  = selectedPreset?.label ?? (data.customIdentity.trim() || "");
  const identityDesc   = selectedPreset?.desc ?? (data.customIdentity.trim() ? `someone who ${data.customIdentity.trim()}` : "");

  useEffect(() => {
    if (current.id === "done") {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(t);
    }
  }, [current.id]);

  const canProceed = () => {
    if (current.id === "name")          return data.name.trim().length >= 2;
    if (current.id === "identity")      return !!data.identityPreset && (data.identityPreset !== "custom" || data.customIdentity.trim().length >= 2);
    if (current.id === "minimumAction") return data.minimumAction.trim().length >= 3;
    return true;
  };

  const handleNext = async () => {
    if (step < total - 1) {
      setStep(s => s + 1);
      return;
    }

    try {
      const minActionParam = encodeURIComponent(data.minimumAction.trim());
      await updateProfile({
        name:              data.name.trim() || user?.name,
        identityStatement: identityDesc || null,
        onboardingCompleted: true,
      } as any);

      navigate(`/systems/new?minimumAction=${minActionParam}&identity=${encodeURIComponent(identityDesc)}`);
    } catch {
      toast({
        title:       "Error",
        description: "Failed to save your profile. Please try again.",
        variant:     "destructive",
      });
    }
  };

  const handleGoDashboard = async () => {
    try {
      await updateProfile({
        name:              data.name.trim() || user?.name,
        identityStatement: identityDesc || null,
        onboardingCompleted: true,
      } as any);
      navigate("/dashboard");
    } catch {
      navigate("/dashboard");
    }
  };

  const subtitleMap: Record<string, string> = {
    name:            "This is how we'll greet you in the app.",
    identity:        "This is who you're building toward — one day at a time.",
    minimumAction:   "This is the action that keeps your system alive on hard days.",
    futureSelfAudio: "Optional, but powerful. Your voice is the best motivation you'll ever hear.",
    done:            "Even this counts today.",
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
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  People who build habits around <strong className="text-foreground">who they are</strong> — not just what they want — stay consistent much longer. Pick one identity to build through repetition.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {IDENTITY_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => setData(d => ({ ...d, identityPreset: preset.value, customIdentity: "" }))}
                      data-testid={`button-identity-${preset.value}`}
                      className={cn(
                        "flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all",
                        data.identityPreset === preset.value
                          ? "border-primary bg-primary/10"
                          : "border-border bg-muted/30 hover:border-primary/50"
                      )}
                    >
                      <span className="text-lg">{preset.emoji}</span>
                      <span className="text-sm font-semibold text-foreground">{preset.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{preset.desc}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setData(d => ({ ...d, identityPreset: "custom" }))}
                    data-testid="button-identity-custom"
                    className={cn(
                      "flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all col-span-2",
                      data.identityPreset === "custom"
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 hover:border-primary/50"
                    )}
                  >
                    <span className="text-sm font-semibold text-foreground">✏️ Something else…</span>
                  </button>
                </div>
                {data.identityPreset === "custom" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                      <span className="text-sm font-medium text-muted-foreground flex-shrink-0">I want to become someone who</span>
                      <input
                        placeholder="exercises consistently…"
                        value={data.customIdentity}
                        onChange={e => setData(d => ({ ...d, customIdentity: e.target.value }))}
                        data-testid="input-custom-identity"
                        autoFocus
                        className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-muted-foreground/50"
                        onKeyDown={e => { if (e.key === "Enter" && canProceed()) handleNext(); }}
                      />
                    </div>
                  </div>
                )}
                {data.identityPreset && data.identityPreset !== "custom" && (
                  <div className="bg-primary/8 border border-primary/20 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Your identity</p>
                    <p className="text-sm font-bold text-primary">"{selectedPreset?.desc}"</p>
                  </div>
                )}
              </div>
            )}

            {current.id === "minimumAction" && (
              <div className="space-y-4">
                <div className="bg-primary/8 border border-primary/20 rounded-xl p-4">
                  <p className="text-sm font-semibold text-primary mb-1">Why this is the most important step</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Small is not cheating. This is what makes the system survivable. Your minimum action is the version you can still do on your worst day — when you're tired, busy, or low on motivation.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-minimum">Your minimum action</Label>
                  <Input
                    id="ob-minimum"
                    placeholder="e.g. Read 1 page, Do 5 push-ups, Write 1 sentence…"
                    value={data.minimumAction}
                    onChange={e => setData(d => ({ ...d, minimumAction: e.target.value }))}
                    data-testid="input-onboarding-minimum-action"
                    autoFocus
                    className="text-base"
                    onKeyDown={e => { if (e.key === "Enter" && canProceed()) handleNext(); }}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Examples — click to use:</p>
                  <div className="flex flex-wrap gap-2">
                    {MINIMUM_ACTION_EXAMPLES.map(ex => (
                      <button
                        key={ex}
                        onClick={() => setData(d => ({ ...d, minimumAction: ex }))}
                        className="text-xs px-2.5 py-1.5 rounded-full border bg-muted/50 hover:bg-muted hover:border-primary/40 transition-colors text-muted-foreground hover:text-foreground"
                        data-testid={`button-example-${ex.slice(0, 10).replace(/\s/g, "-").toLowerCase()}`}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
                {data.minimumAction.trim() && (
                  <div className="bg-chart-3/8 border border-chart-3/20 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Even on your worst day, this counts:</p>
                    <p className="text-sm font-bold text-chart-3">"{data.minimumAction.trim()}"</p>
                  </div>
                )}
              </div>
            )}

            {current.id === "futureSelfAudio" && (
              <div className="space-y-4">
                <div className="bg-muted/40 border border-border/60 rounded-xl p-4">
                  <p className="text-sm font-medium mb-1 flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5 text-primary" />
                    What to say
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Speak to yourself 90 days from now. Describe who you're becoming, why it matters to you, and what you want your future self to remember. There's no right way — just be honest.
                  </p>
                </div>
                <FutureSelfAudioSetup
                  onSaved={() => setStep(s => s + 1)}
                  onSkip={() => setStep(s => s + 1)}
                />
              </div>
            )}

            {current.id === "done" && (
              <div className="space-y-5 text-center">
                <div className="w-20 h-20 rounded-full gradient-brand flex items-center justify-center mx-auto shadow-lg">
                  <Check className="w-10 h-10 text-white" />
                </div>
                <div>
                  <p className="font-bold text-xl">
                    {(data.name || user?.name || "there").split(" ")[0]}, your system is ready.
                  </p>
                  {data.minimumAction.trim() && (
                    <div className="mt-3 p-3 rounded-xl bg-chart-3/8 border border-chart-3/20">
                      <p className="text-xs text-muted-foreground mb-1">On hard days, this still counts:</p>
                      <p className="text-sm font-bold text-chart-3 leading-snug">"{data.minimumAction.trim()}"</p>
                    </div>
                  )}
                  {identityLabel && (
                    <div className="mt-2 p-3 rounded-xl bg-primary/8 border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1">Today you're showing up as</p>
                      <p className="text-sm font-bold text-primary leading-snug">{identityLabel}</p>
                    </div>
                  )}
                  <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
                    Now build your first system in under 60 seconds — your minimum action will be pre-filled.
                  </p>
                </div>
                <div className="space-y-2">
                  <Button
                    className="w-full gap-2"
                    onClick={handleNext}
                    disabled={updatePending}
                    data-testid="button-ob-build-system"
                  >
                    {updatePending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    ) : (
                      <><Zap className="w-4 h-4" /> Build my first system</>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full gap-2 text-muted-foreground"
                    onClick={handleGoDashboard}
                    disabled={updatePending}
                    data-testid="button-ob-explore-dashboard"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Explore dashboard first
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {current.id === "futureSelfAudio" && (
          <div className="flex justify-start mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(s => s - 1)}
              data-testid="button-ob-back-audio"
              className="text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>
        )}

        {current.id !== "done" && current.id !== "futureSelfAudio" && (
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
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              data-testid="button-ob-next"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
