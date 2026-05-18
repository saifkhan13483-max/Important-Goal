import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, Zap, BarChart2, Calendar, Users, Target, Camera, RefreshCw, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const CURRENT_VERSION = "2.5.0";
const STORAGE_KEY = "strivo_seen_whats_new";

interface Feature {
  icon: React.ElementType;
  title: string;
  desc: string;
  tag: "New" | "Improved" | "Pro";
  color: string;
}

const FEATURES: Feature[] = [
  {
    icon: Calendar,
    title: "Flexible Habit Frequency",
    desc: "Set habits to 2×, 3×, 4×, or 5× per week — not just daily. Perfect for workouts and practice sessions.",
    tag: "New",
    color: "bg-chart-3/10 text-chart-3",
  },
  {
    icon: BarChart2,
    title: "Difficulty Trend Chart",
    desc: "See how hard each habit feels over time. As you stay consistent, habits should get easier — now you can see it.",
    tag: "New",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Target,
    title: "Stats Summary on System Detail",
    desc: "Your all-time completion rate, total done count, and average difficulty are now front and center.",
    tag: "Improved",
    color: "bg-chart-2/10 text-chart-2",
  },
  {
    icon: Users,
    title: "Community Templates",
    desc: "Browse and use habit systems created by other Strivo users, and publish your own for the community.",
    tag: "New",
    color: "bg-chart-4/10 text-chart-4",
  },
  {
    icon: Camera,
    title: "Progress Photos in Check-Ins",
    desc: "Attach an optional photo to any check-in to visually document your transformation journey.",
    tag: "New",
    color: "bg-chart-5/10 text-chart-5",
  },
  {
    icon: RefreshCw,
    title: "Goal-Based Onboarding Paths",
    desc: "New users now choose from goal themes (Fitness, Sleep, Focus, etc.) to get pre-filled habit ideas instantly.",
    tag: "Improved",
    color: "bg-chart-3/10 text-chart-3",
  },
  {
    icon: Star,
    title: "Referral Rewards",
    desc: "Earn a Streak Freeze every time someone signs up using your referral code. Share your link in Settings.",
    tag: "New",
    color: "bg-chart-4/10 text-chart-4",
  },
];

const TAG_COLORS: Record<Feature["tag"], string> = {
  New: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  Improved: "bg-primary/15 text-primary border-primary/30",
  Pro: "bg-chart-4/15 text-chart-4 border-chart-4/30",
};

export function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (seen !== CURRENT_VERSION) {
        const t = setTimeout(() => setOpen(true), 1500);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const handleClose = () => {
    try {
      localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    } catch {}
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <div className="gradient-brand p-6 text-white rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-white/70 font-medium">Version {CURRENT_VERSION}</p>
                <DialogTitle className="text-xl font-bold text-white">What's New in Strivo</DialogTitle>
              </div>
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-white/80 text-sm mt-3 leading-relaxed">
            We've shipped a big update with 7 new features and improvements. Here's everything that's new.
          </p>
        </div>

        <div className="p-4 space-y-3">
          {FEATURES.map((feat) => (
            <div key={feat.title} className="flex items-start gap-3 p-3.5 rounded-xl border border-border hover:bg-muted/30 transition-colors">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", feat.color)}>
                <feat.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold">{feat.title}</p>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 border", TAG_COLORS[feat.tag])}>
                    {feat.tag}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 pb-4">
          <Button className="w-full gradient-brand text-white border-0 rounded-xl h-11 font-semibold" onClick={handleClose}>
            <Zap className="w-4 h-4 mr-2" />
            Got it — let's go!
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            You can always check updates in Settings → About
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
