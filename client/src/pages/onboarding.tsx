import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const focusAreas = [
  { value: "fitness", label: "Fitness & Health", icon: "💪" },
  { value: "study", label: "Study & Learning", icon: "📚" },
  { value: "career", label: "Career Growth", icon: "🚀" },
  { value: "business", label: "Business", icon: "💼" },
  { value: "relationship", label: "Relationships", icon: "🤝" },
  { value: "mindset", label: "Mindset & Well-being", icon: "🧠" },
  { value: "finance", label: "Finance", icon: "📈" },
  { value: "creativity", label: "Creativity", icon: "🎨" },
];

const routineTimes = ["Morning", "Afternoon", "Evening", "Flexible"];

export default function Onboarding() {
  const { user, updateProfile, updatePending } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    focusArea: "",
    routineTime: "",
    preferredTheme: "system",
  });

  const steps = [
    { title: "Welcome!", subtitle: user ? `Great to have you, ${user.name.split(" ")[0]}!` : "Let's get started" },
    { title: "What's your focus?", subtitle: "Choose your primary area of growth" },
    { title: "When do you like to work?", subtitle: "This helps us remind you at the right time" },
    { title: "You're all set!", subtitle: "Let's build your first system" },
  ];

  const current = steps[step];
  const total = steps.length;

  const handleNext = async () => {
    if (step < total - 1) {
      setStep(s => s + 1);
    } else {
      try {
        await updateProfile({
          focusArea: data.focusArea,
          preferredTheme: data.preferredTheme,
          onboardingCompleted: true,
        });
        navigate("/dashboard");
      } catch {
        toast({ title: "Error", description: "Failed to save preferences", variant: "destructive" });
      }
    }
  };

  const canProceed = () => {
    if (step === 0) return true;
    if (step === 1) return !!data.focusArea;
    if (step === 2) return !!data.routineTime;
    return true;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i <= step ? "bg-primary w-8" : "bg-muted w-4"
                )}
              />
            ))}
          </div>
          <h1 className="text-2xl font-bold">{current.title}</h1>
          <p className="text-muted-foreground mt-1">{current.subtitle}</p>
        </div>

        <Card>
          <CardContent className="p-6">
            {step === 0 && (
              <div className="space-y-4 text-center">
                <p className="text-muted-foreground leading-relaxed">
                  SystemForge helps you transform vague goals into clear, repeatable daily systems.
                  We'll guide you through defining identity, triggers, actions, and fallbacks — the architecture of lasting change.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {["Set clear goals", "Build daily systems", "Track your streaks", "Reflect and grow"].map(item => (
                    <div key={item} className="flex items-center gap-2 p-3 rounded-md bg-muted/50 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
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
            )}

            {step === 2 && (
              <div className="grid grid-cols-2 gap-3">
                {routineTimes.map(time => (
                  <button
                    key={time}
                    onClick={() => setData(d => ({ ...d, routineTime: time.toLowerCase() }))}
                    data-testid={`button-time-${time.toLowerCase()}`}
                    className={cn(
                      "p-4 rounded-md border text-sm font-medium transition-all",
                      data.routineTime === time.toLowerCase()
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Your profile is ready!</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    You've chosen to focus on <span className="font-medium text-foreground capitalize">{data.focusArea || "your goals"}</span>.
                    Let's build your first system together.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => setStep(s => s - 1)} data-testid="button-onboarding-back">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              ) : <div />}
              <Button onClick={handleNext} disabled={!canProceed() || updatePending} data-testid="button-onboarding-next">
                {updatePending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {step === total - 1 ? "Let's go!" : "Continue"}
                {step < total - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
