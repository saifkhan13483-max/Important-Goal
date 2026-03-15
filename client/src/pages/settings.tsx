import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAppStore } from "@/store/auth.store";
import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Sun, Moon, Monitor, LogOut, User, Palette, Globe,
  Bell, Shield, HelpCircle, Sparkles, Zap, Target, BookOpen,
  ChevronRight, ExternalLink, Heart,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";

const timezones = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
  "Asia/Kolkata", "Australia/Sydney",
];

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  badge,
}: {
  icon: any;
  title: string;
  description?: string;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              {description && <CardDescription className="text-xs mt-0">{description}</CardDescription>}
            </div>
          </div>
          {badge && (
            <Badge variant="secondary" className="text-xs flex-shrink-0">{badge}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function Settings() {
  const { user } = useAppStore();
  const { updateProfile, updatePending, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showLogout, setShowLogout] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [timezone, setTimezone] = useState(user?.timezone || "UTC");
  const [identityStatement, setIdentityStatement] = useState(user?.identityStatement || "");

  const handleSaveProfile = async () => {
    try {
      await updateProfile({ name, avatarUrl: avatarUrl || undefined, timezone, preferredTheme: theme, identityStatement: identityStatement.trim() || null } as any);
      toast({ title: "Profile saved!", description: "Your changes have been applied." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="p-5 md:p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Profile info */}
      <SectionCard
        icon={User}
        title="Profile"
        description="Update your personal information"
      >
        <div className="space-y-4">
          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full gradient-brand flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
              {name ? name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "SF"}
            </div>
            <div>
              <p className="text-sm font-medium">{name || "Your name"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              data-testid="input-settings-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="text-muted-foreground"
              data-testid="input-settings-email"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">Avatar URL <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="avatar"
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              data-testid="input-settings-avatar"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="identity-statement" className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Identity Statement
            </Label>
            <p className="text-xs text-muted-foreground">Complete the sentence: "I AM a person who ___"</p>
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
              <span className="text-sm text-muted-foreground flex-shrink-0">I AM a person who</span>
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
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-sm font-semibold text-foreground">
                  "I AM a person who {identityStatement.trim()}."
                </p>
              </div>
            )}
          </div>

          <Button onClick={handleSaveProfile} disabled={updatePending} data-testid="button-save-profile">
            {updatePending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Profile
          </Button>
        </div>
      </SectionCard>

      {/* Appearance */}
      <SectionCard
        icon={Palette}
        title="Appearance"
        description="Customize how SystemForge looks"
      >
        <div className="space-y-2">
          <Label>Theme</Label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "light", label: "Light", icon: Sun, desc: "Clean and bright" },
              { value: "dark", label: "Dark", icon: Moon, desc: "Easy on the eyes" },
              { value: "system", label: "System", icon: Monitor, desc: "Follows your OS" },
            ].map(({ value, label, icon: Icon, desc }) => (
              <button
                key={value}
                onClick={() => setTheme(value as any)}
                data-testid={`button-theme-${value}`}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-4 rounded-xl border transition-all",
                  theme === value
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:bg-muted/30",
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-[10px] text-muted-foreground">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Regional */}
      <SectionCard
        icon={Globe}
        title="Regional"
        description="Set your timezone for accurate daily tracking"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger data-testid="select-timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map(tz => (
                  <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Your check-ins and streak tracking are based on this timezone.
            </p>
          </div>
          <Button onClick={handleSaveProfile} disabled={updatePending} variant="outline" data-testid="button-save-timezone">
            Save Timezone
          </Button>
        </div>
      </SectionCard>

      {/* Notifications (coming soon placeholder) */}
      <SectionCard
        icon={Bell}
        title="Notifications"
        description="Configure daily reminders and check-in alerts"
        badge="Coming soon"
      >
        <div className="space-y-3">
          {[
            { label: "Daily check-in reminder", desc: "A gentle nudge to log your habits", soon: true },
            { label: "Weekly review summary", desc: "Get a summary of your week every Sunday", soon: true },
            { label: "Streak alerts", desc: "Alert when you're about to break a streak", soon: true },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Badge variant="secondary" className="text-[10px] text-muted-foreground flex-shrink-0">
                Soon
              </Badge>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Data & Privacy */}
      <SectionCard
        icon={Shield}
        title="Data & Privacy"
        description="Your data, your control"
      >
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
            <p className="text-sm font-medium mb-1">Export your data</p>
            <p className="text-xs text-muted-foreground mb-2">
              Download all your goals, systems, check-ins, and journal entries as a CSV or JSON file.
            </p>
            <Badge variant="secondary" className="text-[10px] text-muted-foreground">Available on Pro plan</Badge>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
            <p className="text-sm font-medium mb-1">Your data stays yours</p>
            <p className="text-xs text-muted-foreground">
              We never sell your data. All your habits, journal entries, and goals are private to you.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Quick links */}
      <SectionCard
        icon={HelpCircle}
        title="Help & Resources"
        description="Learn to get the most out of SystemForge"
      >
        <div className="space-y-2">
          {[
            { icon: Zap, label: "System Builder guide", sub: "How to build your first habit system", href: "/systems/new" },
            { icon: Target, label: "Goal-setting guide", sub: "How to write goals that stick", href: "/goals" },
            { icon: BookOpen, label: "Journaling tips", sub: "Make the most of daily reflection", href: "/journal" },
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
      </SectionCard>

      {/* Account */}
      <SectionCard
        icon={User}
        title="Account"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border/40">
            <div>
              <p className="text-sm font-medium">Current plan</p>
              <p className="text-xs text-muted-foreground">Free — up to 2 goals, 3 systems</p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Free
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-md bg-chart-3/5 border border-chart-3/20">
            <div>
              <p className="text-sm font-medium text-chart-3">Upgrade to Pro</p>
              <p className="text-xs text-muted-foreground">Unlimited goals, systems + advanced analytics</p>
            </div>
            <Button size="sm" className="gap-1.5 flex-shrink-0 text-xs" data-testid="button-upgrade">
              <Sparkles className="w-3 h-3" />
              Upgrade
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border/40">
            <div>
              <p className="text-sm font-medium">Sign out</p>
              <p className="text-xs text-muted-foreground">Log out of your account on this device</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowLogout(true)} data-testid="button-logout-settings" className="flex-shrink-0">
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* Footer note */}
      <div className="text-center py-2">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <Heart className="w-3 h-3 text-chart-5" />
          Built with care for people who want to actually change
        </p>
      </div>

      {/* Logout confirm */}
      <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of SystemForge? You can always come back and your data will be waiting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay in</AlertDialogCancel>
            <Button onClick={handleLogout} data-testid="button-confirm-logout">Sign Out</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
