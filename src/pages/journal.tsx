import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/auth.store";
import { getPlanFeatures } from "@/lib/plan-limits";
import type { JournalEntry, Goal } from "@/types/schema";
import { getJournals, createJournal, updateJournal, deleteJournal } from "@/services/journal.service";
import { getGoals } from "@/services/goals.service";
import { getSystems } from "@/services/systems.service";
import { generateJournalPrompt } from "@/services/ai.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Trash2, Pencil, Loader2, X, PenLine,
  ChevronDown, ChevronUp, Lightbulb, Check, Sparkles, Bot, Lock,
  Search, Flame, Hash, Calendar, FileText, Heart, Maximize2,
  Minimize2, Tag, SortAsc, SortDesc, Download, Filter,
  ArrowLeft, Star, Clock, TrendingUp, BarChart2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Link } from "wouter";
import { format, getDaysInMonth, startOfMonth, getDay, subMonths, addMonths, isSameMonth } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PlanGate } from "@/components/plan-gate";

// ─────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────
const PROMPT_TYPES = [
  { value: "daily",    label: "Daily Reflection",  emoji: "🌅", color: "text-primary",          bgAccent: "bg-primary",          advanced: false },
  { value: "weekly",   label: "Weekly Review",      emoji: "📆", color: "text-chart-2",          bgAccent: "bg-chart-2",          advanced: true  },
  { value: "win",      label: "Capture a Win",      emoji: "🏆", color: "text-chart-3",          bgAccent: "bg-chart-3",          advanced: true  },
  { value: "struggle", label: "Process a Struggle", emoji: "🧩", color: "text-chart-4",          bgAccent: "bg-chart-4",          advanced: true  },
  { value: "insight",  label: "Record an Insight",  emoji: "💡", color: "text-primary",          bgAccent: "bg-primary",          advanced: true  },
  { value: "freeform", label: "Freeform Notes",     emoji: "📝", color: "text-muted-foreground", bgAccent: "bg-muted-foreground", advanced: false },
];

const PROMPTS: Record<string, { prompt: string; starters: string[] }> = {
  daily: {
    prompt: "What worked today? What was hard? What do you want to improve tomorrow?",
    starters: ["Today I showed up for my habit by…", "The hardest moment today was…", "One thing I want to try differently tomorrow…"],
  },
  weekly: {
    prompt: "What were your biggest wins this week? What patterns did you notice? What will you do differently?",
    starters: ["My biggest win this week was…", "I noticed a pattern where I keep…", "Next week I want to focus on…"],
  },
  win: {
    prompt: "Describe a recent win, big or small. How did it happen? What did you do well?",
    starters: ["I'm proud that I managed to…", "What made this possible was…", "This win showed me that I…"],
  },
  struggle: {
    prompt: "What's been challenging lately? What have you tried? What might help?",
    starters: ["I've been struggling with…", "What I've tried so far is…", "What might actually help is…"],
  },
  insight: {
    prompt: "What's something you've learned or realized recently about yourself or your systems?",
    starters: ["I recently realized that I…", "Something I've noticed about my habits is…", "This insight changed how I think about…"],
  },
  freeform: {
    prompt: "What's on your mind right now? Let it out freely — no structure needed.",
    starters: ["Right now I'm thinking about…"],
  },
};

