import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/auth.store";
import { getPlanFeatures } from "@/lib/plan-limits";
import type { JournalEntry, Goal, System } from "@/types/schema";
import { getJournals, createJournal, updateJournal, deleteJournal } from "@/services/journal.service";
import { getGoals } from "@/services/goals.service";
import { getSystems } from "@/services/systems.service";
import { generateJournalPrompt } from "@/services/ai.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Trash2, Pencil, Loader2, X, PenLine,
  ChevronDown, ChevronUp, Lightbulb, Check, Sparkles, Bot, Lock,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PlanGate } from "@/components/plan-gate";

const PROMPT_TYPES = [
  { value: "daily",    label: "Daily Reflection",   emoji: "🌅", color: "text-primary",            advanced: false },
  { value: "weekly",   label: "Weekly Review",       emoji: "📆", color: "text-chart-2",            advanced: true  },
  { value: "win",      label: "Capture a Win",       emoji: "🏆", color: "text-chart-3",            advanced: true  },
  { value: "struggle", label: "Process a Struggle",  emoji: "🧩", color: "text-chart-4",            advanced: true  },
  { value: "insight",  label: "Record an Insight",   emoji: "💡", color: "text-primary",            advanced: true  },
  { value: "freeform", label: "Freeform Notes",      emoji: "📝", color: "text-muted-foreground",   advanced: false },
];

const PROMPTS: Record<string, { prompt: string; starters: string[] }> = {
  daily: {
    prompt: "What worked today? What was hard? What do you want to improve tomorrow?",
    starters: [
      "Today I showed up for my habit by…",
      "The hardest moment today was…",
      "One thing I want to try differently tomorrow…",
    ],
  },
  weekly: {
    prompt: "What were your biggest wins this week? What patterns did you notice? What will you do differently?",
    starters: [
      "My biggest win this week was…",
      "I noticed a pattern where I keep…",
      "Next week I want to focus on…",
    ],
  },
  win: {
    prompt: "Describe a recent win, big or small. How did it happen? What did you do well?",
    starters: [
      "I'm proud that I managed to…",
      "What made this possible was…",
      "This win showed me that I…",
    ],
  },
  struggle: {
    prompt: "What's been challenging lately? What have you tried? What might help?",
    starters: [
      "I've been struggling with…",
      "What I've tried so far is…",
      "What might actually help is…",
    ],
  },
  insight: {
    prompt: "What's something you've learned or realized recently about yourself or your systems?",
    starters: [
      "I recently realized that I…",
      "Something I've noticed about my habits is…",
      "This insight changed how I think about…",
    ],
  },
  freeform: {
    prompt: "What's on your mind right now? Let it out freely — no structure needed.",
    starters: [
      "Right now I'm thinking about…",
    ],
  },
};

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function getPromptInfo(type: string) {
  return PROMPT_TYPES.find(p => p.value === type) || PROMPT_TYPES[0];
}

