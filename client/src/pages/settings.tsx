import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAppStore } from "@/store/auth.store";
import { useTheme } from "@/components/theme-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import * as AuthService from "@/services/auth.service";
import { getGoals } from "@/services/goals.service";
import { getSystems } from "@/services/systems.service";
import { getCheckins } from "@/services/checkins.service";
import { getJournals } from "@/services/journal.service";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Loader2, Sun, Moon, Monitor, LogOut, User, Palette, Globe,
  Bell, Shield, Sparkles, Zap, Lock, CreditCard, Crown,
  BellRing, BellOff, Mic, ExternalLink, Download, Trash2,
  KeyRound, Camera, ChevronRight, Heart, CheckCircle2,
  AlertTriangle, Target, BookOpen, Users, Gift, Calendar,
  Snowflake, Copy, Share2, BarChart2, Languages,
} from "lucide-react";
import { STRIPE_CUSTOMER_PORTAL_URL } from "@/lib/stripe";
import type { PlanTier } from "@/types/schema";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { FutureSelfAudioSetup, FutureSelfAudioSettings } from "@/components/future-self-audio";
import { getPlanFeatures } from "@/lib/plan-limits";
import { SiteLogo } from "@/components/site-logo";
import { linkAccountabilityPartner, unlinkAccountabilityPartner } from "@/services/accountability.service";
import { updateUser } from "@/services/user.service";
import { generateReferralCode } from "@/services/public-profile.service";
import { generateCalendarICS, downloadICS } from "@/lib/calendar-export";
import { LANGUAGES, setLanguage, getLanguage, type Language } from "@/lib/i18n";

const TIMEZONES = [
  "UTC",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Anchorage", "America/Honolulu", "America/Toronto", "America/Vancouver",
  "America/Mexico_City", "America/Sao_Paulo", "America/Buenos_Aires", "America/Bogota",
  "Europe/London", "Europe/Dublin", "Europe/Lisbon", "Europe/Paris", "Europe/Berlin",
  "Europe/Madrid", "Europe/Rome", "Europe/Amsterdam", "Europe/Brussels", "Europe/Stockholm",
  "Europe/Oslo", "Europe/Copenhagen", "Europe/Warsaw", "Europe/Prague", "Europe/Vienna",
  "Europe/Zurich", "Europe/Athens", "Europe/Istanbul", "Europe/Moscow", "Europe/Helsinki",
  "Africa/Cairo", "Africa/Lagos", "Africa/Nairobi", "Africa/Johannesburg",
  "Asia/Dubai", "Asia/Riyadh", "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka",
  "Asia/Bangkok", "Asia/Singapore", "Asia/Hong_Kong", "Asia/Shanghai", "Asia/Tokyo",
  "Asia/Seoul", "Australia/Perth", "Australia/Adelaide", "Australia/Sydney",
  "Australia/Melbourne", "Pacific/Auckland", "Pacific/Fiji",
];

type TabId = "profile" | "appearance" | "notifications" | "audio" | "social" | "privacy" | "billing" | "account";

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "profile",       label: "Profile",       icon: User },
  { id: "appearance",    label: "Appearance",    icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "audio",         label: "Audio",         icon: Mic },
  { id: "social",        label: "Social",        icon: Users },
  { id: "privacy",       label: "Privacy",       icon: Shield },
  { id: "billing",       label: "Billing",       icon: CreditCard },
  { id: "account",       label: "Account",       icon: KeyRound },
];

const PLAN_DETAILS: Record<PlanTier, { label: string; description: string; icon: any; color: string }> = {
  free:    { label: "Free",    description: "Up to 2 goals, 3 systems",                                icon: Sparkles, color: "" },
  starter: { label: "Starter", description: "Up to 10 goals · Full template library",                  icon: Zap,      color: "bg-primary/80 text-white border-0" },
  pro:     { label: "Pro",     description: "Unlimited goals · Advanced analytics · AI Coach",         icon: Sparkles, color: "gradient-brand text-white border-0" },
  elite:   { label: "Elite",   description: "Everything in Pro · Unlimited AI · Team workspace",       icon: Crown,    color: "bg-amber-500 text-white border-0" },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground mb-4">{children}</h3>;
}

