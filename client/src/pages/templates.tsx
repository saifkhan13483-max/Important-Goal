import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getPublicTemplates } from "@/services/templates.service";
import { getSystems } from "@/services/systems.service";
import { useAppStore } from "@/store/auth.store";
import type { Template } from "@/types/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, LayoutGrid, Brain, Zap, CheckSquare, Trophy, ShieldCheck,
  BookOpen, Sparkles, ArrowRight, Star, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPlanFeatures } from "@/lib/plan-limits";
import { Link } from "wouter";

const FREE_TEMPLATE_LIMIT = 3;

const ALL_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "beginner", label: "⭐ Beginner" },
  { value: "fitness", label: "Fitness" },
  { value: "reading", label: "Reading" },
  { value: "meditation", label: "Meditation" },
  { value: "exam-prep", label: "Exam Prep" },
  { value: "content-creation", label: "Content" },
  { value: "relationship", label: "Relationship" },
  { value: "sleep", label: "Sleep" },
  { value: "deep-work", label: "Deep Work" },
  { value: "mindset", label: "Mindset" },
  { value: "evening-reset", label: "Evening Reset" },
  { value: "job-search", label: "Job Search" },
  { value: "study-sprint", label: "Study Sprint" },
];

const CATEGORY_COLORS: Record<string, string> = {
  fitness: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  reading: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  meditation: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  "exam-prep": "bg-amber-500/15 text-amber-500 border-amber-500/30",
  "content-creation": "bg-chart-4/15 text-chart-4 border-chart-4/30",
  relationship: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  sleep: "bg-indigo-500/15 text-indigo-500 border-indigo-500/30",
  "deep-work": "bg-primary/15 text-primary border-primary/30",
  mindset: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  career: "bg-primary/15 text-primary border-primary/30",
  business: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  health: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  "evening-reset": "bg-indigo-500/15 text-indigo-500 border-indigo-500/30",
  "job-search": "bg-amber-500/15 text-amber-500 border-amber-500/30",
  "study-sprint": "bg-chart-2/15 text-chart-2 border-chart-2/30",
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? "bg-muted text-muted-foreground border-border";
}

const BEGINNER_CATEGORIES = new Set(["fitness", "reading", "meditation", "sleep", "mindset", "evening-reset", "study-sprint"]);

function isBeginnerFriendly(template: Template): boolean {
  return BEGINNER_CATEGORIES.has(template.category);
}

function categoryLabel(cat: string) {
  return ALL_CATEGORIES.find(c => c.value === cat)?.label ?? cat;
}

