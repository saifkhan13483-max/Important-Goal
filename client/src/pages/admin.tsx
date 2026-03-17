import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/auth.store";
import { updateUser } from "@/services/user.service";
import { getGoals } from "@/services/goals.service";
import { getSystems } from "@/services/systems.service";
import { getCheckins } from "@/services/checkins.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ShieldCheck, Crown, AlertTriangle, Target, Layers, CheckSquare,
  ExternalLink, Check, X, Loader2, ArrowLeft, Zap, Users,
  Settings, Database, Mail, CreditCard, BarChart3, Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { PlanTier } from "@/types/schema";
import { planDisplayName } from "@/lib/plan-limits";

const ADMIN_EMAIL = "saifkhan13483@gmail.com";

const PLAN_TIERS: PlanTier[] = ["free", "starter", "pro", "elite"];

const PLAN_COLORS: Record<PlanTier, string> = {
  free:    "bg-muted text-muted-foreground",
  starter: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  pro:     "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  elite:   "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

function ConfigRow({ label, value, hint }: { label: string; value: string | undefined | null; hint?: string }) {
  const ok = !!value;
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="flex items-center gap-2">
        {ok ? (
          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400 gap-1">
            <Check className="w-3 h-3" /> Connected
          </Badge>
        ) : (
          <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 gap-1">
            <X className="w-3 h-3" /> Not set
          </Badge>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, setUser } = useAppStore();
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | "">("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const goalsQuery = useQuery({
    queryKey: ["admin-goals", user?.id],
    queryFn: () => getGoals(user!.id),
    enabled: !!user?.id,
  });

  const systemsQuery = useQuery({
    queryKey: ["admin-systems", user?.id],
    queryFn: () => getSystems(user!.id),
    enabled: !!user?.id,
  });

  const checkinsQuery = useQuery({
    queryKey: ["admin-checkins", user?.id],
    queryFn: () => getCheckins(user!.id),
    enabled: !!user?.id,
  });

  const activeGoals   = goalsQuery.data?.filter(g => g.status !== "completed").length ?? 0;
  const activeSystems = systemsQuery.data?.filter(s => s.active !== false).length ?? 0;
  const totalCheckins = checkinsQuery.data?.length ?? 0;
  const doneCheckins  = checkinsQuery.data?.filter(c => c.status === "done").length ?? 0;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500 mb-2" />
            <CardTitle>Not signed in</CardTitle>
            <CardDescription>Please sign in to access the admin panel.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-red-500 mb-2" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to view this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleSavePlan() {
    if (!user || !selectedPlan) return;
    setSaving(true);
    try {
      const updated = await updateUser(user.id, {
        plan: selectedPlan as PlanTier,
        planUpdatedAt: new Date().toISOString(),
      });
      setUser(updated);
      queryClient.invalidateQueries();
      setSelectedPlan("");
      toast({ title: `Plan updated to ${planDisplayName(selectedPlan as PlanTier)}`, description: "Your account has been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to update plan. Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const envGroq    = import.meta.env.VITE_GROQ_API_KEY;
  const envStrStarter = import.meta.env.VITE_STRIPE_STARTER_MONTHLY_LINK;
  const envStrPro     = import.meta.env.VITE_STRIPE_PRO_MONTHLY_LINK;
  const envStrElite   = import.meta.env.VITE_STRIPE_ELITE_MONTHLY_LINK;
  const envEmailjs    = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const envGa         = import.meta.env.VITE_GA_MEASUREMENT_ID;
  const envCloudinary = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  const configuredCount = [envGroq, envStrStarter, envStrPro, envStrElite, envEmailjs, envGa, envCloudinary].filter(Boolean).length;

  const joinedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-violet-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm">SystemForge Admin</span>
            <Badge variant="outline" className="text-xs">Owner</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-violet-500" />
          <div>
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Manage your SystemForge account and configuration</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Account Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatarUrl ?? undefined} />
                  <AvatarFallback>{user.name?.charAt(0) ?? "A"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member since</span>
                  <span>{joinedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current plan</span>
                  <Badge className={PLAN_COLORS[user.plan ?? "free"]}>
                    {user.plan === "elite" && <Crown className="w-3 h-3 mr-1" />}
                    {planDisplayName(user.plan)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Onboarding</span>
                  <span className={user.onboardingCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"}>
                    {user.onboardingCompleted ? "Completed" : "Pending"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timezone</span>
                  <span>{user.timezone ?? "UTC"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Crown className="w-4 h-4 text-muted-foreground" />
                Plan Management
              </CardTitle>
              <CardDescription className="text-xs">Change your subscription plan instantly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active plan</p>
                  <p className="font-bold capitalize">{planDisplayName(user.plan)}</p>
                </div>
                <Badge className={PLAN_COLORS[user.plan ?? "free"]}>
                  {user.plan === "elite" && <Crown className="w-3 h-3 mr-1" />}
                  {planDisplayName(user.plan)}
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Change plan to</p>
                <Select value={selectedPlan} onValueChange={v => setSelectedPlan(v as PlanTier)}>
                  <SelectTrigger data-testid="select-plan">
                    <SelectValue placeholder="Select a plan…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_TIERS.map(tier => (
                      <SelectItem key={tier} value={tier} disabled={tier === (user.plan ?? "free")}>
                        <div className="flex items-center gap-2">
                          {tier === "elite" && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                          {planDisplayName(tier)}
                          {tier === (user.plan ?? "free") && <span className="text-muted-foreground text-xs">(current)</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  onClick={handleSavePlan}
                  disabled={!selectedPlan || saving}
                  data-testid="button-save-plan"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                  {saving ? "Saving…" : "Apply Plan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Your Activity Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={Target}
                label="Active Goals"
                value={goalsQuery.isLoading ? "…" : activeGoals}
                color="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
              />
              <StatCard
                icon={Layers}
                label="Active Systems"
                value={systemsQuery.isLoading ? "…" : activeSystems}
                color="bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400"
              />
              <StatCard
                icon={CheckSquare}
                label="Total Check-ins"
                value={checkinsQuery.isLoading ? "…" : totalCheckins}
                color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
              />
              <StatCard
                icon={Zap}
                label="Completed"
                value={checkinsQuery.isLoading ? "…" : doneCheckins}
                color="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                Configuration Status
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {configuredCount}/7 connected
              </Badge>
            </div>
            <CardDescription className="text-xs">Set these in your Replit environment variables (Secrets)</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            <ConfigRow
              label="GROQ API Key"
              value={envGroq}
              hint="GROQ_API_KEY — powers the AI Coach"
            />
            <ConfigRow
              label="Stripe — Starter Plan Link"
              value={envStrStarter}
              hint="VITE_STRIPE_STARTER_MONTHLY_LINK"
            />
            <ConfigRow
              label="Stripe — Pro Plan Link"
              value={envStrPro}
              hint="VITE_STRIPE_PRO_MONTHLY_LINK"
            />
            <ConfigRow
              label="Stripe — Elite Plan Link"
              value={envStrElite}
              hint="VITE_STRIPE_ELITE_MONTHLY_LINK"
            />
            <ConfigRow
              label="EmailJS"
              value={envEmailjs}
              hint="VITE_EMAILJS_SERVICE_ID — welcome emails"
            />
            <ConfigRow
              label="Google Analytics"
              value={envGa}
              hint="VITE_GA_MEASUREMENT_ID — site analytics"
            />
            <ConfigRow
              label="Cloudinary"
              value={envCloudinary}
              hint="VITE_CLOUDINARY_CLOUD_NAME — profile photo uploads"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              Quick Links
            </CardTitle>
            <CardDescription className="text-xs">Open your connected dashboards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  label: "Firebase Console",
                  sub: "Auth, Firestore, Storage",
                  icon: Database,
                  href: "https://console.firebase.google.com/project/systembuilder-2febb",
                  color: "text-orange-500",
                },
                {
                  label: "Stripe Dashboard",
                  sub: "Payments & subscriptions",
                  icon: CreditCard,
                  href: "https://dashboard.stripe.com",
                  color: "text-violet-500",
                },
                {
                  label: "GROQ Console",
                  sub: "AI usage & API keys",
                  icon: Zap,
                  href: "https://console.groq.com",
                  color: "text-emerald-500",
                },
                {
                  label: "EmailJS Dashboard",
                  sub: "Email templates & logs",
                  icon: Mail,
                  href: "https://dashboard.emailjs.com",
                  color: "text-blue-500",
                },
              ].map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
                  data-testid={`link-admin-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center gap-3">
                    <link.icon className={`w-4 h-4 ${link.color}`} />
                    <div>
                      <p className="text-sm font-medium">{link.label}</p>
                      <p className="text-xs text-muted-foreground">{link.sub}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
