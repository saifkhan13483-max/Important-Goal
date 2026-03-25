import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getPublicTemplates, getCommunityTemplates, publishCommunityTemplate, upvoteCommunityTemplate, incrementCommunityTemplateUsed } from "@/services/templates.service";
import { getSystems } from "@/services/systems.service";
import { useAppStore } from "@/store/auth.store";
import type { Template, CommunityTemplate } from "@/types/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Search, LayoutGrid, Brain, Zap, CheckSquare, Trophy, ShieldCheck,
  BookOpen, Sparkles, ArrowRight, Star, Lock, X, Dumbbell, Moon,
  Briefcase, Timer, PenLine, Sunset, Eye, Heart, Droplets, Languages,
  DollarSign, Salad, Lightbulb, Users, Sun, ListChecks, ThumbsUp, Share2, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPlanFeatures } from "@/lib/plan-limits";
import { Link } from "wouter";

const FREE_TEMPLATE_LIMIT = 3;

const ALL_CATEGORIES = [
  { value: "all",              label: "All",            emoji: "✨" },
  { value: "beginner",         label: "Beginner",       emoji: "⭐" },
  { value: "fitness",          label: "Fitness",        emoji: "🏃" },
  { value: "morning-routine",  label: "Morning",        emoji: "☀️" },
  { value: "mindset",          label: "Mindset",        emoji: "💡" },
  { value: "deep-work",        label: "Deep Work",      emoji: "🧠" },
  { value: "reading",          label: "Reading",        emoji: "📚" },
  { value: "meditation",       label: "Meditation",     emoji: "🧘" },
  { value: "gratitude",        label: "Gratitude",      emoji: "🙏" },
  { value: "sleep",            label: "Sleep",          emoji: "😴" },
  { value: "nutrition",        label: "Nutrition",      emoji: "🥗" },
  { value: "hydration",        label: "Hydration",      emoji: "💧" },
  { value: "relationship",     label: "Relationship",   emoji: "❤️" },
  { value: "finance",          label: "Finance",        emoji: "💰" },
  { value: "language",         label: "Language",       emoji: "🗣️" },
  { value: "content-creation", label: "Content",        emoji: "🎨" },
  { value: "creativity",       label: "Creativity",     emoji: "🎭" },
  { value: "networking",       label: "Networking",     emoji: "🤝" },
  { value: "productivity",     label: "Productivity",   emoji: "⚙️" },
  { value: "evening-reset",    label: "Evening Reset",  emoji: "🌙" },
  { value: "exam-prep",        label: "Exam Prep",      emoji: "📝" },
  { value: "job-search",       label: "Job Search",     emoji: "💼" },
  { value: "study-sprint",     label: "Study Sprint",   emoji: "⚡" },
];

const CATEGORY_COLORS: Record<string, string> = {
  fitness:           "bg-chart-3/15 text-chart-3 border-chart-3/30",
  reading:           "bg-chart-2/15 text-chart-2 border-chart-2/30",
  meditation:        "bg-chart-5/15 text-chart-5 border-chart-5/30",
  "exam-prep":       "bg-amber-500/15 text-amber-500 border-amber-500/30",
  "content-creation":"bg-chart-4/15 text-chart-4 border-chart-4/30",
  relationship:      "bg-rose-500/15 text-rose-500 border-rose-500/30",
  sleep:             "bg-indigo-500/15 text-indigo-500 border-indigo-500/30",
  "deep-work":       "bg-primary/15 text-primary border-primary/30",
  mindset:           "bg-chart-5/15 text-chart-5 border-chart-5/30",
  career:            "bg-primary/15 text-primary border-primary/30",
  business:          "bg-chart-4/15 text-chart-4 border-chart-4/30",
  health:            "bg-chart-3/15 text-chart-3 border-chart-3/30",
  "evening-reset":   "bg-indigo-500/15 text-indigo-500 border-indigo-500/30",
  "job-search":      "bg-amber-500/15 text-amber-500 border-amber-500/30",
  "study-sprint":    "bg-chart-2/15 text-chart-2 border-chart-2/30",
  gratitude:         "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  "morning-routine": "bg-orange-400/15 text-orange-500 border-orange-400/30",
  hydration:         "bg-sky-500/15 text-sky-500 border-sky-500/30",
  language:          "bg-teal-500/15 text-teal-600 border-teal-500/30",
  finance:           "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  nutrition:         "bg-lime-600/15 text-lime-700 border-lime-600/30",
  creativity:        "bg-chart-4/15 text-chart-4 border-chart-4/30",
  networking:        "bg-blue-500/15 text-blue-600 border-blue-500/30",
  productivity:      "bg-primary/15 text-primary border-primary/30",
};

