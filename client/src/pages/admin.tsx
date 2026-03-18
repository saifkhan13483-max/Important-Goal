import { useState, useMemo } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck, Crown, AlertTriangle, Target, Layers, CheckSquare,
  ExternalLink, Check, X, Loader2, ArrowLeft, Zap, Users,
  Settings, Database, Mail, CreditCard, BarChart3, Sparkles,
  Copy, CheckCheck, TrendingUp, Activity, Clock, Bell,
  User, Globe, Lock, ChevronRight, Image as ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { PlanTier } from "@/types/schema";
import { planDisplayName, getPlanFeatures, getPlanLimits } from "@/lib/plan-limits";
import { cn } from "@/lib/utils";

const ADMIN_EMAIL = "saifkhan13483@gmail.com";

const PLAN_TIERS: PlanTier[] = ["free", "starter", "pro", "elite"];

const PLAN_COLORS: Record<PlanTier, string> = {
  free:    "bg-muted text-muted-foreground",
  starter: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  pro:     "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  elite:   "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

const PLAN_BORDER: Record<PlanTier, string> = {
  free:    "border-border",
  starter: "border-blue-400/40",
  pro:     "border-violet-400/40",
  elite:   "border-amber-400/40",
};

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost" size="sm"
      className="h-6 px-2 text-[10px] gap-1 text-muted-foreground"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
    >
      {copied ? <CheckCheck className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {label ?? (copied ? "Copied" : "Copy")}
    </Button>
  );
}