function InlineJournalForm({
  entry,
  userId,
  goals,
  systemNames = [],
  onClose,
  onSaved,
}: {
  entry?: JournalEntry;
  userId: string;
  goals: Goal[];
  systemNames?: string[];
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { user: currentUser } = useAppStore();
  const features = getPlanFeatures(currentUser?.plan);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [promptType, setPromptType] = useState(entry?.promptType || "daily");
  const [content, setContent] = useState(entry?.content || "");
  const [goalId, setGoalId] = useState(entry?.goalId || "");
  const [showOptions, setShowOptions] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAiPrompt = async () => {
    if (aiGenerating) return;
    setAiGenerating(true);
    try {
      const prompt = await generateJournalPrompt({ promptType, systemNames });
      setAiPrompt(prompt);
    } catch (err: any) {
      toast({ title: "Couldn't generate AI prompt", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const promptInfo = getPromptInfo(promptType);
  const promptData = PROMPTS[promptType] || PROMPTS.daily;

  useEffect(() => {
    if (!entry) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [entry]);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      entry
        ? updateJournal(entry.id, data)
        : createJournal(userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journals", userId] });
      toast({ title: entry ? "Entry updated!" : "Entry saved! ✨" });
      onClose();
      onSaved?.();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const useStarter = (starter: string) => {
    if (!content) {
      setContent(starter + " ");
    } else {
      setContent(prev => prev + "\n\n" + starter + " ");
    }
    setTimeout(() => {
      textareaRef.current?.focus();
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
      }
    }, 50);
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Entry type selector */}
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Entry type:</span>
          <div className="flex flex-wrap gap-2">
            {PROMPT_TYPES.map(p => {
              const locked = p.advanced && !features.advancedJournaling;
              if (locked) {
                return (
                  <Link key={p.value} href="/pricing">
                    <button
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-border/40 bg-muted/30 text-muted-foreground/50 cursor-pointer opacity-60 hover:opacity-80 transition-all"
                      data-testid={`tab-prompt-${p.value}-locked`}
                    >
                      <span>{p.emoji}</span>
                      {p.label}
                      <Lock className="w-2.5 h-2.5" />
                    </button>
                  </Link>
                );
              }
              return (
                <button
                  key={p.value}
                  onClick={() => setPromptType(p.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                    promptType === p.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                  data-testid={`tab-prompt-${p.value}`}
                >
                  <span>{p.emoji}</span>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Prompt display */}
        <div className="rounded-xl bg-primary/5 border border-primary/15 overflow-hidden">
          <div className="flex items-start gap-3 p-3">
            <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground leading-relaxed italic flex-1">
              {aiPrompt || promptData.prompt}
            </p>
          </div>
          {!entry && features.aiJournalPrompt && (
            <div className="border-t border-primary/10 px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {aiPrompt ? "AI-generated for your habits" : "Static prompt"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1.5 text-primary hover:bg-primary/10"
                onClick={handleAiPrompt}
                disabled={aiGenerating}
                data-testid="button-ai-journal-prompt"
              >
                {aiGenerating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Bot className="w-3 h-3" />
                )}
                {aiPrompt ? "Regenerate" : "Personalize with AI"}
              </Button>
            </div>
          )}
          {!entry && !features.aiJournalPrompt && (
            <div className="border-t border-primary/10 px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Static prompt</span>
              <Link href="/pricing">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1.5 text-muted-foreground hover:text-primary"
                  data-testid="button-ai-journal-prompt-locked"
                >
                  <Bot className="w-3 h-3" />
                  Personalize with AI
                  <Lock className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Sentence starters */}
        {promptData.starters.length > 0 && !entry && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Jump-start ideas:</p>
            <div className="flex flex-wrap gap-2">
              {promptData.starters.map((starter) => (
                <button
                  key={starter}
                  onClick={() => useStarter(starter)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-primary/8 hover:border-primary/30 hover:text-primary transition-all text-left"
                >
                  {starter.length > 40 ? starter.slice(0, 40) + "…" : starter}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main textarea */}
        <div className="relative">
          <label htmlFor="journal-content" className="sr-only">Journal entry content</label>
          <Textarea
            id="journal-content"
            ref={textareaRef}
            placeholder="Start writing... there are no wrong answers."
            aria-label="Journal entry content"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={7}
            className="resize-none text-base leading-relaxed focus:ring-1 focus:ring-primary/30 border-border/60"
            data-testid="input-journal-content"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-none">
            <span className={cn("text-xs tabular-nums", wordCount > 0 ? "text-muted-foreground" : "text-border")}>
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
          </div>
        </div>

        {/* Extra options — collapsible */}
        <div>
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showOptions ? "Hide options" : "Link to a goal (optional)"}
          </button>
          {showOptions && (
            <div className="mt-3">
              <Select value={goalId} onValueChange={setGoalId}>
                <SelectTrigger className="text-sm" data-testid="select-journal-goal">
                  <SelectValue placeholder="No goal linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No goal linked</SelectItem>
                  {goals.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground"
            data-testid="button-cancel-journal"
          >
            <X className="w-3.5 h-3.5 mr-1.5" />
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate({
              promptType,
              content,
              goalId: goalId || undefined,
              dateKey: entry?.dateKey || getTodayKey(),
            })}
            disabled={mutation.isPending || content.length < 10}
            data-testid="button-save-journal"
            className="gap-2"
          >
            {mutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Check className="w-3.5 h-3.5" />}
            {entry ? "Save Changes" : "Save Entry"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function JournalEntryCard({
  entry,
  goals,
  onEdit,
  onDelete,
}: {
  entry: JournalEntry;
  goals: Goal[];
  onEdit: (e: JournalEntry) => void;
  onDelete: (e: JournalEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const promptInfo = getPromptInfo(entry.promptType ?? "free");
  const goalTitle = goals.find(g => g.id === entry.goalId)?.title;
  const wordCount = entry.content.trim().split(/\s+/).filter(Boolean).length;
  const isLong = entry.content.length > 300;

  return (
    <Card
      className="hover-elevate border-border/60 transition-all"
      data-testid={`journal-entry-${entry.id}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg leading-none">{promptInfo.emoji}</span>
            <Badge variant="secondary" className={cn("text-xs font-medium", promptInfo.color)}>
              {promptInfo.label}
            </Badge>
            {goalTitle && (
              <Badge variant="outline" className="text-xs">
                🎯 {goalTitle}
              </Badge>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="w-7 h-7 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(entry)}
              data-testid={`button-edit-entry-${entry.id}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="w-7 h-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(entry)}
              data-testid={`button-delete-entry-${entry.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <p className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap text-foreground",
            !expanded && isLong && "line-clamp-4",
          )}>
            {entry.content}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline transition-all"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/40">
          <span className="text-xs text-muted-foreground">{wordCount} words</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Journal() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const features = getPlanFeatures(user?.plan);

  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["journals", userId],
    queryFn: () => getJournals(userId),
    enabled: !!userId,
  });

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["goals", userId],
    queryFn: () => getGoals(userId),
    enabled: !!userId,
  });

  const qc = useQueryClient();
  const { toast } = useToast();

  const [showNewForm, setShowNewForm] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | undefined>();
  const [deleteEntry, setDeleteEntry] = useState<JournalEntry | undefined>();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJournal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journals", userId] });
      toast({ title: "Entry deleted" });
      setDeleteEntry(undefined);
    },
  });

  const grouped: Record<string, JournalEntry[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.dateKey]) grouped[entry.dateKey] = [];
    grouped[entry.dateKey].push(entry);
  }
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const today = getTodayKey();
  const todayEntries = grouped[today] || [];

  return (
    <div className="p-5 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Reflections
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {entries.length === 0
              ? "Reflection is the hidden ingredient of lasting change."
              : `${entries.length} entr${entries.length === 1 ? "y" : "ies"} · ${sortedDates.length} day${sortedDates.length !== 1 ? "s" : ""} journaled`}
          </p>
        </div>
        {!showNewForm && !editEntry && (
          <Button
            onClick={() => setShowNewForm(true)}
            className="gap-2"
            data-testid="button-new-entry"
          >
            <PenLine className="w-4 h-4" />
            Write Entry
          </Button>
        )}
      </div>

      {/* Advanced journaling gate for free users */}
      {!features.advancedJournaling && (
        <PlanGate
          requiredPlan="starter"
          featureLabel="Advanced Journal Entry Types"
          description="Unlock Weekly Review, Capture a Win, Process a Struggle, and Record an Insight — four structured entry types designed to deepen your self-awareness."
          compact
        />
      )}

      {/* Identity motivational card */}
      {user?.identityStatement && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/8 border border-primary/20" data-testid="identity-journal-card">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-0.5">
              You are a person who {user.identityStatement}.
            </p>
            <p className="text-xs text-muted-foreground">
              Use your journal to build evidence for this identity — one reflection at a time.
            </p>
          </div>
        </div>
      )}

      {/* What reflection is for — shown only when no entries */}
      {entries.length === 0 && !showNewForm && (
        <div className="grid sm:grid-cols-3 gap-3 mb-2">
          {[
            { emoji: "🧠", label: "Spot patterns", desc: "Notice what's working and what keeps tripping you up." },
            { emoji: "🎯", label: "Reinforce wins", desc: "Writing about a success makes it stick better in memory." },
            { emoji: "🌱", label: "Process struggles", desc: "Turning challenges into words helps you learn from them." },
          ].map(item => (
            <div key={item.label} className="p-4 rounded-xl border border-border bg-card text-center">
              <div className="text-2xl mb-2">{item.emoji}</div>
              <p className="text-sm font-semibold mb-1">{item.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* New entry inline form */}
      {(showNewForm && !editEntry) && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1.5">
            <PenLine className="w-3 h-3" />
            Today's entry — {format(new Date(today + "T00:00:00"), "EEEE, MMMM d")}
          </p>
          <InlineJournalForm
            userId={userId}
            goals={goals}
            onClose={() => setShowNewForm(false)}
          />
        </div>
      )}

      {/* Edit form inline */}
      {editEntry && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1.5">
            <Pencil className="w-3 h-3" />
            Editing entry from {format(new Date(editEntry.dateKey + "T00:00:00"), "MMMM d, yyyy")}
          </p>
          <InlineJournalForm
            entry={editEntry}
            userId={userId}
            goals={goals}
            onClose={() => setEditEntry(undefined)}
          />
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && entries.length === 0 && !showNewForm && (
        <Card className="border-primary/20 bg-primary/3">
          <CardContent className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Start your journal</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              Spend just 5 minutes reflecting. What worked today? What felt hard? Consistent reflection is one of the most underrated habits you can build.
            </p>
            <Button onClick={() => setShowNewForm(true)} data-testid="button-first-entry" className="gap-2">
              <PenLine className="w-4 h-4" />
              Write my first entry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Entries grouped by date */}
      {!isLoading && entries.length > 0 && (
        <div className="space-y-8">
          {sortedDates.map(dateKey => {
            const isToday = dateKey === today;
            return (
              <div key={dateKey}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    {isToday && (
                      <div className="w-2 h-2 rounded-full bg-chart-3 flex-shrink-0" />
                    )}
                    <p className={cn(
                      "text-sm font-semibold",
                      isToday ? "text-chart-3" : "text-muted-foreground",
                    )}>
                      {isToday ? "Today — " : ""}{format(new Date(dateKey + "T00:00:00"), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {grouped[dateKey].length} entr{grouped[dateKey].length !== 1 ? "ies" : "y"}
                  </span>
                </div>
                <div className="space-y-3">
                  {grouped[dateKey].map(entry => {
                    if (editEntry?.id === entry.id) return null;
                    return (
                      <JournalEntryCard
                        key={entry.id}
                        entry={entry}
                        goals={goals}
                        onEdit={(e) => { setEditEntry(e); setShowNewForm(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        onDelete={setDeleteEntry}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteEntry} onOpenChange={() => setDeleteEntry(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This journal entry will be permanently deleted. Reflection takes courage — are you sure you want to remove this one?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteEntry && deleteMutation.mutate(deleteEntry.id)}
              data-testid="button-confirm-delete-entry"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