const MOOD_OPTIONS = [
  { value: 1, emoji: "😔", label: "Rough" },
  { value: 2, emoji: "😕", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
];

const PRESET_TAGS = ["breakthrough", "proud", "difficult", "learning", "pattern", "gratitude", "energy", "focus"];

const DAILY_QUOTES = [
  { text: "Reflection is the lamp of the heart.", author: "Ibn Ata Allah" },
  { text: "We do not learn from experience. We learn from reflecting on experience.", author: "John Dewey" },
  { text: "In the journal I do not just express myself more openly than I could to any person; I create myself.", author: "Susan Sontag" },
  { text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
  { text: "Your journal is your map of the territory you're exploring.", author: "Unknown" },
  { text: "Writing is thinking on paper.", author: "William Zinsser" },
  { text: "The act of writing is the act of discovering what you believe.", author: "David Hare" },
];

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────
function getTodayKey() { return new Date().toISOString().split("T")[0]; }
function getPromptInfo(type: string) { return PROMPT_TYPES.find(p => p.value === type) || PROMPT_TYPES[0]; }
function computeWordCount(text: string) { return text.trim().split(/\s+/).filter(Boolean).length; }
function readingTime(text: string): string {
  const words = computeWordCount(text);
  const mins = Math.ceil(words / 200);
  return mins <= 1 ? "< 1 min read" : `${mins} min read`;
}
function getDailyQuote(): { text: string; author: string } {
  const day = new Date().getDate();
  return DAILY_QUOTES[day % DAILY_QUOTES.length];
}
function computeStreak(dateKeys: string[]): number {
  if (!dateKeys.length) return 0;
  const sorted = [...new Set(dateKeys)].sort((a, b) => b.localeCompare(a));
  const today = getTodayKey();
  let streak = 0;
  let cursor = today;
  for (const key of sorted) {
    if (key === cursor) {
      streak++;
      const d = new Date(cursor + "T00:00:00");
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().split("T")[0];
    } else if (key < cursor) break;
  }
  return streak;
}
function exportEntries(entries: JournalEntry[], goals: Goal[]) {
  const lines = entries.map(e => {
    const pt = getPromptInfo(e.promptType ?? "freeform");
    const goalTitle = goals.find(g => g.id === e.goalId)?.title;
    const mood = e.mood ? MOOD_OPTIONS.find(m => m.value === e.mood) : null;
    return [
      `=== ${format(new Date(e.dateKey + "T00:00:00"), "EEEE, MMMM d, yyyy")} — ${pt.emoji} ${pt.label} ===`,
      mood ? `Mood: ${mood.emoji} ${mood.label}` : "",
      goalTitle ? `Goal: ${goalTitle}` : "",
      e.tags?.length ? `Tags: ${e.tags.join(", ")}` : "",
      "",
      e.content,
      "",
    ].filter(l => l !== undefined).join("\n");
  });
  const blob = new Blob([lines.join("\n---\n\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `strivo-reflections-${getTodayKey()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────
// Month Heatmap
// ─────────────────────────────────────────────────────
function MonthHeatmap({ entryDates, viewDate, onPrev, onNext }: {
  entryDates: Set<string>;
  viewDate: Date;
  onPrev: () => void;
  onNext: () => void;
}) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(viewDate);
  const firstDayOfWeek = getDay(startOfMonth(viewDate));
  const today = getTodayKey();
  const isCurrentMonth = isSameMonth(viewDate, new Date());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {format(viewDate, "MMMM yyyy")}
        </p>
        <div className="flex items-center gap-1">
          <button onClick={onPrev} className="p-1 rounded-md hover:bg-muted transition-colors" aria-label="Previous month">
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={onNext}
            disabled={isCurrentMonth}
            className="p-1 rounded-md hover:bg-muted transition-colors disabled:opacity-30"
            aria-label="Next month"
          >
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`blank-${i}`} />;
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasEntry = entryDates.has(key);
          const isToday = key === today;
          const isFuture = key > today;
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "aspect-square rounded-md flex items-center justify-center text-[11px] font-medium transition-all cursor-default",
                    isFuture ? "text-muted-foreground/30 bg-muted/20"
                      : hasEntry ? "bg-primary text-primary-foreground shadow-sm"
                        : isToday ? "ring-2 ring-primary/50 text-foreground bg-primary/10"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  {day}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {format(new Date(key + "T00:00:00"), "MMM d")}
                {hasEntry ? " · has entry" : isToday ? " · today" : ""}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Mood Picker
// ─────────────────────────────────────────────────────
function MoodPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-muted-foreground font-medium mr-1">Mood:</span>
      {MOOD_OPTIONS.map(m => (
        <Tooltip key={m.value}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onChange(value === m.value ? null : m.value)}
              className={cn(
                "text-lg transition-all rounded-lg p-1 leading-none",
                value === m.value
                  ? "ring-2 ring-primary bg-primary/10 scale-110"
                  : "hover:scale-110 hover:bg-muted opacity-60 hover:opacity-100",
              )}
              aria-label={m.label}
              data-testid={`mood-option-${m.value}`}
            >
              {m.emoji}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">{m.label}</TooltipContent>
        </Tooltip>
      ))}
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
        >
          clear
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Tag Input
// ─────────────────────────────────────────────────────
function TagInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState("");
  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !value.includes(t) && value.length < 5) {
      onChange([...value, t]);
    }
    setInput("");
  };
  const removeTag = (tag: string) => onChange(value.filter(t => t !== tag));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_TAGS.filter(t => !value.includes(t)).map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => addTag(tag)}
            className="text-xs px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
          >
            + {tag}
          </button>
        ))}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1 text-xs pr-1">
              <Tag className="w-2.5 h-2.5" />
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          placeholder="Add custom tag…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(input); } }}
          className="h-7 text-xs flex-1"
          maxLength={20}
        />
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => addTag(input)} disabled={!input.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Journal Form (shared by inline + fullscreen)
// ─────────────────────────────────────────────────────
interface JournalFormProps {
  entry?: JournalEntry;
  userId: string;
  goals: Goal[];
  systemNames?: string[];
  onClose: () => void;
  onSaved?: () => void;
  fullscreen?: boolean;
}

function JournalForm({ entry, userId, goals, systemNames = [], onClose, onSaved, fullscreen }: JournalFormProps) {
  const { user: currentUser } = useAppStore();
  const features = getPlanFeatures(currentUser?.plan);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [promptType, setPromptType] = useState(entry?.promptType || "daily");
  const [content, setContent] = useState(entry?.content || "");
  const [goalId, setGoalId] = useState(entry?.goalId || "none");
  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [tags, setTags] = useState<string[]>(entry?.tags ?? []);
  const [showOptions, setShowOptions] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftKey = `strivo_journal_draft_${userId}`;

  useEffect(() => {
    if (!entry) {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          if (draft.content) setContent(draft.content);
          if (draft.promptType) setPromptType(draft.promptType);
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    if (!entry && content) {
      localStorage.setItem(draftKey, JSON.stringify({ content, promptType }));
    }
  }, [content, promptType, entry]);

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

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

  const promptData = PROMPTS[promptType] || PROMPTS.daily;
  const wordCount = computeWordCount(content);

  const useStarter = (starter: string) => {
    setContent(prev => prev ? prev + "\n\n" + starter + " " : starter + " ");
    setTimeout(() => {
      textareaRef.current?.focus();
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
      }
    }, 50);
  };

  const mutation = useMutation({
    mutationFn: (data: any) => entry ? updateJournal(entry.id, data) : createJournal(userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal", userId] });
      localStorage.removeItem(draftKey);
      toast({ title: entry ? "Entry updated! ✨" : "Entry saved! ✨" });
      onClose();
      onSaved?.();
    },
    onError: (err: any) => toast({ title: "Error saving", description: err.message, variant: "destructive" }),
  });

  const handleSave = () => {
    mutation.mutate({
      promptType,
      content,
      goalId: goalId && goalId !== "none" ? goalId : undefined,
      mood: mood || undefined,
      tags: tags.length ? tags : undefined,
      dateKey: entry?.dateKey || getTodayKey(),
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSave();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [content, promptType, goalId, mood, tags]);

  return (
    <div className={cn("flex flex-col", fullscreen ? "h-full" : "rounded-2xl border border-border bg-card overflow-hidden shadow-sm")}>
      {/* Type selector */}
      <div className={cn("border-b border-border bg-muted/30 px-4 py-3", fullscreen && "flex-shrink-0")}>
        <div className="flex items-start gap-3 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-1 flex-shrink-0">Type:</span>
          <div className="flex flex-wrap gap-2">
            {PROMPT_TYPES.map(p => {
              const locked = p.advanced && !features.advancedJournaling;
              if (locked) {
                return (
                  <Link key={p.value} href="/pricing">
                    <button
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-border/40 bg-muted/30 text-muted-foreground/50 opacity-60 hover:opacity-80 transition-all"
                      data-testid={`tab-prompt-${p.value}-locked`}
                    >
                      <span>{p.emoji}</span>
                      <span className="hidden sm:inline">{p.label}</span>
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
                  <span className="hidden sm:inline">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={cn("p-4 sm:p-5 space-y-4", fullscreen && "flex-1 overflow-y-auto")}>
        {/* Prompt */}
        <div className="rounded-xl bg-primary/5 border border-primary/15 overflow-hidden">
          <div className="flex items-start gap-3 p-3">
            <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground leading-relaxed italic flex-1">
              {aiPrompt || promptData.prompt}
            </p>
          </div>
          <div className="border-t border-primary/10 px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {aiPrompt ? "AI-generated for your habits" : "Static prompt"}
            </span>
            {!entry && features.aiJournalPrompt ? (
              <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1.5 text-primary hover:bg-primary/10" onClick={handleAiPrompt} disabled={aiGenerating} data-testid="button-ai-journal-prompt">
                {aiGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                {aiPrompt ? "Regenerate" : "Personalize with AI"}
              </Button>
            ) : !entry ? (
              <Link href="/pricing">
                <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1.5 text-muted-foreground hover:text-primary" data-testid="button-ai-journal-prompt-locked">
                  <Bot className="w-3 h-3" />
                  <span>Personalize with AI</span>
                  <Lock className="w-3 h-3" />
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        {/* Starters */}
        {promptData.starters.length > 0 && !entry && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Jump-start ideas:</p>
            <div className="flex flex-wrap gap-2">
              {promptData.starters.map(starter => (
                <button
                  key={starter}
                  onClick={() => useStarter(starter)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-primary/8 hover:border-primary/30 hover:text-primary transition-all text-left"
                >
                  {starter.length > 42 ? starter.slice(0, 42) + "…" : starter}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Textarea */}
        <div className="relative">
          <label htmlFor="journal-content" className="sr-only">Journal entry content</label>
          <Textarea
            id="journal-content"
            ref={textareaRef}
            placeholder="Start writing… there are no wrong answers."
            aria-label="Journal entry content"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={fullscreen ? 14 : 8}
            className="resize-none text-base leading-relaxed focus:ring-1 focus:ring-primary/30 border-border/60 pb-8"
            data-testid="input-journal-content"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-none">
            <span className={cn("text-xs tabular-nums", wordCount > 0 ? "text-muted-foreground" : "text-border")}>
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
          </div>
        </div>

        {/* Mood */}
        <MoodPicker value={mood} onChange={setMood} />

        {/* Tags toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowTags(!showTags)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showTags ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <Tag className="w-3 h-3" />
            {showTags ? "Hide tags" : `Tags ${tags.length > 0 ? `(${tags.length})` : "(optional)"}`}
          </button>
          {showTags && <div className="mt-3"><TagInput value={tags} onChange={setTags} /></div>}
        </div>

        {/* Goal link */}
        <div>
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showOptions ? "Hide goal link" : "Link to a goal (optional)"}
          </button>
          {showOptions && (
            <div className="mt-3">
              <Select value={goalId} onValueChange={setGoalId}>
                <SelectTrigger className="text-sm" data-testid="select-journal-goal">
                  <SelectValue placeholder="No goal linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No goal linked</SelectItem>
                  {goals.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Draft notice */}
        {!entry && (
          <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
            <Check className="w-2.5 h-2.5" />
            Draft auto-saved · Ctrl+Enter to save quickly
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/40">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground" data-testid="button-cancel-journal">
            <X className="w-3.5 h-3.5 mr-1.5" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending || content.length < 10} data-testid="button-save-journal" className="gap-2">
            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {entry ? "Save Changes" : "Save Entry"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Entry Card
// ─────────────────────────────────────────────────────
function JournalEntryCard({
  entry, goals, onEdit, onDelete, onToggleFavorite,
}: {
  entry: JournalEntry;
  goals: Goal[];
  onEdit: (e: JournalEntry) => void;
  onDelete: (e: JournalEntry) => void;
  onToggleFavorite: (e: JournalEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const promptInfo = getPromptInfo(entry.promptType ?? "freeform");
  const goalTitle = goals.find(g => g.id === entry.goalId)?.title;
  const wordCount = computeWordCount(entry.content);
  const isLong = entry.content.length > 300;
  const mood = entry.mood ? MOOD_OPTIONS.find(m => m.value === entry.mood) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden border-border/60 hover:shadow-md transition-all duration-200" data-testid={`journal-entry-${entry.id}`}>
        <div className={cn("h-1 w-full", promptInfo.bgAccent)} />
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-lg leading-none flex-shrink-0">{promptInfo.emoji}</span>
              <Badge variant="secondary" className={cn("text-xs font-medium flex-shrink-0", promptInfo.color)}>
                {promptInfo.label}
              </Badge>
              {mood && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-base leading-none cursor-default">{mood.emoji}</span>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">Mood: {mood.label}</TooltipContent>
                </Tooltip>
              )}
              {goalTitle && (
                <Badge variant="outline" className="text-xs truncate max-w-[100px] sm:max-w-[160px]">
                  🎯 {goalTitle}
                </Badge>
              )}
              {entry.isFavorite && (
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => onToggleFavorite(entry)} data-testid={`button-favorite-${entry.id}`}>
                    <Heart className={cn("w-3.5 h-3.5 transition-colors", entry.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-red-400")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">{entry.isFavorite ? "Unfavorite" : "Favorite"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-foreground" onClick={() => onEdit(entry)} data-testid={`button-edit-entry-${entry.id}`}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Edit</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(entry)} data-testid={`button-delete-entry-${entry.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Delete</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="space-y-2">
            <p className={cn("text-sm leading-relaxed whitespace-pre-wrap text-foreground", !expanded && isLong && "line-clamp-4")}>
              {entry.content}
            </p>
            {isLong && (
              <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary hover:underline transition-all" data-testid={`button-expand-entry-${entry.id}`}>
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>

          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {entry.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 text-muted-foreground">
                  <Tag className="w-2 h-2" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/40">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {wordCount} words
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {readingTime(entry.content)}
              </span>
              {entry.createdAt && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(entry.createdAt), "h:mm a")}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────
function HeroStat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-1 rounded-2xl p-3 sm:p-4", accent ? "bg-white/20 text-white" : "bg-white/15 text-white")}>
      <Icon className="w-4 h-4 opacity-80" />
      <div className="text-xl sm:text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[11px] sm:text-xs opacity-75 font-medium text-center leading-tight">{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Sidebar Stats Panel
// ─────────────────────────────────────────────────────
function SidebarPanel({
  entries, goals, filterType, setFilterType, searchQuery, setSearchQuery, viewDate, setViewDate,
}: {
  entries: JournalEntry[];
  goals: Goal[];
  filterType: string;
  setFilterType: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  viewDate: Date;
  setViewDate: (d: Date) => void;
}) {
  const today = getTodayKey();
  const uniqueDateKeys = [...new Set(entries.map(e => e.dateKey))];
  const entryDatesSet = new Set(uniqueDateKeys);
  const writingStreak = computeStreak(uniqueDateKeys);
  const thisMonthEntries = entries.filter(e => e.dateKey.startsWith(today.slice(0, 7)));
  const thisMonthWords = thisMonthEntries.reduce((sum, e) => sum + computeWordCount(e.content), 0);
  const favCount = entries.filter(e => e.isFavorite).length;
  const quote = getDailyQuote();

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search entries…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9 rounded-xl"
          data-testid="input-search-entries"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter by type */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Filter className="w-3 h-3" />
            Filter by type
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterType("all")}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-all", filterType === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/40")}
              data-testid="filter-all"
            >
              All ({entries.length})
            </button>
            <button
              onClick={() => setFilterType(filterType === "favorites" ? "all" : "favorites")}
              className={cn("flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all", filterType === "favorites" ? "bg-red-500 text-white border-red-500" : "bg-background border-border text-muted-foreground hover:border-red-300")}
              data-testid="filter-favorites"
            >
              <Heart className="w-3 h-3" />
              Favorites ({favCount})
            </button>
            {PROMPT_TYPES.filter(pt => entries.some(e => (e.promptType ?? "freeform") === pt.value)).map(pt => {
              const count = entries.filter(e => (e.promptType ?? "freeform") === pt.value).length;
              return (
                <button
                  key={pt.value}
                  onClick={() => setFilterType(filterType === pt.value ? "all" : pt.value)}
                  className={cn("flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all", filterType === pt.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/40")}
                  data-testid={`filter-type-${pt.value}`}
                >
                  {pt.emoji} {count}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Month heatmap */}
      <Card className="border-border/60 overflow-hidden">
        <div className="h-0.5 w-full bg-primary" />
        <CardContent className="p-4">
          <MonthHeatmap
            entryDates={entryDatesSet}
            viewDate={viewDate}
            onPrev={() => setViewDate(subMonths(viewDate, 1))}
            onNext={() => setViewDate(addMonths(viewDate, 1))}
          />
        </CardContent>
      </Card>

      {/* This month stats */}
      <Card className="border-border/60 overflow-hidden">
        <div className="h-0.5 w-full bg-chart-2" />
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3" />
            This month
          </p>
          <div className="space-y-2.5">
            {[
              { label: "Entries written", value: thisMonthEntries.length, emoji: "📝" },
              { label: "Days journaled", value: new Set(thisMonthEntries.map(e => e.dateKey)).size, emoji: "📅" },
              { label: "Words written", value: thisMonthWords.toLocaleString(), emoji: "✍️" },
              { label: "Current streak", value: `${writingStreak} day${writingStreak !== 1 ? "s" : ""}`, emoji: "🔥" },
              { label: "Favorites", value: favCount, emoji: "❤️" },
            ].map(stat => (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span>{stat.emoji}</span>
                  {stat.label}
                </span>
                <span className="text-xs font-semibold tabular-nums">{stat.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily quote */}
      <Card className="border-border/60 bg-gradient-to-br from-primary/5 to-chart-2/5">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Today's thought
          </p>
          <blockquote className="text-sm italic text-foreground leading-relaxed mb-1">
            "{quote.text}"
          </blockquote>
          <p className="text-xs text-muted-foreground">— {quote.author}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────
export default function Journal() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const features = getPlanFeatures(user?.plan);

  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["journal", userId],
    queryFn: () => getJournals(userId),
    enabled: !!userId,
  });
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["goals", userId],
    queryFn: () => getGoals(userId),
    enabled: !!userId,
  });
  const { data: systems = [] } = useQuery({
    queryKey: ["systems", userId],
    queryFn: () => getSystems(userId),
    enabled: !!userId,
  });

  const qc = useQueryClient();
  const { toast } = useToast();

  const [showNewForm, setShowNewForm] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | undefined>();
  const [deleteEntry, setDeleteEntry] = useState<JournalEntry | undefined>();
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  const today = getTodayKey();
  const systemNames = systems.map((s: any) => s.name || s.title || "").filter(Boolean);

  const totalWords = useMemo(() => entries.reduce((sum, e) => sum + computeWordCount(e.content), 0), [entries]);
  const uniqueDateKeys = useMemo(() => [...new Set(entries.map(e => e.dateKey))], [entries]);
  const writingStreak = useMemo(() => computeStreak(uniqueDateKeys), [uniqueDateKeys]);
  const favCount = useMemo(() => entries.filter(e => e.isFavorite).length, [entries]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJournal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal", userId] });
      toast({ title: "Entry deleted" });
      setDeleteEntry(undefined);
    },
  });

  const toggleFavMutation = useMutation({
    mutationFn: (entry: JournalEntry) => updateJournal(entry.id, { isFavorite: !entry.isFavorite }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journal", userId] }),
  });

  const filtered = useMemo(() => {
    let list = [...entries];
    if (filterType === "favorites") {
      list = list.filter(e => e.isFavorite);
    } else if (filterType !== "all") {
      list = list.filter(e => (e.promptType ?? "freeform") === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e =>
        e.content.toLowerCase().includes(q) ||
        (goals.find(g => g.id === e.goalId)?.title ?? "").toLowerCase().includes(q) ||
        (e.tags ?? []).some(t => t.includes(q)),
      );
    }
    if (sortOrder === "oldest") list.sort((a, b) => (a.dateKey).localeCompare(b.dateKey));
    return list;
  }, [entries, filterType, searchQuery, sortOrder, goals]);

  const grouped: Record<string, JournalEntry[]> = {};
  for (const entry of filtered) {
    if (!grouped[entry.dateKey]) grouped[entry.dateKey] = [];
    grouped[entry.dateKey].push(entry);
  }
  const sortedDates = Object.keys(grouped).sort((a, b) => sortOrder === "newest" ? b.localeCompare(a) : a.localeCompare(b));
  const isFiltered = filterType !== "all" || searchQuery.trim() !== "";
  const hasWrittenToday = entries.some(e => e.dateKey === today);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero Header ─────────────────────── */}
      <div className="gradient-brand px-4 sm:px-6 pt-6 sm:pt-8 pb-8 sm:pb-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="text-white min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 opacity-90 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium opacity-80 uppercase tracking-wide">Reflections</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight">
                {entries.length === 0 ? "Start your journal" : "Your reflection journal"}
              </h1>
              <p className="text-white/70 text-xs sm:text-sm mt-1 truncate">
                {entries.length === 0
                  ? "Reflection is the hidden ingredient of lasting change."
                  : `${entries.length} entr${entries.length === 1 ? "y" : "ies"} · ${uniqueDateKeys.length} day${uniqueDateKeys.length !== 1 ? "s" : ""} · ${totalWords.toLocaleString()} words`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {entries.length > 0 && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-white/80 hover:text-white hover:bg-white/20 lg:hidden"
                        onClick={() => setShowSidebar(!showSidebar)}
                        data-testid="button-toggle-sidebar"
                      >
                        <BarChart2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Stats</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-white/80 hover:text-white hover:bg-white/20"
                        onClick={() => exportEntries(entries, goals)}
                        data-testid="button-export"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export entries</TooltipContent>
                  </Tooltip>
                </>
              )}
              {!showNewForm && !editEntry && (
                <>
                  <Button
                    onClick={() => setShowFullscreen(true)}
                    variant="secondary"
                    className="flex-shrink-0 gap-2 bg-white/20 hover:bg-white/30 text-white border-0 hidden sm:flex"
                    data-testid="button-fullscreen-entry"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Focus Mode</span>
                  </Button>
                  <Button
                    onClick={() => setShowNewForm(true)}
                    variant="secondary"
                    className="flex-shrink-0 gap-2 bg-white/25 hover:bg-white/35 text-white border-0"
                    data-testid="button-new-entry"
                  >
                    <PenLine className="w-4 h-4" />
                    <span className="hidden sm:inline">Write Entry</span>
                    <span className="sm:hidden">Write</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            <HeroStat icon={FileText} label="Entries" value={entries.length} />
            <HeroStat icon={Calendar} label="Days" value={uniqueDateKeys.length} />
            <HeroStat icon={Hash} label="Words" value={totalWords > 999 ? `${Math.floor(totalWords / 1000)}k+` : totalWords} />
            <HeroStat icon={Flame} label="Streak" value={`${writingStreak}d`} accent={writingStreak > 0} />
          </div>

          {/* Today nudge */}
          {!hasWrittenToday && !isLoading && entries.length > 0 && (
            <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <Sparkles className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />
              <p className="text-white/85 text-xs sm:text-sm flex-1">You haven't reflected today yet — a few minutes is all it takes.</p>
              <button onClick={() => setShowNewForm(true)} className="text-white text-xs font-semibold hover:underline flex-shrink-0">
                Write now →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Page Body ─────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
        {/* Plan gate */}
        {!features.advancedJournaling && (
          <div className="mb-5">
            <PlanGate
              requiredPlan="starter"
              featureLabel="Advanced Journal Entry Types"
              description="Unlock Weekly Review, Capture a Win, Process a Struggle, and Record an Insight — four structured entry types designed to deepen your self-awareness."
              compact
            />
          </div>
        )}

        {/* Identity card */}
        {user?.identityStatement && (
          <div className="flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-primary/8 border border-primary/20 mb-5" data-testid="identity-journal-card">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground mb-0.5">You are a person who {user.identityStatement}.</p>
              <p className="text-xs text-muted-foreground">Use your journal to build evidence for this identity — one reflection at a time.</p>
            </div>
          </div>
        )}

        {/* Mobile sidebar (collapsible) */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 overflow-hidden lg:hidden"
            >
              <SidebarPanel
                entries={entries}
                goals={goals}
                filterType={filterType}
                setFilterType={setFilterType}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                viewDate={viewDate}
                setViewDate={setViewDate}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-6">
          {/* ── Main Column ─────────── */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* New entry form */}
            <AnimatePresence>
              {showNewForm && !editEntry && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1.5">
                    <PenLine className="w-3 h-3" />
                    Today — {format(new Date(today + "T00:00:00"), "EEEE, MMMM d")}
                  </p>
                  <JournalForm userId={userId} goals={goals} systemNames={systemNames} onClose={() => setShowNewForm(false)} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Edit form */}
            <AnimatePresence>
              {editEntry && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1.5">
                    <Pencil className="w-3 h-3" />
                    Editing — {format(new Date(editEntry.dateKey + "T00:00:00"), "MMMM d, yyyy")}
                  </p>
                  <JournalForm
                    entry={editEntry}
                    userId={userId}
                    goals={goals}
                    systemNames={systemNames}
                    onClose={() => setEditEntry(undefined)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading */}
            {isLoading && (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && entries.length === 0 && !showNewForm && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { emoji: "🧠", label: "Spot patterns", desc: "Notice what's working and what keeps tripping you up." },
                    { emoji: "🎯", label: "Reinforce wins", desc: "Writing about a success makes it stick better in memory." },
                    { emoji: "🌱", label: "Process struggles", desc: "Turning challenges into words helps you learn from them." },
                  ].map(item => (
                    <div key={item.label} className="p-4 rounded-2xl border border-border bg-card text-center">
                      <div className="text-2xl mb-2">{item.emoji}</div>
                      <p className="text-sm font-semibold mb-1">{item.label}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <Card className="border-primary/20 bg-primary/3">
                  <CardContent className="p-8 sm:p-12 text-center">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Start your journal</h3>
                    <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                      Spend just 5 minutes reflecting. What worked today? What felt hard? Consistent reflection is one of the most underrated habits you can build.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button onClick={() => setShowNewForm(true)} data-testid="button-first-entry" className="gap-2">
                        <PenLine className="w-4 h-4" />
                        Write my first entry
                      </Button>
                      <Button onClick={() => setShowFullscreen(true)} variant="outline" className="gap-2" data-testid="button-first-entry-fullscreen">
                        <Maximize2 className="w-4 h-4" />
                        Focus mode
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Sort bar (when entries exist) */}
            {!isLoading && entries.length > 0 && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
                  {isFiltered ? " (filtered)" : ""}
                  {searchQuery && filtered.length > 0 ? ` matching "${searchQuery}"` : ""}
                </p>
                <div className="flex items-center gap-2">
                  {isFiltered && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => { setFilterType("all"); setSearchQuery(""); }}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  )}
                  <button
                    onClick={() => setSortOrder(o => o === "newest" ? "oldest" : "newest")}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-sort"
                  >
                    {sortOrder === "newest" ? <SortDesc className="w-3.5 h-3.5" /> : <SortAsc className="w-3.5 h-3.5" />}
                    {sortOrder === "newest" ? "Newest first" : "Oldest first"}
                  </button>
                </div>
              </div>
            )}

            {/* No results */}
            {!isLoading && filtered.length === 0 && isFiltered && (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground mb-1">No entries match</p>
                <p className="text-sm text-muted-foreground mb-4">Try a different search term or filter.</p>
                <Button variant="outline" size="sm" onClick={() => { setFilterType("all"); setSearchQuery(""); }}>
                  Clear filters
                </Button>
              </div>
            )}

            {/* Entries grouped by date */}
            {!isLoading && filtered.length > 0 && (
              <div className="space-y-8">
                <AnimatePresence>
                  {sortedDates.map(dateKey => {
                    const isToday = dateKey === today;
                    return (
                      <div key={dateKey}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            {isToday && <div className="w-2 h-2 rounded-full bg-chart-3 flex-shrink-0" />}
                            <p className={cn("text-sm font-semibold", isToday ? "text-chart-3" : "text-muted-foreground")}>
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
                                onEdit={(e) => {
                                  setEditEntry(e);
                                  setShowNewForm(false);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                onDelete={setDeleteEntry}
                                onToggleFavorite={(e) => toggleFavMutation.mutate(e)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* ── Desktop Sidebar ─────── */}
          <aside className="hidden lg:block w-72 xl:w-80 flex-shrink-0 space-y-4">
            <SidebarPanel
              entries={entries}
              goals={goals}
              filterType={filterType}
              setFilterType={setFilterType}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              viewDate={viewDate}
              setViewDate={setViewDate}
            />
          </aside>
        </div>
      </div>

      {/* ── Fullscreen Writing Dialog ─── */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-2xl w-[95vw] h-[90vh] max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden" data-testid="dialog-fullscreen">
          <DialogHeader className="px-5 pt-4 pb-0 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base">
                <Maximize2 className="w-4 h-4 text-primary" />
                Focus Mode
                <span className="text-xs font-normal text-muted-foreground">— distraction-free writing</span>
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-4 sm:p-5">
            <JournalForm
              userId={userId}
              goals={goals}
              systemNames={systemNames}
              onClose={() => setShowFullscreen(false)}
              fullscreen
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ─── */}
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
