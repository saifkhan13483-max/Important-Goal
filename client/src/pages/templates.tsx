import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { getTemplates } from "@/services/templates.service";
import type { Template } from "@/types/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, LayoutGrid, Brain, Target, Zap, CheckSquare, Trophy, ShieldCheck, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const ALL_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "fitness", label: "Fitness" },
  { value: "study", label: "Study" },
  { value: "career", label: "Career" },
  { value: "business", label: "Business" },
  { value: "mindset", label: "Mindset" },
  { value: "health", label: "Health" },
  { value: "relationship", label: "Relationship" },
  { value: "sleep", label: "Sleep" },
];

const CATEGORY_COLORS: Record<string, string> = {
  fitness: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  study: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  career: "bg-primary/15 text-primary border-primary/30",
  business: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  mindset: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  health: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  relationship: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  sleep: "bg-indigo-500/15 text-indigo-500 border-indigo-500/30",
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? "bg-muted text-muted-foreground border-border";
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
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const templates = useMemo(() => getTemplates(), []);

  const filtered = useMemo(() => {
    return templates.filter(t => {
      const matchesCategory = activeCategory === "all" || t.category === activeCategory;
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || [t.title, t.description, t.category, t.identityStatement, t.minimumAction]
        .some(f => f?.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [templates, search, activeCategory]);

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

      {/* Search + Filters */}
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

      {/* Template count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} template{filtered.length !== 1 ? "s" : ""}
        {activeCategory !== "all" ? ` in ${ALL_CATEGORIES.find(c => c.value === activeCategory)?.label}` : ""}
        {search ? ` matching "${search}"` : ""}
      </p>

      {/* Grid */}
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
          {filtered.map(t => (
            <Card
              key={t.id}
              className="hover-elevate flex flex-col"
              data-testid={`template-card-${t.id}`}
            >
              <CardContent className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-sm leading-snug flex-1">{t.title}</h3>
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize flex-shrink-0 ${categoryColor(t.category)}`}
                    data-testid={`badge-category-${t.id}`}
                  >
                    {t.category}
                  </Badge>
                </div>

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
                    onClick={() => setSelectedTemplate(t)}
                    data-testid={`button-view-template-${t.id}`}
                  >
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleUseTemplate(t)}
                    data-testid={`button-use-template-${t.id}`}
                  >
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
                  className={`text-xs capitalize ${categoryColor(selectedTemplate.category)}`}
                >
                  {selectedTemplate.category}
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
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