const CATEGORY_ICONS: Record<string, any> = {
  fitness:           Dumbbell,
  reading:           BookOpen,
  "deep-work":       Brain,
  mindset:           Lightbulb,
  meditation:        Sunset,
  "content-creation":PenLine,
  "evening-reset":   Moon,
  "job-search":      Briefcase,
  "study-sprint":    Timer,
  "exam-prep":       BookOpen,
  sleep:             Moon,
  relationship:      Heart,
  gratitude:         Star,
  "morning-routine": Sun,
  hydration:         Droplets,
  language:          Languages,
  finance:           DollarSign,
  nutrition:         Salad,
  creativity:        PenLine,
  networking:        Users,
  productivity:      ListChecks,
};

const BEGINNER_CATEGORIES = new Set([
  "fitness", "reading", "meditation", "sleep", "mindset",
  "evening-reset", "study-sprint", "gratitude", "morning-routine",
  "hydration", "nutrition",
]);

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? "bg-muted text-muted-foreground border-border";
}
function categoryLabel(cat: string) {
  return ALL_CATEGORIES.find(c => c.value === cat)?.label ?? cat;
}
function categoryEmoji(cat: string) {
  return ALL_CATEGORIES.find(c => c.value === cat)?.emoji ?? "✨";
}
function isBeginnerFriendly(t: Template) {
  return BEGINNER_CATEGORIES.has(t.category);
}

