import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, ArrowRight, ArrowLeft, Check, Loader2, SkipForward, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { createGoal } from "@/services/goals.service";
import { useAppStore } from "@/store/auth.store";

const focusAreas = [
  { value: "fitness", label: "Fitness & Health", icon: "💪" },
  { value: "study", label: "Study & Learning", icon: "📚" },
  { value: "career", label: "Career Growth", icon: "🚀" },
  { value: "business", label: "Business", icon: "💼" },
  { value: "relationship", label: "Relationships", icon: "🤝" },
  { value: "mindset", label: "Mindset & Well-being", icon: "🧠" },
  { value: "finance", label: "Finance", icon: "📈" },
  { value: "creativity", label: "Creativity", icon: "🎨" },
  { value: "custom", label: "Something else…", icon: "✨" },
];

const routineTimes = [
  { value: "morning", label: "Morning", sub: "Before 12pm" },
  { value: "afternoon", label: "Afternoon", sub: "12pm – 5pm" },
  { value: "evening", label: "Evening", sub: "After 5pm" },
  { value: "flexible", label: "Flexible", sub: "It varies" },
];

const themes = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
  { value: "system", label: "System", icon: "💻" },
];

interface OnboardingData {
  name: string;
  focusArea: string;
  customFocusArea: string;
  goalTitle: string;
  goalDeadline: string;
  routineTime: string;
  preferredTheme: string;
}

const STEPS = [
  { id: "welcome", title: "Welcome to SystemForge!", skippable: false },
  { id: "name", title: "What should we call you?", skippable: false },
  { id: "focus", title: "What's your primary focus?", skippable: false },
  { id: "goal", title: "Set your first goal", skippable: true },
  { id: "time", title: "When do you like to work?", skippable: true },
  { id: "theme", title: "Choose your theme", skippable: true },
  { id: "done", title: "You're all set!", skippable: false },
];