function SettingRow({
  label, description, children, locked, onUpgrade,
}: { label: string; description?: string; children: React.ReactNode; locked?: boolean; onUpgrade?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          {locked && onUpgrade && (
            <Link href={onUpgrade}>
              <Badge variant="secondary" className="text-[10px] cursor-pointer gap-0.5 h-4 px-1.5">
                <Lock className="w-2.5 h-2.5" /> Upgrade
              </Badge>
            </Link>
          )}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export default function Settings() {
  const { user } = useAppStore();
  const features = getPlanFeatures(user?.plan);
  const { updateProfile, updatePending, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const tabsRef = useRef<HTMLDivElement>(null);

  // Profile fields
  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [avatarError, setAvatarError] = useState(false);
  const [timezone, setTimezone] = useState(user?.timezone || "UTC");
  const [identityStatement, setIdentityStatement] = useState(user?.identityStatement || "");

  // Notifications
  const [reminderEnabled, setReminderEnabled] = useState(user?.reminderEnabled ?? false);
  const [reminderTime, setReminderTime] = useState(user?.reminderTime || "08:00");
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );

  // Audio prefs
  const [audioPrefs, setAudioPrefs] = useState({
    playOnFirstVisit: user?.futureAudioPlayOnFirstVisit ?? true,
    playAfterMissed:  user?.futureAudioPlayAfterMissed  ?? true,
    autoplay:         user?.futureAudioAutoplay          ?? true,
    muted:            user?.futureAudioMuted             ?? false,
  });

  // New feature states
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerLinking, setPartnerLinking] = useState(false);
  const [publicProfile, setPublicProfile] = useState(user?.publicProfile ?? false);
  const [weeklyReport, setWeeklyReport] = useState(user?.weeklyReportEnabled ?? false);
  const [streakFreezeEnabled, setStreakFreezeEnabled] = useState((user?.streakFreezes ?? 0) > 0);
  const [currentLang, setCurrentLang] = useState<Language>(getLanguage());
  const [calendarSyncing, setCalendarSyncing] = useState(false);
  const [weeklyReportSending, setWeeklyReportSending] = useState(false);
  const qc = useQueryClient();

  const referralCode = user?.referralCode ?? generateReferralCode(user?.id ?? "anon");

  const { data: systemsForCalendar = [] } = useQuery({
    queryKey: ["systems", user?.id ?? ""],
    queryFn: () => getSystems(user?.id ?? ""),
    enabled: !!user?.id,
  });

  // Dialogs
  const [showLogout, setShowLogout] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const [exportPending, setExportPending] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  useEffect(() => {
    if (typeof Notification !== "undefined") setNotifPermission(Notification.permission);
  }, []);

  // Scroll active tab into view on mobile
  useEffect(() => {
    const el = tabsRef.current?.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeTab]);

  const requestNotifPermission = async () => {
    if (typeof Notification === "undefined") {
      toast({ title: "Not supported", description: "Your browser doesn't support notifications.", variant: "destructive" });
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      setReminderEnabled(true);
      toast({ title: "Reminders enabled!" });
    } else {
      toast({ title: "Permission denied", description: "Enable notifications in browser settings first.", variant: "destructive" });
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({ name, avatarUrl: avatarUrl || null, timezone, preferredTheme: theme, identityStatement: identityStatement.trim() || null } as any);
      toast({ title: "Profile saved!", description: "Your changes have been applied." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveAppearance = async () => {
    try {
      await updateProfile({ preferredTheme: theme, timezone } as any);
      toast({ title: "Preferences saved!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveReminder = async () => {
    try {
      await updateProfile({ reminderEnabled, reminderTime } as any);
      if (reminderEnabled) {
        localStorage.setItem("strivo_reminder_enabled", "true");
        localStorage.setItem("strivo_reminder_time", reminderTime);
      } else {
        localStorage.removeItem("strivo_reminder_enabled");
        localStorage.removeItem("strivo_reminder_time");
      }
      toast({ title: "Reminder saved!", description: reminderEnabled ? `Daily reminder set for ${reminderTime}.` : "Reminder turned off." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveAudioPrefs = async () => {
    try {
      await updateProfile({
        futureAudioPlayOnFirstVisit: audioPrefs.playOnFirstVisit,
        futureAudioPlayAfterMissed:  audioPrefs.playAfterMissed,
        futureAudioAutoplay:         audioPrefs.autoplay,
        futureAudioMuted:            audioPrefs.muted,
      } as any);
      toast({ title: "Audio preferences saved!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleLinkPartner = async () => {
    if (!partnerEmail.trim() || !user?.id) return;
    setPartnerLinking(true);
    try {
      const result = await linkAccountabilityPartner(user.id, partnerEmail.trim());
      if (result.success) {
        toast({ title: "Partner linked!", description: result.message });
        qc.invalidateQueries({ queryKey: ["user"] });
        setPartnerEmail("");
      } else {
        toast({ title: "Could not link partner", description: result.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPartnerLinking(false);
    }
  };

  const handleUnlinkPartner = async () => {
    if (!user?.id) return;
    try {
      await unlinkAccountabilityPartner(user.id);
      toast({ title: "Partner unlinked" });
      qc.invalidateQueries({ queryKey: ["user"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleTogglePublicProfile = async (val: boolean) => {
    setPublicProfile(val);
    if (!user?.id) return;
    try {
      const code = referralCode;
      await updateUser(user.id, { publicProfile: val, referralCode: code });
      qc.invalidateQueries({ queryKey: ["user"] });
      toast({ title: val ? "Public profile enabled!" : "Profile is now private." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleWeeklyReport = async (val: boolean) => {
    setWeeklyReport(val);
    if (!user?.id) return;
    try {
      await updateUser(user.id, { weeklyReportEnabled: val });
      qc.invalidateQueries({ queryKey: ["user"] });
      toast({ title: val ? "Weekly reports enabled!" : "Weekly reports disabled." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleStreakFreeze = async (val: boolean) => {
    setStreakFreezeEnabled(val);
    if (!user?.id) return;
    try {
      await updateUser(user.id, { streakFreezes: val ? 1 : 0 });
      qc.invalidateQueries({ queryKey: ["user"] });
      toast({ title: val ? "Streak freeze activated!" : "Streak freeze removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    setLanguage(lang);
    toast({ title: "Language updated!", description: "Refresh the page to see all changes." });
  };

  const handleCalendarSync = async () => {
    setCalendarSyncing(true);
    try {
      const ics = generateCalendarICS(systemsForCalendar);
      downloadICS(ics);
      toast({ title: "Calendar file downloaded!", description: "Open the .ics file to import into your calendar app." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCalendarSyncing(false);
    }
  };

  const handleCopyReferralLink = () => {
    if (!user?.id) return;
    const link = `https://strivo.life/?ref=${referralCode}`;
    navigator.clipboard.writeText(link).then(() => {
      toast({ title: "Referral link copied!", description: "Share it with friends to invite them to Strivo." });
    });
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    try {
      await AuthService.sendPasswordResetEmail(user.email);
      setPasswordResetSent(true);
      toast({ title: "Reset email sent!", description: `Check ${user.email} for a password reset link.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleExportData = async () => {
    if (!user?.id) return;
    setExportPending(true);
    try {
      const [goals, systems, checkins, journals] = await Promise.all([
        getGoals(user.id),
        getSystems(user.id),
        getCheckins(user.id),
        getJournals(user.id),
      ]);
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: { name: user.name, email: user.email, plan: user.plan, timezone: user.timezone, identityStatement: user.identityStatement },
        goals,
        systems,
        checkins,
        journals,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `strivo-data-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export complete!", description: "Your data has been downloaded." });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExportPending(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeletePending(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not authenticated");
      await deleteUser(currentUser);
      logout().catch(() => {});
      navigate("/");
      toast({ title: "Account deleted", description: "Your account has been permanently removed." });
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login") {
        toast({
          title: "Re-authentication required",
          description: "For security, please sign out and sign back in, then try deleting your account again.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    } finally {
      setDeletePending(false);
      setShowDeleteAccount(false);
      setDeleteConfirmText("");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials = name
    ? name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  const plan = (user?.plan as PlanTier | null | undefined) || "free";
  const planDetails = PLAN_DETAILS[plan] || PLAN_DETAILS.free;
  const isPaid = plan !== "free";
  const canExport = features.aiCoach || plan === "pro" || plan === "elite";

  return (
    <div className="min-h-full bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-background/95 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <SiteLogo className="h-6" />
          <Separator orientation="vertical" className="h-4" />
          <div>
            <h1 className="text-sm font-semibold">Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6 lg:gap-8">

          {/* Sidebar nav — visible on lg+ */}
          <aside className="hidden lg:flex flex-col w-48 flex-shrink-0">
            <nav className="sticky top-24 space-y-0.5">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    data-testid={`tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                      activeTab === tab.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Mobile tab pills */}
            <div
              ref={tabsRef}
              className="lg:hidden flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6"
            >
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    data-tab={tab.id}
                    data-testid={`tab-mobile-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors flex-shrink-0",
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40",
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* ── PROFILE TAB ── */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="pt-6 space-y-5">
                    <SectionTitle>Personal Information</SectionTitle>

                    {/* Avatar row */}
                    <div className="flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        {avatarUrl && !avatarError ? (
                          <img
                            src={avatarUrl}
                            alt={name}
                            onError={() => setAvatarError(true)}
                            className="w-16 h-16 rounded-full object-cover ring-2 ring-border"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full gradient-brand flex items-center justify-center text-white text-xl font-bold">
                            {initials}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center">
                          <Camera className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{name || "Your name"}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                        <Badge
                          variant="secondary"
                          className={cn("mt-1 text-[10px] h-4 px-1.5", planDetails.color)}
                        >
                          <planDetails.icon className="w-2.5 h-2.5 mr-0.5" />
                          {planDetails.label}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Your name"
                          data-testid="input-settings-name"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          value={user?.email || ""}
                          disabled
                          className="text-muted-foreground bg-muted/30"
                          data-testid="input-settings-email"
                        />
                        <p className="text-xs text-muted-foreground">Email cannot be changed directly.</p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="avatar">
                          Avatar URL <span className="text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <Input
                          id="avatar"
                          value={avatarUrl}
                          onChange={e => { setAvatarUrl(e.target.value); setAvatarError(false); }}
                          placeholder="https://example.com/photo.jpg"
                          data-testid="input-settings-avatar"
                        />
                        <p className="text-xs text-muted-foreground">Paste a direct image URL to use as your avatar.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <SectionTitle>Identity Statement</SectionTitle>
                    <p className="text-xs text-muted-foreground -mt-2">
                      Complete the sentence: <span className="font-medium text-foreground">"I AM a person who ___"</span> — this anchors your habits to who you're becoming.
                    </p>
                    <div className="flex items-center gap-2 p-3 rounded-xl border bg-muted/30 focus-within:border-primary/40 transition-colors">
                      <span className="text-sm text-muted-foreground flex-shrink-0 whitespace-nowrap">I AM a person who</span>
                      <Input
                        id="identity-statement"
                        value={identityStatement}
                        onChange={e => setIdentityStatement(e.target.value)}
                        placeholder="shows up every day, no matter what."
                        className="border-none bg-transparent p-0 h-auto text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
                        data-testid="input-settings-identity"
                      />
                    </div>
                    {identityStatement.trim() && (
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                        <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-semibold text-foreground leading-relaxed">
                          "I AM a person who {identityStatement.trim()}."
                        </p>
                      </div>
                    )}
                    <Button onClick={handleSaveProfile} disabled={updatePending} data-testid="button-save-profile">
                      {updatePending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Save Profile
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── APPEARANCE TAB ── */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="pt-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <SectionTitle>Theme</SectionTitle>
                      {!features.darkMode && (
                        <Link href="/pricing">
                          <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-primary/10 gap-1 mb-4">
                            <Lock className="w-2.5 h-2.5" /> Starter+ required
                          </Badge>
                        </Link>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "light",  label: "Light",  icon: Sun,     desc: "Clean and bright",   locked: false },
                        { value: "dark",   label: "Dark",   icon: Moon,    desc: "Easy on the eyes",   locked: !features.darkMode },
                        { value: "system", label: "System", icon: Monitor, desc: "Follows your OS",    locked: !features.darkMode },
                      ].map(({ value, label, icon: Icon, desc, locked }) => (
                        <button
                          key={value}
                          onClick={() => !locked && setTheme(value as any)}
                          data-testid={`button-theme-${value}`}
                          disabled={locked}
                          className={cn(
                            "relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                            locked
                              ? "border-border/40 text-muted-foreground/40 cursor-not-allowed opacity-50"
                              : theme === value
                                ? "border-primary bg-primary/10 text-foreground shadow-sm"
                                : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/30",
                          )}
                        >
                          {theme === value && !locked && (
                            <div className="absolute top-2 right-2">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            </div>
                          )}
                          {locked && <Lock className="w-3 h-3 absolute top-2 right-2 text-muted-foreground/50" />}
                          <Icon className="w-5 h-5" />
                          <span className="text-xs font-semibold">{label}</span>
                          <span className="text-[10px] text-muted-foreground text-center">{desc}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <SectionTitle>Timezone</SectionTitle>
                    <p className="text-xs text-muted-foreground -mt-2">
                      Your check-ins and streak tracking are based on this timezone.
                    </p>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger data-testid="select-timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {TIMEZONES.map(tz => (
                          <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleSaveAppearance} disabled={updatePending} data-testid="button-save-appearance">
                      {updatePending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Save Preferences
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Languages className="w-4 h-4 text-primary" />
                      <SectionTitle>Language</SectionTitle>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-2">
                      Choose your preferred display language for the Strivo interface.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {LANGUAGES.map(lang => (
                        <button
                          key={lang.code}
                          onClick={() => handleLanguageChange(lang.code)}
                          data-testid={`button-lang-${lang.code}`}
                          className={cn(
                            "relative flex flex-col items-center gap-1.5 p-4 rounded-xl border transition-all",
                            currentLang === lang.code
                              ? "border-primary bg-primary/10 text-foreground shadow-sm"
                              : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/30",
                          )}
                        >
                          {currentLang === lang.code && (
                            <div className="absolute top-2 right-2">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            </div>
                          )}
                          <span className="text-lg">{lang.flag}</span>
                          <span className="text-xs font-semibold">{lang.label}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── NOTIFICATIONS TAB ── */}
            {activeTab === "notifications" && (
              <Card>
                <CardContent className="pt-6 space-y-5">
                  <SectionTitle>Daily Check-in Reminder</SectionTitle>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Get a browser notification each day to log your habits and keep your streak alive.
                  </p>

                  {notifPermission === "denied" && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/8 border border-destructive/20">
                      <BellOff className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-destructive mb-1">Notifications are blocked</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Go to your browser's site settings and allow notifications for this site, then reload the page.
                        </p>
                      </div>
                    </div>
                  )}

                  {notifPermission === "default" && (
                    <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BellRing className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold mb-1">Enable browser notifications</p>
                        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                          Allow Strivo to send you a daily nudge at your preferred time. No account needed — purely browser-based.
                        </p>
                        <Button size="sm" onClick={requestNotifPermission} data-testid="button-enable-notifications">
                          <BellRing className="w-3.5 h-3.5 mr-1.5" />
                          Enable Reminders
                        </Button>
                      </div>
                    </div>
                  )}

                  {notifPermission === "granted" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs text-chart-3 font-medium mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Notifications are enabled
                      </div>

                      <SettingRow
                        label="Daily reminder"
                        description="A gentle nudge to log your habits each day"
                      >
                        <Switch
                          checked={reminderEnabled}
                          onCheckedChange={setReminderEnabled}
                          data-testid="switch-reminder-enabled"
                        />
                      </SettingRow>

                      {reminderEnabled && (
                        <div className="space-y-1.5 pt-1">
                          <Label htmlFor="reminder-time">Reminder time</Label>
                          <Input
                            id="reminder-time"
                            type="time"
                            value={reminderTime}
                            onChange={e => setReminderTime(e.target.value)}
                            className="w-36"
                            data-testid="input-reminder-time"
                          />
                          <p className="text-xs text-muted-foreground">
                            You'll receive a notification at this time if you haven't checked in yet.
                          </p>
                        </div>
                      )}

                      {reminderEnabled && (
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            <span className="font-medium text-foreground">Missed day message: </span>
                            "Missed yesterday? Restart tiny. Your system only needs the minimum version today."
                          </p>
                        </div>
                      )}

                      <Button
                        size="sm"
                        onClick={handleSaveReminder}
                        disabled={updatePending}
                        data-testid="button-save-reminder"
                      >
                        {updatePending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                        Save Reminder
                      </Button>
                    </div>
                  )}

                  <Separator className="my-2" />

                  <div className="flex items-center gap-2 mb-1">
                    <Snowflake className="w-4 h-4 text-sky-400" />
                    <p className="text-sm font-semibold">Streak Freeze</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    Activate a streak freeze to protect your streak on days you have to skip. It absorbs one missed day without breaking your record.
                  </p>
                  <SettingRow
                    label="Streak freeze active"
                    description={streakFreezeEnabled ? "Your next missed day won't break your streak." : "Enable to protect your streak on one missed day."}
                  >
                    <Switch
                      checked={streakFreezeEnabled}
                      onCheckedChange={handleToggleStreakFreeze}
                      data-testid="switch-streak-freeze"
                    />
                  </SettingRow>
                  {streakFreezeEnabled && (
                    <div className="flex items-center gap-2 mt-1 text-xs text-sky-500 font-medium">
                      <Snowflake className="w-3.5 h-3.5" />
                      Streak freeze armed — you're protected for 1 missed day
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── AUDIO TAB ── */}
            {activeTab === "audio" && (
              <div className="space-y-6">
                {!features.futureSelfAudio ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-xl border border-border/60 bg-muted/20">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Lock className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">Future Self Audio</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Record a motivational message as your future self and have it play back daily to reinforce your identity. Available on <span className="font-medium text-primary">Starter</span> and above.
                          </p>
                        </div>
                        <Link href="/pricing">
                          <Button size="sm" className="flex-shrink-0 gap-1.5" data-testid="button-upgrade-audio">
                            <Sparkles className="w-3.5 h-3.5" /> Upgrade
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <Card>
                      <CardContent className="pt-6 space-y-4">
                        <SectionTitle>Your Recording</SectionTitle>
                        <FutureSelfAudioSetup
                          compact
                          existingUrl={user?.futureAudioUrl}
                          onSaved={async (url) => {
                            try { await updateProfile({ futureAudioUrl: url ?? null } as any); } catch {}
                          }}
                        />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 space-y-4">
                        <SectionTitle>Playback Settings</SectionTitle>
                        <FutureSelfAudioSettings prefs={audioPrefs} onChange={setAudioPrefs} />
                        <Button size="sm" onClick={handleSaveAudioPrefs} disabled={updatePending} data-testid="button-save-audio-prefs">
                          {updatePending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                          Save Audio Preferences
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}

            {/* ── SOCIAL TAB ── */}
            {activeTab === "social" && (
              <div className="space-y-6">

                {/* Accountability Partner */}
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-primary" />
                      <SectionTitle>Accountability Partner</SectionTitle>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-2 leading-relaxed">
                      Link up with a friend who also uses Strivo. You'll stay visible to each other and be more likely to show up.
                    </p>
                    {user?.accountabilityPartnerName ? (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-chart-3/8 border border-chart-3/25">
                        <div className="w-10 h-10 rounded-xl bg-chart-3/20 flex items-center justify-center flex-shrink-0 text-lg font-bold text-chart-3">
                          {user.accountabilityPartnerName[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{user.accountabilityPartnerName}</p>
                          <p className="text-xs text-muted-foreground">{user.accountabilityPartnerEmail}</p>
                          <p className="text-xs text-chart-3 font-medium mt-0.5">Active accountability partner</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={handleUnlinkPartner} data-testid="button-unlink-partner">
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">Enter the email address of a friend who is already on Strivo:</p>
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="friend@example.com"
                            value={partnerEmail}
                            onChange={e => setPartnerEmail(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleLinkPartner()}
                            data-testid="input-partner-email"
                          />
                          <Button
                            onClick={handleLinkPartner}
                            disabled={partnerLinking || !partnerEmail.trim()}
                            data-testid="button-link-partner"
                          >
                            {partnerLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Link"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Referral Program */}
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Gift className="w-4 h-4 text-primary" />
                      <SectionTitle>Refer a Friend</SectionTitle>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-2 leading-relaxed">
                      Share Strivo with friends. When they sign up through your link, you both get credited!
                    </p>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Your referral code</p>
                          <p className="font-bold text-lg tracking-widest">{referralCode}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <p className="text-xs text-muted-foreground">Total referrals</p>
                          <p className="font-bold text-2xl text-primary">{user?.referralCount ?? 0}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleCopyReferralLink} className="gap-1.5 flex-1" data-testid="button-copy-referral">
                          <Copy className="w-3.5 h-3.5" /> Copy Link
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 flex-1"
                          onClick={() => {
                            const link = `https://strivo.life/?ref=${referralCode}`;
                            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I've been building habits with @strivohq — it's changing how I think about consistency. Try it free: ${link}`)}`);
                          }}
                          data-testid="button-share-twitter"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Share on X
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Public Profile */}
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-4 h-4 text-primary" />
                      <SectionTitle>Public Profile</SectionTitle>
                    </div>
                    <SettingRow
                      label="Enable public profile"
                      description="Share your habit progress with anyone via a public link — no login required."
                    >
                      <Switch
                        checked={publicProfile}
                        onCheckedChange={handleTogglePublicProfile}
                        data-testid="switch-public-profile"
                      />
                    </SettingRow>
                    {publicProfile && (
                      <div className="pt-2 space-y-2">
                        <p className="text-xs text-muted-foreground">Your public profile link:</p>
                        <div className="flex gap-2">
                          <Input
                            readOnly
                            value={`https://strivo.life/profile/${referralCode}`}
                            className="text-xs"
                            data-testid="input-public-profile-link"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(`https://strivo.life/profile/${referralCode}`);
                              toast({ title: "Profile link copied!" });
                            }}
                            data-testid="button-copy-profile-link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <Link href={`/profile/${referralCode}`} target="_blank">
                          <Button size="sm" variant="ghost" className="gap-1.5 text-xs">
                            <ExternalLink className="w-3 h-3" /> Preview your profile
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Weekly Progress Report */}
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart2 className="w-4 h-4 text-primary" />
                      <SectionTitle>Weekly Progress Report</SectionTitle>
                    </div>
                    <SettingRow
                      label="Weekly email summary"
                      description="Receive a weekly email every Monday with your completion rate, streaks, and wins."
                    >
                      <Switch
                        checked={weeklyReport}
                        onCheckedChange={handleToggleWeeklyReport}
                        data-testid="switch-weekly-report"
                      />
                    </SettingRow>
                    {weeklyReport && (
                      <p className="text-xs text-chart-3 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Weekly reports enabled — sent to {user?.email}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Note: You'll need to configure EmailJS templates to enable email delivery. See <Link href="/support" className="underline">support</Link> for setup instructions.
                    </p>
                  </CardContent>
                </Card>

              </div>
            )}

            {/* ── PRIVACY TAB ── */}
            {activeTab === "privacy" && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <SectionTitle>Export Your Data</SectionTitle>
                    <p className="text-xs text-muted-foreground -mt-2">
                      Download all your goals, systems, check-ins, and journal entries as a single JSON file.
                    </p>

                    {canExport ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-border/60 bg-muted/20">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Download className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Full data export</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Includes goals, systems, check-ins, and journal entries
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleExportData}
                          disabled={exportPending}
                          className="flex-shrink-0 gap-1.5"
                          data-testid="button-export-data"
                        >
                          {exportPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          {exportPending ? "Exporting…" : "Export JSON"}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-border/60 bg-muted/20 opacity-75">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                          <Lock className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Data export</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Available on Pro and Elite plans</p>
                        </div>
                        <Link href="/pricing">
                          <Button size="sm" variant="outline" className="flex-shrink-0 gap-1.5" data-testid="button-upgrade-export">
                            <Sparkles className="w-3.5 h-3.5" /> Upgrade
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <SectionTitle>Privacy Commitment</SectionTitle>
                    <div className="space-y-3">
                      {[
                        { title: "Your data stays yours", body: "We never sell, rent, or share your personal data with third parties for advertising or marketing purposes." },
                        { title: "End-to-end privacy", body: "Your habits, journal entries, and goals are private to you. Only you can see your data." },
                        { title: "Minimal collection", body: "We only collect what's necessary to run the service — nothing more." },
                      ].map(item => (
                        <div key={item.title} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
                          <CheckCircle2 className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-1">
                      <Link href="/privacy">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs" data-testid="link-privacy-policy">
                          <ExternalLink className="w-3 h-3" /> Privacy Policy
                        </Button>
                      </Link>
                      <Link href="/terms">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs" data-testid="link-terms">
                          <ExternalLink className="w-3 h-3" /> Terms of Service
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── BILLING TAB ── */}
            {activeTab === "billing" && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <SectionTitle>Current Plan</SectionTitle>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <planDetails.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{planDetails.label} Plan</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{planDetails.description}</p>
                        </div>
                      </div>
                      <Badge
                        className={cn("flex-shrink-0", planDetails.color)}
                        variant={isPaid ? "default" : "secondary"}
                        data-testid="badge-current-plan"
                      >
                        {planDetails.label}
                      </Badge>
                    </div>

                    {isPaid ? (
                      STRIPE_CUSTOMER_PORTAL_URL ? (
                        <a href={STRIPE_CUSTOMER_PORTAL_URL} target="_blank" rel="noopener noreferrer">
                          <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 hover:bg-muted/40 transition-colors cursor-pointer">
                            <div>
                              <p className="text-sm font-medium">Manage billing</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Update payment, cancel, or change plan</p>
                            </div>
                            <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0 text-xs" data-testid="button-manage-billing" asChild>
                              <span><ExternalLink className="w-3 h-3" /> Billing portal</span>
                            </Button>
                          </div>
                        </a>
                      ) : (
                        <div className="p-4 rounded-xl bg-muted/20 border border-border/40">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            To manage your subscription, contact{" "}
                            <a href="mailto:support@strivo.life" className="underline hover:text-foreground transition-colors">support@strivo.life</a>.
                          </p>
                        </div>
                      )
                    ) : (
                      <Link href="/pricing">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
                          <div>
                            <p className="text-sm font-semibold text-primary">Upgrade your plan</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Unlock unlimited goals, AI coaching, and advanced analytics</p>
                          </div>
                          <Button size="sm" className="gap-1.5 flex-shrink-0 text-xs" data-testid="button-upgrade" asChild>
                            <span><Sparkles className="w-3.5 h-3.5" /> See Plans</span>
                          </Button>
                        </div>
                      </Link>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <SectionTitle>Plan Features</SectionTitle>
                    {[
                      { label: "Goals",              value: plan === "free" ? "Up to 2" : plan === "starter" ? "Up to 10" : "Unlimited" },
                      { label: "Habit Systems",      value: plan === "free" ? "Up to 3" : "Unlimited" },
                      { label: "Dark Mode",          value: features.darkMode ? "Included" : "Starter+" },
                      { label: "AI Habit Coach",     value: features.aiCoachUnlimited ? "Unlimited" : features.aiCoach ? "10/day" : "Not included" },
                      { label: "Future Self Audio",  value: features.futureSelfAudio ? "Included" : "Starter+" },
                      { label: "Advanced Analytics", value: features.betterAnalytics ? "Included" : "Starter+" },
                      { label: "Data Export",        value: canExport ? "Included" : "Pro+" },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <span className="text-sm text-muted-foreground">{row.label}</span>
                        <span className={cn(
                          "text-xs font-medium",
                          row.value === "Unlimited" || row.value === "Included" ? "text-chart-3" : "text-muted-foreground",
                        )}>{row.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── ACCOUNT TAB ── */}
            {activeTab === "account" && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <SectionTitle>Password</SectionTitle>
                    <p className="text-xs text-muted-foreground -mt-2">
                      We'll send a password reset link to <span className="font-medium text-foreground">{user?.email}</span>.
                    </p>
                    {passwordResetSent ? (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-chart-3/8 border border-chart-3/20">
                        <CheckCircle2 className="w-5 h-5 text-chart-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-chart-3">Reset email sent!</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Check your inbox for the password reset link.</p>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSendPasswordReset}
                        className="gap-1.5"
                        data-testid="button-change-password"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Send Password Reset Email
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <SectionTitle>Help & Resources</SectionTitle>
                    <div className="space-y-1">
                      {[
                        { icon: Zap,      label: "System Builder guide",  sub: "How to build your first habit system",  href: "/systems/new" },
                        { icon: Target,   label: "Goal-setting guide",    sub: "How to write goals that stick",          href: "/goals" },
                        { icon: BookOpen, label: "Journaling tips",       sub: "Make the most of daily reflection",      href: "/journal" },
                      ].map(item => (
                        <Link key={item.label} href={item.href}>
                          <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer border border-transparent hover:border-border/40">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <item.icon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{item.label}</p>
                              <p className="text-xs text-muted-foreground">{item.sub}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <SectionTitle>Session</SectionTitle>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20">
                      <div>
                        <p className="text-sm font-medium">Sign out</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Log out of your account on this device</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLogout(true)}
                        className="gap-1.5 flex-shrink-0"
                        data-testid="button-logout-settings"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-destructive/30">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <SectionTitle>Danger Zone</SectionTitle>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-destructive">Delete account</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeleteAccount(true)}
                        className="gap-1.5 flex-shrink-0"
                        data-testid="button-delete-account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Footer */}
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Heart className="w-3 h-3 text-chart-5" />
                Built with care for people who want to actually change
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sign out dialog */}
      <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? Your data will be waiting when you come back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay in</AlertDialogCancel>
            <Button onClick={handleLogout} data-testid="button-confirm-logout">Sign Out</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete account dialog */}
      <AlertDialog open={showDeleteAccount} onOpenChange={open => { setShowDeleteAccount(open); if (!open) setDeleteConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" /> Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                This will <strong>permanently delete</strong> your account, goals, habit systems, check-ins, and all data. This cannot be undone.
              </span>
              <span className="block mt-3">
                Type <strong>DELETE</strong> to confirm:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="border-destructive/40 focus-visible:ring-destructive/40"
              data-testid="input-delete-confirm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== "DELETE" || deletePending}
              onClick={handleDeleteAccount}
              data-testid="button-confirm-delete"
            >
              {deletePending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Forever
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