function ConfigGroup({ title, icon: Icon, items }: {
  title: string;
  icon: React.ElementType;
  items: { label: string; envKey: string; value: string | undefined | null; hint?: string }[];
}) {
  const configured = items.filter(i => !!i.value).length;
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">{title}</span>
        </div>
        <Badge variant="outline" className={cn("text-[10px]", configured === items.length ? "border-emerald-300 text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
          {configured}/{items.length}
        </Badge>
      </div>
      <div className="divide-y">
        {items.map(item => (
          <div key={item.envKey} className="flex items-center justify-between px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.envKey}</p>
              {item.hint && <p className="text-[10px] text-muted-foreground">{item.hint}</p>}
            </div>
            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
              {item.value ? (
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400 gap-1 text-[10px]">
                  <Check className="w-2.5 h-2.5" /> Set
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 gap-1 text-[10px]">
                  <X className="w-2.5 h-2.5" /> Missing
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCell({ value }: { value: boolean | number | null | string }) {
  if (value === true) return <Check className="w-3.5 h-3.5 text-emerald-500 mx-auto" />;
  if (value === false || value === 0) return <X className="w-3.5 h-3.5 text-muted-foreground/40 mx-auto" />;
  if (value === null) return <span className="text-[10px] text-emerald-500 font-semibold">∞</span>;
  return <span className="text-[10px] font-semibold text-foreground">{value}</span>;
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

  const goals = goalsQuery.data ?? [];
  const systems = systemsQuery.data ?? [];
  const checkins = checkinsQuery.data ?? [];

  const activeGoals   = goals.filter(g => g.status !== "completed").length;
  const completedGoals = goals.filter(g => g.status === "completed").length;
  const activeSystems = systems.filter(s => s.active !== false).length;
  const totalCheckins = checkins.length;
  const doneCheckins  = checkins.filter(c => c.status === "done").length;
  const completionRate = totalCheckins > 0 ? Math.round((doneCheckins / totalCheckins) * 100) : 0;

  const currentStreak = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const activeSysList = systems.filter(s => s.active !== false);
    let best = 0;
    for (const sys of activeSysList) {
      const doneSet = new Set(checkins.filter(c => c.systemId === sys.id && c.status === "done").map(c => c.dateKey));
      let streak = 0;
      const cur = new Date(today);
      for (let i = 0; i < 365; i++) {
        const key = cur.toISOString().split("T")[0];
        if (doneSet.has(key)) { streak++; cur.setDate(cur.getDate() - 1); } else break;
      }
      if (streak > best) best = streak;
    }
    return best;
  }, [systems, checkins]);

  const goalsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    goals.forEach(g => { map[g.category] = (map[g.category] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [goals]);

  const systemsByFrequency = useMemo(() => {
    const map: Record<string, number> = {};
    systems.forEach(s => { const f = s.frequency ?? "daily"; map[f] = (map[f] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [systems]);

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

  /* ── Environment variables ── */
  const env = {
    groqKey:            import.meta.env.VITE_GROQ_API_KEY,
    firebaseApiKey:     import.meta.env.VITE_FIREBASE_API_KEY,
    firebaseProjectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID,
    stripeKey:          import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    stripeStarterM:     import.meta.env.VITE_STRIPE_STARTER_MONTHLY_LINK,
    stripeStarterY:     import.meta.env.VITE_STRIPE_STARTER_YEARLY_LINK,
    stripeProM:         import.meta.env.VITE_STRIPE_PRO_MONTHLY_LINK,
    stripeProY:         import.meta.env.VITE_STRIPE_PRO_YEARLY_LINK,
    stripeEliteM:       import.meta.env.VITE_STRIPE_ELITE_MONTHLY_LINK,
    stripeEliteY:       import.meta.env.VITE_STRIPE_ELITE_YEARLY_LINK,
    stripePortal:       import.meta.env.VITE_STRIPE_CUSTOMER_PORTAL_URL,
    emailjsService:     import.meta.env.VITE_EMAILJS_SERVICE_ID,
    emailjsKey:         import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
    emailjsWelcome:     import.meta.env.VITE_EMAILJS_WELCOME_TEMPLATE,
    emailjsSignup:      import.meta.env.VITE_EMAILJS_SIGNUP_TEMPLATE,
    ga:                 import.meta.env.VITE_GA_MEASUREMENT_ID,
    cloudinary:         import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
    demoVideo:          import.meta.env.VITE_DEMO_VIDEO_ID,
  };

  const allEnvValues = Object.values(env);
  const configuredCount = allEnvValues.filter(Boolean).length;
  const configPct = Math.round((configuredCount / allEnvValues.length) * 100);

  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  const planUpdatedDate = user.planUpdatedAt
    ? new Date(user.planUpdatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const currentFeatures = getPlanFeatures(user.plan);
  const currentLimits = getPlanLimits(user.plan);

  /* Feature matrix rows */
  const featureMatrix: { label: string; key: keyof typeof currentFeatures | null; limitsRow?: boolean }[] = [
    { label: "Goal limit", key: null, limitsRow: true },
    { label: "System limit", key: null, limitsRow: true },
    { label: "AI Coach", key: "aiCoach" },
    { label: "AI Coach daily msgs", key: "aiCoachDailyLimit" },
    { label: "Advanced analytics", key: "advancedAnalytics" },
    { label: "AI analytics insights", key: "aiAnalyticsInsights" },
    { label: "Full templates", key: "fullTemplates" },
    { label: "AI journal prompt", key: "aiJournalPrompt" },
    { label: "CSV/PDF export", key: "csvPdfExport" },
    { label: "Future self audio", key: "futureSelfAudio" },
    { label: "Priority support", key: "prioritySupport" },
    { label: "Team workspace", key: "teamWorkspace" },
    { label: "Coach dashboard", key: "coachDashboard" },
  ];

  const quickLinks = [
    { label: "Firebase Console", sub: "Auth, Firestore, Storage", icon: Database, href: "https://console.firebase.google.com/project/systembuilder-2febb", color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Stripe Dashboard", sub: "Payments & subscriptions", icon: CreditCard, href: "https://dashboard.stripe.com", color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "GROQ Console", sub: "AI usage & API keys", icon: Zap, href: "https://console.groq.com", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "EmailJS Dashboard", sub: "Email templates & logs", icon: Mail, href: "https://dashboard.emailjs.com", color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Cloudinary Console", sub: "Image & media assets", icon: ImageIcon, href: "https://cloudinary.com/console", color: "text-sky-500", bg: "bg-sky-500/10" },
    { label: "Google Analytics", sub: "Traffic & conversions", icon: BarChart3, href: "https://analytics.google.com", color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      {/* Top bar */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-violet-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm">SystemForge Admin</span>
            <Badge variant="outline" className="text-xs hidden sm:flex">Owner</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to App
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-5 h-5 text-violet-500" />
          <div>
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Manage your SystemForge account and configuration</p>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="gap-1.5" data-testid="tab-admin-overview">
              <BarChart3 className="w-3.5 h-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="plan" className="gap-1.5" data-testid="tab-admin-plan">
              <Crown className="w-3.5 h-3.5" /> Plan & Features
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5" data-testid="tab-admin-config">
              <Settings className="w-3.5 h-3.5" /> Configuration
            </TabsTrigger>
            <TabsTrigger value="links" className="gap-1.5" data-testid="tab-admin-links">
              <ExternalLink className="w-3.5 h-3.5" /> Quick Links
            </TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW TAB ── */}
          <TabsContent value="overview" className="space-y-6 mt-0">

            {/* Account profile */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" /> Account Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatarUrl ?? undefined} />
                      <AvatarFallback>{user.name?.charAt(0) ?? "A"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{user.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">User ID</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px]" data-testid="text-user-id">{user.id}</span>
                        <CopyButton text={user.id} />
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member since</span>
                      <span>{joinedDate}</span>
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
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Identity statement</span>
                      <span className={user.identityStatement ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                        {user.identityStatement ? "Set" : "Not set"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Daily reminder</span>
                      <div className="flex items-center gap-1.5">
                        <Bell className={cn("w-3 h-3", user.reminderEnabled ? "text-emerald-500" : "text-muted-foreground/40")} />
                        <span>{user.reminderEnabled ? `On — ${user.reminderTime ?? "unset"}` : "Off"}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Workspace</span>
                      <span className={user.workspaceId ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                        {user.workspaceId ? "Joined" : "None"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" /> Activity Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Target, label: "Active Goals", value: goalsQuery.isLoading ? "…" : activeGoals, color: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" },
                      { icon: Layers, label: "Active Systems", value: systemsQuery.isLoading ? "…" : activeSystems, color: "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400" },
                      { icon: CheckSquare, label: "Total Check-ins", value: checkinsQuery.isLoading ? "…" : totalCheckins, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" },
                      { icon: TrendingUp, label: "Current Streak", value: checkinsQuery.isLoading ? "…" : `${currentStreak}d`, color: "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400" },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className="rounded-xl border bg-card p-3 flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-lg font-bold leading-tight">{value}</p>
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Completion rate bar */}
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Zap className="w-3 h-3" /> Completion rate</span>
                      <span className="font-bold">{completionRate}%</span>
                    </div>
                    <Progress value={completionRate} className="h-2" />
                    <p className="text-[10px] text-muted-foreground">{doneCheckins} done out of {totalCheckins} total check-ins</p>
                  </div>

                  {/* Goals by category */}
                  {goalsByCategory.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Goals by category</p>
                      <div className="flex flex-wrap gap-1.5">
                        {goalsByCategory.map(([cat, count]) => (
                          <Badge key={cat} variant="secondary" className="text-[10px] capitalize">
                            {cat} · {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Systems by frequency */}
                  {systemsByFrequency.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Systems by frequency</p>
                      <div className="flex flex-wrap gap-1.5">
                        {systemsByFrequency.map(([freq, count]) => (
                          <Badge key={freq} variant="outline" className="text-[10px] capitalize">
                            {freq} · {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Config health bar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Configuration health</p>
                  </div>
                  <Badge variant="outline" className={cn("text-xs", configPct === 100 ? "border-emerald-300 text-emerald-600" : configPct >= 50 ? "border-amber-300 text-amber-600" : "border-red-300 text-red-500")}>
                    {configuredCount}/{allEnvValues.length} set · {configPct}%
                  </Badge>
                </div>
                <Progress value={configPct} className="h-2" />
                {configPct < 100 && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Go to the Configuration tab to see what's missing.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PLAN & FEATURES TAB ── */}
          <TabsContent value="plan" className="space-y-6 mt-0">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Current plan card */}
              <Card className={cn("border-2", PLAN_BORDER[user.plan ?? "free"])}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Crown className="w-4 h-4 text-muted-foreground" /> Current Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted/40 p-4 text-center">
                    <Badge className={cn("text-sm px-3 py-1 mb-2", PLAN_COLORS[user.plan ?? "free"])}>
                      {(user.plan ?? "free") === "elite" && <Crown className="w-3.5 h-3.5 mr-1" />}
                      {planDisplayName(user.plan)}
                    </Badge>
                    <div className="flex items-center justify-center gap-4 mt-3 text-sm">
                      <div className="text-center">
                        <p className="font-bold">{currentLimits.goals === null ? "∞" : currentLimits.goals}</p>
                        <p className="text-[10px] text-muted-foreground">Goals</p>
                      </div>
                      <Separator orientation="vertical" className="h-8" />
                      <div className="text-center">
                        <p className="font-bold">{currentLimits.systems === null ? "∞" : currentLimits.systems}</p>
                        <p className="text-[10px] text-muted-foreground">Systems</p>
                      </div>
                      <Separator orientation="vertical" className="h-8" />
                      <div className="text-center">
                        <p className="font-bold">{currentFeatures.aiCoachDailyLimit === null ? "∞" : currentFeatures.aiCoachDailyLimit === 0 ? "—" : currentFeatures.aiCoachDailyLimit}</p>
                        <p className="text-[10px] text-muted-foreground">AI msgs/day</p>
                      </div>
                    </div>
                  </div>
                  {planUpdatedDate && (
                    <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" /> Last changed {planUpdatedDate}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Plan switcher */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4 text-muted-foreground" /> Change Plan
                  </CardTitle>
                  <CardDescription className="text-xs">Switch plan instantly for testing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {PLAN_TIERS.map(tier => (
                      <button
                        key={tier}
                        onClick={() => setSelectedPlan(tier === (user.plan ?? "free") ? "" : tier)}
                        className={cn(
                          "rounded-lg border p-3 text-left transition-all",
                          selectedPlan === tier ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-border/80 hover:bg-muted/30",
                          tier === (user.plan ?? "free") && "opacity-50 cursor-default",
                        )}
                        disabled={tier === (user.plan ?? "free")}
                        data-testid={`button-select-plan-${tier}`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {tier === "elite" && <Crown className="w-3 h-3 text-amber-500" />}
                          <span className="text-sm font-semibold capitalize">{planDisplayName(tier)}</span>
                          {tier === (user.plan ?? "free") && <Badge variant="secondary" className="text-[8px] px-1 py-0">current</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {tier === "free" ? "2 goals · 3 systems" : tier === "starter" ? "10 goals · unlimited" : tier === "pro" ? "Unlimited + AI" : "Everything + Teams"}
                        </p>
                      </button>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSavePlan}
                    disabled={!selectedPlan || saving}
                    data-testid="button-save-plan"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                    {saving ? "Saving…" : selectedPlan ? `Apply ${planDisplayName(selectedPlan as PlanTier)}` : "Select a plan"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Feature matrix */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" /> Feature Matrix
                </CardTitle>
                <CardDescription className="text-xs">What each plan unlocks across the app</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-[40%]">Feature</th>
                        {PLAN_TIERS.map(tier => (
                          <th key={tier} className={cn("text-center px-3 py-2.5 text-xs font-semibold", tier === (user.plan ?? "free") ? "text-primary" : "text-muted-foreground")}>
                            {planDisplayName(tier)}
                            {tier === (user.plan ?? "free") && <span className="block text-[8px] font-normal opacity-60">current</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr className="bg-muted/10">
                        <td className="px-4 py-2 text-xs text-muted-foreground font-medium">Goal limit</td>
                        {PLAN_TIERS.map(tier => (
                          <td key={tier} className={cn("text-center px-3 py-2", tier === (user.plan ?? "free") && "bg-primary/5")}>
                            <span className="text-xs font-semibold">{getPlanLimits(tier).goals ?? "∞"}</span>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-xs text-muted-foreground font-medium">System limit</td>
                        {PLAN_TIERS.map(tier => (
                          <td key={tier} className={cn("text-center px-3 py-2", tier === (user.plan ?? "free") && "bg-primary/5")}>
                            <span className="text-xs font-semibold">{getPlanLimits(tier).systems ?? "∞"}</span>
                          </td>
                        ))}
                      </tr>
                      {featureMatrix.filter(f => f.key).map((row, i) => (
                        <tr key={row.key} className={i % 2 === 0 ? "bg-muted/10" : ""}>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{row.label}</td>
                          {PLAN_TIERS.map(tier => (
                            <td key={tier} className={cn("text-center px-3 py-2", tier === (user.plan ?? "free") && "bg-primary/5")}>
                              <FeatureCell value={(getPlanFeatures(tier) as any)[row.key!]} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── CONFIGURATION TAB ── */}
          <TabsContent value="config" className="space-y-4 mt-0">
            <div className="rounded-xl border bg-muted/30 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Overall configuration</p>
                <p className="text-xs text-muted-foreground mt-0.5">{configuredCount} of {allEnvValues.length} environment variables set in Replit Secrets</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{configPct}%</p>
                <Progress value={configPct} className="h-1.5 w-24 mt-1" />
              </div>
            </div>

            <ConfigGroup
              title="Firebase (Required)"
              icon={Database}
              items={[
                { label: "API Key", envKey: "VITE_FIREBASE_API_KEY", value: env.firebaseApiKey, hint: "Core Firebase authentication" },
                { label: "Project ID", envKey: "VITE_FIREBASE_PROJECT_ID", value: env.firebaseProjectId, hint: "Identifies your Firebase project" },
              ]}
            />

            <ConfigGroup
              title="AI / GROQ"
              icon={Sparkles}
              items={[
                { label: "GROQ API Key", envKey: "GROQ_API_KEY", value: env.groqKey, hint: "Powers AI Coach, system generator, analytics insights" },
              ]}
            />

            <ConfigGroup
              title="Stripe — Payments"
              icon={CreditCard}
              items={[
                { label: "Publishable Key", envKey: "VITE_STRIPE_PUBLISHABLE_KEY", value: env.stripeKey },
                { label: "Starter — Monthly link", envKey: "VITE_STRIPE_STARTER_MONTHLY_LINK", value: env.stripeStarterM },
                { label: "Starter — Yearly link", envKey: "VITE_STRIPE_STARTER_YEARLY_LINK", value: env.stripeStarterY },
                { label: "Pro — Monthly link", envKey: "VITE_STRIPE_PRO_MONTHLY_LINK", value: env.stripeProM },
                { label: "Pro — Yearly link", envKey: "VITE_STRIPE_PRO_YEARLY_LINK", value: env.stripeProY },
                { label: "Elite — Monthly link", envKey: "VITE_STRIPE_ELITE_MONTHLY_LINK", value: env.stripeEliteM },
                { label: "Elite — Yearly link", envKey: "VITE_STRIPE_ELITE_YEARLY_LINK", value: env.stripeEliteY },
                { label: "Customer portal URL", envKey: "VITE_STRIPE_CUSTOMER_PORTAL_URL", value: env.stripePortal },
              ]}
            />

            <ConfigGroup
              title="EmailJS — Transactional Email"
              icon={Mail}
              items={[
                { label: "Service ID", envKey: "VITE_EMAILJS_SERVICE_ID", value: env.emailjsService },
                { label: "Public Key", envKey: "VITE_EMAILJS_PUBLIC_KEY", value: env.emailjsKey },
                { label: "Welcome template", envKey: "VITE_EMAILJS_WELCOME_TEMPLATE", value: env.emailjsWelcome, hint: "Newsletter signups" },
                { label: "Signup template", envKey: "VITE_EMAILJS_SIGNUP_TEMPLATE", value: env.emailjsSignup, hint: "New account welcome email" },
              ]}
            />

            <ConfigGroup
              title="Optional Services"
              icon={Globe}
              items={[
                { label: "Google Analytics ID", envKey: "VITE_GA_MEASUREMENT_ID", value: env.ga, hint: "Traffic & conversion tracking" },
                { label: "Cloudinary Cloud Name", envKey: "VITE_CLOUDINARY_CLOUD_NAME", value: env.cloudinary, hint: "Profile photo uploads" },
                { label: "Demo Video ID", envKey: "VITE_DEMO_VIDEO_ID", value: env.demoVideo, hint: "YouTube video ID for landing page" },
              ]}
            />
          </TabsContent>

          {/* ── QUICK LINKS TAB ── */}
          <TabsContent value="links" className="space-y-4 mt-0">
            <p className="text-sm text-muted-foreground">Open your connected service dashboards in a new tab.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {quickLinks.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border p-4 hover:bg-muted/50 transition-colors group"
                  data-testid={`link-admin-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", link.bg)}>
                      <link.icon className={cn("w-4.5 h-4.5", link.color)} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{link.label}</p>
                      <p className="text-xs text-muted-foreground">{link.sub}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </a>
              ))}
            </div>

            {/* Firebase project info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" /> Firebase Project
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Project ID</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs">{env.firebaseProjectId ?? "—"}</span>
                    {env.firebaseProjectId && <CopyButton text={env.firebaseProjectId} />}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Auth domain</span>
                  <span className="font-mono text-xs">{import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Your UID</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs text-muted-foreground truncate max-w-[140px]">{user.id}</span>
                    <CopyButton text={user.id} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