type DetailRowProps = { icon: React.ElementType; label: string; value?: string | null; color?: string };
function DetailRow({ icon: Icon, label, value, color = "text-muted-foreground" }: DetailRowProps) {
  if (!value) return null;
  return (
    <div className="flex gap-3 p-3 rounded-md bg-muted/40 items-start">
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${color}`} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>
        <p className="text-xs leading-relaxed">{value}</p>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const features = getPlanFeatures(user?.plan);

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["public-templates"],
    queryFn: () => getPublicTemplates(),
  });

  const { data: systems = [] } = useQuery({
    queryKey: ["systems", userId],
    queryFn: () => getSystems(userId),
    enabled: !!userId,
  });

  const isFirstTime = systems.length === 0;

  const allFiltered = useMemo(() => {
    return templates.filter(t => {
      const matchesCategory = activeCategory === "all"
        || (activeCategory === "beginner" && isBeginnerFriendly(t))
        || t.category === activeCategory;
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || [t.title, t.description, t.category, t.identityStatement, t.minimumAction]
        .some(f => f?.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [templates, search, activeCategory]);

  const freeTemplates = useMemo(() => {
    const beginner = templates.filter(t => isBeginnerFriendly(t) && !t.isPremium);
    return beginner.slice(0, FREE_TEMPLATE_LIMIT);
  }, [templates]);

  const filtered = features.fullTemplates ? allFiltered : freeTemplates;

  const handleUseTemplate = (t: Template) => {
    navigate(`/systems/new?template=${t.id}`);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Template Library</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Start with a proven system blueprint and make it your own.
        </p>
      </div>

      {/* First-time user onboarding banner */}
      {isFirstTime && !isLoading && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">New to building systems?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Templates are your shortcut. Each one is a battle-tested system built by habit experts.
                  Pick one that fits your goal, hit <strong>Use Template</strong>, and you'll have a
                  personalised system ready in minutes — no blank-page anxiety.
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {["👆 Pick a category below", "🔍 Preview the full blueprint", "⚡ Customise and save"].map(s => (
                    <span key={s} className="bg-muted/60 px-2 py-1 rounded-md">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search + Filters — only available with full template access */}
      {features.fullTemplates && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-template-search"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                data-testid={`filter-category-${cat.value}`}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                  activeCategory === cat.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Free plan restriction notice */}
      {!features.fullTemplates && !isLoading && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5" data-testid="template-plan-notice">
          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">You have access to {FREE_TEMPLATE_LIMIT} starter templates</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upgrade to <span className="font-semibold text-primary">Starter</span> to unlock the full library of {templates.length}+ templates
              </p>
            </div>
          </div>
          <Link href="/pricing">
            <Button size="sm" className="flex-shrink-0 gap-1.5 text-xs" data-testid="button-unlock-templates">
              <Sparkles className="w-3 h-3" />
              Unlock All
            </Button>
          </Link>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Template count */}
          <p className="text-xs text-muted-foreground">
            {features.fullTemplates ? (
              <>
                {filtered.length} template{filtered.length !== 1 ? "s" : ""}
                {activeCategory !== "all" ? ` in ${ALL_CATEGORIES.find(c => c.value === activeCategory)?.label}` : ""}
                {search ? ` matching "${search}"` : ""}
                {!features.premiumTemplates && (
                  <span className="ml-1 text-primary font-medium">· 4 Pro templates locked</span>
                )}
              </>
            ) : (
              <>{FREE_TEMPLATE_LIMIT} starter templates available on your plan</>
            )}
          </p>

          {/* Empty state */}
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <LayoutGrid className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No templates found</h3>
                <p className="text-muted-foreground text-sm mb-4">Try a different search or category.</p>
                <Button variant="outline" onClick={() => { setSearch(""); setActiveCategory("all"); }}>
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(t => {
                const isPremiumLocked = !!t.isPremium && !features.premiumTemplates;
                return (
                <Card
                  key={t.id}
                  className={cn("flex flex-col", isPremiumLocked ? "opacity-70" : "hover-elevate")}
                  data-testid={`template-card-${t.id}`}
                >
                  <CardContent className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm leading-snug flex-1">{t.title}</h3>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isPremiumLocked && (
                          <Badge
                            variant="outline"
                            className="text-[10px] gap-1 text-primary border-primary/30 bg-primary/5"
                            data-testid={`badge-premium-${t.id}`}
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            Pro
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-xs ${categoryColor(t.category)}`}
                          data-testid={`badge-category-${t.id}`}
                        >
                          {categoryLabel(t.category)}
                        </Badge>
                      </div>
                    </div>
                    {isBeginnerFriendly(t) && (
                      <div className="flex items-center gap-1 mb-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 text-chart-4 border-chart-4/30 bg-chart-4/5"
                          data-testid={`badge-beginner-${t.id}`}
                        >
                          <Star className="w-2.5 h-2.5" />
                          Best for beginners
                        </Badge>
                      </div>
                    )}

                    {t.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2 flex-1">
                        {t.description}
                      </p>
                    )}

                    {t.identityStatement && (
                      <p className="text-xs italic text-muted-foreground border-l-2 border-primary/40 pl-2 mb-3 line-clamp-2">
                        "{t.identityStatement}"
                      </p>
                    )}

                    {t.minimumAction && (
                      <div className="flex items-start gap-2 bg-muted/40 rounded-md px-2.5 py-2 mb-4">
                        <CheckSquare className="w-3 h-3 text-chart-3 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground leading-relaxed line-clamp-2">{t.minimumAction}</p>
                      </div>
                    )}

                    <div className="flex gap-2 mt-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => !isPremiumLocked && setSelectedTemplate(t)}
                        disabled={isPremiumLocked}
                        data-testid={`button-view-template-${t.id}`}
                      >
                        Preview
                      </Button>
                      {isPremiumLocked ? (
                        <Link href="/pricing" className="flex-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full gap-1 text-primary border-primary/30 bg-primary/5 hover:bg-primary/10"
                            data-testid={`button-upgrade-template-${t.id}`}
                          >
                            <Lock className="w-3 h-3" />
                            Upgrade to Pro
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleUseTemplate(t)}
                          data-testid={`button-use-template-${t.id}`}
                        >
                          Use Template
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Template Detail Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={open => !open && setSelectedTemplate(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {selectedTemplate?.title}
              {selectedTemplate && (
                <Badge
                  variant="outline"
                  className={`text-xs ${categoryColor(selectedTemplate.category)}`}
                >
                  {categoryLabel(selectedTemplate.category)}
                </Badge>
              )}
              {selectedTemplate && isBeginnerFriendly(selectedTemplate) && (
                <Badge variant="outline" className="text-[10px] gap-1 text-chart-4 border-chart-4/30 bg-chart-4/5">
                  <Star className="w-2.5 h-2.5" />
                  Best for beginners
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-3">
              {selectedTemplate.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedTemplate.description}</p>
              )}

              <div className="space-y-2">
                <DetailRow icon={Brain} label="Identity Statement" value={selectedTemplate.identityStatement} color="text-primary" />
                <DetailRow icon={Zap} label="Trigger" value={selectedTemplate.triggerStatement} color="text-chart-3" />
                <DetailRow icon={CheckSquare} label="Minimum Action" value={selectedTemplate.minimumAction} color="text-chart-4" />
                <DetailRow icon={Trophy} label="Reward Plan" value={selectedTemplate.rewardPlan} color="text-chart-4" />
                <DetailRow icon={ShieldCheck} label="Fallback Plan" value={selectedTemplate.fallbackPlan} color="text-muted-foreground" />
              </div>

              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  This template gives you a solid foundation — customize every field to match your life.
                </p>
                <Button
                  className="w-full"
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