export default function Onboarding() {
  const { user, updateProfile, updatePending } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { setTheme } = useAppStore();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    name: user?.name || "",
    focusArea: "",
    customFocusArea: "",
    goalTitle: "",
    goalDeadline: "",
    routineTime: "",
    preferredTheme: "system",
  });

  const current = STEPS[step];
  const total = STEPS.length;

  const effectiveFocusArea = data.focusArea === "custom"
    ? (data.customFocusArea.trim() || "")
    : data.focusArea;

  const canProceed = () => {
    if (current.id === "name") return data.name.trim().length >= 2;
    if (current.id === "focus") return !!data.focusArea && (data.focusArea !== "custom" || data.customFocusArea.trim().length >= 2);
    return true;
  };

  const handleSkip = () => setStep(s => s + 1);

  const handleNext = async () => {
    if (step < total - 1) {
      setStep(s => s + 1);
      return;
    }

    try {
      await updateProfile({
        name: data.name.trim() || user?.name,
        focusArea: effectiveFocusArea || data.focusArea,
        routineTime: data.routineTime || null,
        preferredTheme: data.preferredTheme,
        onboardingCompleted: true,
      });

      if (data.goalTitle.trim() && user?.id) {
        await createGoal(user.id, {
          title: data.goalTitle.trim(),
          description: "",
          category: effectiveFocusArea || "other",
          priority: "high",
          status: "active",
          deadline: data.goalDeadline || undefined,
        });
      }

      navigate("/systems/new");
    } catch {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    }
  };

  const subtitleMap: Record<string, string> = {
    welcome: user ? `Great to have you, ${(user.name || "there").split(" ")[0]}!` : "Let's get started",
    name: "This is how we'll greet you in the app",
    focus: "Choose the area where you want to build systems first",
    goal: "What's one thing you want to achieve? (you can add more later)",
    time: "Pick the time that fits your natural rhythm",
    theme: "You can change this anytime in Settings",
    done: "Your setup is complete. Let's build!",
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Branding + Progress bar */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-6 h-6 text-white" />
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i < step ? "bg-primary w-5" : i === step ? "bg-primary w-8" : "bg-muted w-4"
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

            {/* Step 0 — Welcome */}
            {current.id === "welcome" && (
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed text-sm text-center">
                  SystemForge helps you transform vague goals into clear, repeatable daily systems.
                  We'll guide you through defining identity, triggers, actions, and fallbacks — the architecture of lasting change.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    { icon: "🎯", text: "Set clear goals" },
                    { icon: "⚡", text: "Build daily systems" },
                    { icon: "🔥", text: "Track your streaks" },
                    { icon: "📖", text: "Reflect and grow" },
                  ].map(item => (
                    <div key={item.text} className="flex items-center gap-2 p-3 rounded-md bg-muted/50 text-sm">
                      <span>{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1 — Name */}
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

            {/* Step 2 — Focus area */}
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
                    {data.customFocusArea.trim().length > 0 && data.customFocusArea.trim().length < 2 && (
                      <p className="text-xs text-destructive">Please enter at least 2 characters</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3 — Primary goal */}
            {current.id === "goal" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ob-goal">What do you want to achieve?</Label>
                  <Input
                    id="ob-goal"
                    placeholder="e.g. Get fit and build strength"
                    value={data.goalTitle}
                    onChange={e => setData(d => ({ ...d, goalTitle: e.target.value }))}
                    data-testid="input-onboarding-goal"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-deadline">
                    Target deadline{" "}
                    <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                  </Label>
                  <Input
                    id="ob-deadline"
                    type="date"
                    value={data.goalDeadline}
                    onChange={e => setData(d => ({ ...d, goalDeadline: e.target.value }))}
                    data-testid="input-onboarding-deadline"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2.5">
                  This will be saved as your first goal. You can edit it anytime from the Goals page.
                </p>
              </div>
            )}

            {/* Step 4 — Routine time */}
            {current.id === "time" && (
              <div className="grid grid-cols-2 gap-3">
                {routineTimes.map(time => (
                  <button
                    key={time.value}
                    onClick={() => setData(d => ({ ...d, routineTime: time.value }))}
                    data-testid={`button-time-${time.value}`}
                    className={cn(
                      "p-4 rounded-md border text-left transition-all",
                      data.routineTime === time.value
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 hover:border-primary/50"
                    )}
                  >
                    <p className="text-sm font-medium">{time.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{time.sub}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Step 5 — Theme */}
            {current.id === "theme" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {themes.map(t => (
                    <button
                      key={t.value}
                      onClick={() => {
                        setData(d => ({ ...d, preferredTheme: t.value }));
                        setTheme(t.value as "light" | "dark" | "system");
                      }}
                      data-testid={`button-theme-${t.value}`}
                      className={cn(
                        "flex flex-col items-center gap-2 p-5 rounded-md border transition-all",
                        data.preferredTheme === t.value
                          ? "border-primary bg-primary/10"
                          : "border-border bg-muted/30 hover:border-primary/50"
                      )}
                    >
                      <span className="text-2xl">{t.icon}</span>
                      <span className="text-sm font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  The app updates instantly — you can change this anytime in Settings.
                </p>
              </div>
            )}

            {/* Step 6 — Done */}
            {current.id === "done" && (
              <div className="space-y-5 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">
                    Great work, {(data.name || user?.name || "there").split(" ")[0]}!
                  </p>
                  <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                    Your profile is set. You're focused on{" "}
                    <span className="font-medium text-foreground capitalize">{effectiveFocusArea || "your goals"}</span>.
                    {data.goalTitle && (
                      <>
                        {" "}Your first goal —{" "}
                        <span className="font-medium text-foreground">"{data.goalTitle}"</span>{" "}
                        — has been saved.
                      </>
                    )}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-left space-y-2">
                  <p className="font-medium text-foreground">What happens next:</p>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      Build your first system around your goal
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      Set up a trigger and minimum action
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      Check in daily to build unstoppable momentum
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between mt-8">
              {step > 0 ? (
                <Button
                  variant="ghost"
                  onClick={() => setStep(s => s - 1)}
                  data-testid="button-onboarding-back"
                  disabled={updatePending}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                {current.skippable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    disabled={updatePending}
                    data-testid="button-onboarding-skip"
                    className="text-muted-foreground"
                  >
                    <SkipForward className="w-3.5 h-3.5 mr-1.5" />
                    Skip
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || updatePending}
                  data-testid="button-onboarding-next"
                >
                  {updatePending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {step === total - 1 ? "Build my first system" : "Continue"}
                  {step < total - 1 && !updatePending && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Full skip */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Want to explore first?{" "}
          <button
            className="underline hover:text-foreground transition-colors"
            onClick={async () => {
              try {
                await updateProfile({ onboardingCompleted: true });
                navigate("/dashboard");
              } catch {
                navigate("/dashboard");
              }
            }}
            data-testid="button-skip-all-onboarding"
          >
            Skip setup and go to dashboard
          </button>
        </p>
      </div>
    </div>
  );
}