type DetailRowProps = { icon: React.ElementType; label: string; value?: string | null; color?: string };
function DetailRow({ icon: Icon, label, value, color = "text-muted-foreground" }: DetailRowProps) {
  if (!value) return null;
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-muted/40 border border-border/40 items-start">
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${color}`} />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>
        <p className="text-xs leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  isPremiumLocked,
  onPreview,
  onUse,
}: {
  template: Template;
  isPremiumLocked: boolean;
  onPreview: () => void;
  onUse: () => void;
}) {
  const Icon = CATEGORY_ICONS[template.category] ?? Sparkles;
  const isBeginner = isBeginnerFriendly(template);

  return (
    <Card
      className={cn(
        "flex flex-col transition-all border",
        isPremiumLocked ? "opacity-75" : "hover-elevate"
      )}
      data-testid={`template-card-${template.id}`}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col flex-1">
        {/* Icon + title row */}
        <div className="flex items-start gap-3 mb-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            isPremiumLocked ? "bg-muted" : "bg-primary/10"
          )}>
            {isPremiumLocked
              ? <Lock className="w-4 h-4 text-muted-foreground" />
              : <Icon className="w-4 h-4 text-primary" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-snug mb-1">{template.title}</h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className={cn("text-[10px]", categoryColor(template.category))} data-testid={`badge-category-${template.id}`}>
                {categoryEmoji(template.category)} {categoryLabel(template.category)}
              </Badge>
              {isBeginner && (
                <Badge variant="outline" className="text-[10px] gap-1 text-chart-4 border-chart-4/30 bg-chart-4/5" data-testid={`badge-beginner-${template.id}`}>
                  <Star className="w-2.5 h-2.5" />
                  Beginner
                </Badge>
              )}
              {isPremiumLocked && (
                <Badge variant="outline" className="text-[10px] gap-1 text-primary border-primary/30 bg-primary/5" data-testid={`badge-premium-${template.id}`}>
                  <Sparkles className="w-2.5 h-2.5" />
                  Pro
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {template.description && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2 flex-1">
            {template.description}
          </p>
        )}

        {/* Identity statement */}
        {template.identityStatement && !isPremiumLocked && (
          <p className="text-xs italic text-muted-foreground border-l-2 border-primary/40 pl-2 mb-3 line-clamp-2">
            "{template.identityStatement}"
          </p>
        )}

        {/* Minimum action */}
        {template.minimumAction && !isPremiumLocked && (
          <div className="flex items-start gap-2 bg-chart-3/5 border border-chart-3/15 rounded-lg px-2.5 py-2 mb-4">
            <CheckSquare className="w-3 h-3 text-chart-3 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-foreground leading-relaxed line-clamp-2">{template.minimumAction}</p>
          </div>
        )}

        {/* Locked placeholder */}
        {isPremiumLocked && (
          <div className="flex items-start gap-2 bg-muted/50 border border-border/40 rounded-lg px-2.5 py-2 mb-4">
            <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">Upgrade to Pro to unlock this template.</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          {isPremiumLocked ? (
            <Link href="/pricing" className="flex-1">
              <Button
                size="sm"
                className="w-full gap-1.5"
                data-testid={`button-upgrade-template-${template.id}`}
              >
                <Sparkles className="w-3 h-3" />
                Upgrade to Pro
              </Button>
            </Link>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onPreview}
                data-testid={`button-view-template-${template.id}`}
              >
                <Eye className="w-3 h-3 mr-1" />
                Preview
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={onUse}
                data-testid={`button-use-template-${template.id}`}
              >
                Use
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TemplatesPage() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [activeTab, setActiveTab] = useState<"official" | "community">("official");
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishForm, setPublishForm] = useState({ title: "", category: "fitness", description: "", minimumAction: "", identityStatement: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const features = getPlanFeatures(user?.plan);

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: () => getPublicTemplates(),
  });

  const { data: communityTemplates = [], isLoading: communityLoading } = useQuery<CommunityTemplate[]>({
    queryKey: ["community-templates"],
    queryFn: () => getCommunityTemplates(),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishCommunityTemplate(userId, user?.name || "Anonymous", {
      title: publishForm.title,
      category: publishForm.category,
      description: publishForm.description || null,
      minimumAction: publishForm.minimumAction || null,
      identityStatement: publishForm.identityStatement || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-templates"] });
      setShowPublishDialog(false);
      setPublishForm({ title: "", category: "fitness", description: "", minimumAction: "", identityStatement: "" });
      toast({ title: "Template published!", description: "Your template is now visible to the community." });
    },
    onError: () => {
      toast({ title: "Couldn't publish", description: "Please try again.", variant: "destructive" });
    },
  });

  const upvoteMutation = useMutation({
    mutationFn: (id: string) => upvoteCommunityTemplate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["community-templates"] }); },
  });

  const { data: systems = [] } = useQuery({
    queryKey: ["systems", userId],
    queryFn: () => getSystems(userId),
    enabled: !!userId,
  });

  const isFirstTime = systems.length === 0;

  const allFiltered = useMemo(() => templates.filter(t => {
    const matchesCategory = activeCategory === "all"
      || (activeCategory === "beginner" && isBeginnerFriendly(t))
      || t.category === activeCategory;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || [t.title, t.description, t.category, t.identityStatement, t.minimumAction]
      .some(f => f?.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  }), [templates, search, activeCategory]);

  const freeTemplates = useMemo(() => {
    const beginner = templates.filter(t => isBeginnerFriendly(t) && !t.isPremium);
    return beginner.slice(0, FREE_TEMPLATE_LIMIT);
  }, [templates]);

  const filtered = features.fullTemplates ? allFiltered : freeTemplates;

  const handleUseTemplate = (t: Template) => navigate(`/systems/new?template=${t.id}`);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: templates.length };
    templates.forEach(t => {
      counts[t.category] = (counts[t.category] ?? 0) + 1;
      if (isBeginnerFriendly(t)) counts["beginner"] = (counts["beginner"] ?? 0) + 1;
    });
    return counts;
  }, [templates]);

  return (
    <div className="min-h-screen">
      {/* Hero header */}
      <div className="relative overflow-hidden gradient-brand text-white">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-72 h-72 opacity-10 bg-white rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="relative px-4 sm:px-6 py-6 sm:py-8 max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <LayoutGrid className="w-5 h-5 text-white/80" />
                <p className="text-white/70 text-xs sm:text-sm font-medium">Template Library</p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 leading-tight">Proven system blueprints</h1>
              <p className="text-white/80 text-xs sm:text-sm">Pick a template, personalise it, and start building your habit today.</p>
            </div>
          </div>

          {/* Stats */}
          {!isLoading && templates.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
              {[
                { label: "Templates",  value: templates.length,                            icon: LayoutGrid },
                { label: "Categories", value: ALL_CATEGORIES.length - 2,                   icon: Sparkles   },
                { label: "Free",       value: features.fullTemplates ? templates.filter(t => !t.isPremium).length : FREE_TEMPLATE_LIMIT, icon: Star },
              ].map(stat => (
                <div key={stat.label} className="bg-white/10 rounded-xl p-2.5 sm:p-3 backdrop-blur-sm border border-white/20">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <stat.icon className="w-3 h-3 text-white/70" />
                    <p className="text-white/70 text-[10px] sm:text-xs font-medium">{stat.label}</p>
                  </div>
                  <p className="text-lg sm:text-2xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 max-w-5xl mx-auto space-y-5">
        {/* Tab switcher */}
        <div className="flex items-center gap-2 border border-border rounded-xl p-1 w-fit">
          {([["official", "✨ Curated"], ["community", "🌍 Community"]] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activeTab === tab ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              data-testid={`tab-templates-${tab}`}
            >{label}</button>
          ))}
        </div>

        {/* Community tab content */}
        {activeTab === "community" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Community Templates</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Habit systems shared by other Strivo users. Use one or share your own.</p>
              </div>
              {userId && (
                <Button size="sm" className="gap-1.5 flex-shrink-0" onClick={() => setShowPublishDialog(true)} data-testid="button-publish-template">
                  <Share2 className="w-3.5 h-3.5" />
                  Share Template
                </Button>
              )}
            </div>

            {communityLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
              </div>
            ) : communityTemplates.length === 0 ? (
              <div className="text-center py-16">
                <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No community templates yet</p>
                <p className="text-xs text-muted-foreground mt-1">Be the first to share a habit system with the community.</p>
                {userId && (
                  <Button size="sm" className="mt-4 gap-1.5" onClick={() => setShowPublishDialog(true)}>
                    <Share2 className="w-3.5 h-3.5" /> Share Your First Template
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {communityTemplates.map(ct => (
                  <Card key={ct.id} className="flex flex-col hover-elevate border">
                    <CardContent className="p-4 flex flex-col flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Globe className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm leading-snug">{ct.title}</h3>
                          <p className="text-[10px] text-muted-foreground">by {ct.authorName}</p>
                        </div>
                      </div>
                      {ct.description && <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2 flex-1">{ct.description}</p>}
                      {ct.minimumAction && (
                        <div className="flex items-start gap-2 bg-chart-3/5 border border-chart-3/15 rounded-lg px-2.5 py-2 mb-3">
                          <CheckSquare className="w-3 h-3 text-chart-3 flex-shrink-0 mt-0.5" />
                          <p className="text-xs">{ct.minimumAction}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 mt-auto">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <button
                            onClick={() => upvoteMutation.mutate(ct.id)}
                            disabled={upvoteMutation.isPending}
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          ><ThumbsUp className="w-3 h-3" /> {ct.upvotes}</button>
                          <span>·</span>
                          <span>{ct.usedCount} used</span>
                        </div>
                        <Button size="sm" variant="outline" className="gap-1 text-xs h-7 px-2.5" onClick={() => {
                          incrementCommunityTemplateUsed(ct.id).catch(() => {});
                          navigate(`/systems/new?communityTitle=${encodeURIComponent(ct.title)}&minimumAction=${encodeURIComponent(ct.minimumAction || "")}&identity=${encodeURIComponent(ct.identityStatement || "")}`);
                        }}>
                          Use <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Official tab content - only render when on official tab */}
        {activeTab === "official" && (<>

        {/* First-time user banner */}
        {isFirstTime && !isLoading && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20" data-testid="banner-first-time">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1">New to building systems?</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Templates are your shortcut. Each one is a battle-tested system. Pick one that fits your goal,
                hit <strong>Use</strong>, and you'll have a personalised system ready in minutes — no blank-page anxiety.
              </p>
              <div className="flex flex-wrap gap-2">
                {["👆 Pick a category", "🔍 Preview the blueprint", "⚡ Customise and save"].map(s => (
                  <span key={s} className="bg-muted/60 border border-border/40 px-2.5 py-1 rounded-md text-xs text-muted-foreground">{s}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Free plan notice */}
        {!features.fullTemplates && !isLoading && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5" data-testid="template-plan-notice">
            <div className="flex items-start gap-3">
              <Lock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">You have {FREE_TEMPLATE_LIMIT} starter templates</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upgrade to <span className="font-semibold text-primary">Starter</span> to unlock all {templates.length}+ templates
                </p>
              </div>
            </div>
            <Link href="/pricing">
              <Button size="sm" className="gap-1.5 flex-shrink-0 w-full sm:w-auto" data-testid="button-unlock-templates">
                <Sparkles className="w-3.5 h-3.5" />
                Unlock All Templates
              </Button>
            </Link>
          </div>
        )}

        {/* Search — only for full template access */}
        {features.fullTemplates && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-9"
              data-testid="input-template-search"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Category filters — scrollable on mobile */}
        {features.fullTemplates && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
            {ALL_CATEGORIES.map(cat => {
              const count = categoryCounts[cat.value] ?? 0;
              if (cat.value !== "all" && count === 0) return null;
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  data-testid={`filter-category-${cat.value}`}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    activeCategory === cat.value
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                  {cat.value !== "all" && count > 0 && (
                    <span className={cn(
                      "text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none",
                      activeCategory === cat.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* Result count */}
            {features.fullTemplates && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {filtered.length} template{filtered.length !== 1 ? "s" : ""}
                  {activeCategory !== "all" && ` in ${ALL_CATEGORIES.find(c => c.value === activeCategory)?.label}`}
                  {search && ` matching "${search}"`}
                </p>
                {(search || activeCategory !== "all") && (
                  <button
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                    onClick={() => { setSearch(""); setActiveCategory("all"); }}
                  >
                    <X className="w-3 h-3" />Clear
                  </button>
                )}
              </div>
            )}

            {/* Empty state */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <LayoutGrid className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2">No templates found</h3>
                <p className="text-muted-foreground text-sm mb-5 max-w-xs">Try a different search or category.</p>
                <Button variant="outline" onClick={() => { setSearch(""); setActiveCategory("all"); }}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filtered.map(t => {
                  const isPremiumLocked = !!t.isPremium && !features.premiumTemplates;
                  return (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      isPremiumLocked={isPremiumLocked}
                      onPreview={() => setSelectedTemplate(t)}
                      onUse={() => handleUseTemplate(t)}
                    />
                  );
                })}

                {/* Locked premium teasers for non-premium users */}
                {!features.premiumTemplates && features.fullTemplates && activeCategory === "all" && !search && (
                  <Card className="flex flex-col border-dashed border-primary/30 bg-primary/3 opacity-80">
                    <CardContent className="p-4 sm:p-5 flex flex-col flex-1 items-center justify-center text-center py-8">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-sm font-semibold mb-1">Pro Templates</p>
                      <p className="text-xs text-muted-foreground mb-3">Unlock 4 advanced templates for deeper habits.</p>
                      <Link href="/pricing">
                        <Button size="sm" variant="outline" className="gap-1.5 text-primary border-primary/30">
                          <Lock className="w-3 h-3" />
                          Upgrade to Pro
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
        </>)}

      </div>

      {/* Publish Community Template Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Share2 className="w-4 h-4 text-primary" /> Share a Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="e.g. Morning Cold Shower Habit" value={publishForm.title} onChange={e => setPublishForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                value={publishForm.category}
                onChange={e => setPublishForm(f => ({ ...f, category: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {ALL_CATEGORIES.filter(c => c.value !== "all" && c.value !== "beginner").map(c => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="What does this habit system help with?" value={publishForm.description} onChange={e => setPublishForm(f => ({ ...f, description: e.target.value }))} rows={2} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label>Minimum Action</Label>
              <Input placeholder="e.g. Do 2 push-ups" value={publishForm.minimumAction} onChange={e => setPublishForm(f => ({ ...f, minimumAction: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Identity Statement</Label>
              <Input placeholder="e.g. I am someone who..." value={publishForm.identityStatement} onChange={e => setPublishForm(f => ({ ...f, identityStatement: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowPublishDialog(false)}>Cancel</Button>
              <Button
                onClick={() => publishMutation.mutate()}
                disabled={!publishForm.title.trim() || publishMutation.isPending}
              >
                {publishMutation.isPending ? "Publishing…" : "Publish Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Detail Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={open => !open && setSelectedTemplate(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap pr-6">
              <span className="text-lg">{selectedTemplate && categoryEmoji(selectedTemplate.category)}</span>
              <span className="flex-1">{selectedTemplate?.title}</span>
            </DialogTitle>
            {selectedTemplate && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <Badge variant="outline" className={cn("text-xs", categoryColor(selectedTemplate.category))}>
                  {categoryLabel(selectedTemplate.category)}
                </Badge>
                {isBeginnerFriendly(selectedTemplate) && (
                  <Badge variant="outline" className="text-[10px] gap-1 text-chart-4 border-chart-4/30 bg-chart-4/5">
                    <Star className="w-2.5 h-2.5" />
                    Best for beginners
                  </Badge>
                )}
                {selectedTemplate.isPremium && (
                  <Badge variant="outline" className="text-[10px] gap-1 text-primary border-primary/30 bg-primary/5">
                    <Sparkles className="w-2.5 h-2.5" />
                    Pro Template
                  </Badge>
                )}
              </div>
            )}
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-3">
              {selectedTemplate.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedTemplate.description}</p>
              )}

              <div className="space-y-2">
                <DetailRow icon={Brain}      label="Identity Statement" value={selectedTemplate.identityStatement} color="text-primary" />
                <DetailRow icon={Zap}        label="Trigger"            value={selectedTemplate.triggerStatement}  color="text-chart-3" />
                <DetailRow icon={CheckSquare}label="Minimum Action"     value={selectedTemplate.minimumAction}     color="text-chart-4" />
                <DetailRow icon={Trophy}     label="Reward Plan"        value={selectedTemplate.rewardPlan}        color="text-chart-4" />
                <DetailRow icon={ShieldCheck}label="Fallback Plan"      value={selectedTemplate.fallbackPlan}      color="text-muted-foreground" />
              </div>

              <div className="pt-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 p-3 rounded-lg bg-muted/40 border border-border/40">
                  <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                  This template gives you a solid foundation — customise every field to match your life.
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="w-full sm:flex-1"
                    onClick={() => setSelectedTemplate(null)}
                  >
                    Close
                  </Button>
                  <Button
                    className="w-full sm:flex-1"
                    onClick={() => {
                      setSelectedTemplate(null);
                      handleUseTemplate(selectedTemplate);
                    }}
                    data-testid="button-use-template-dialog"
                  >
                    Use This Template
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
