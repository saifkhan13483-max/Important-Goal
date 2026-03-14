import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/auth.store";
import type { JournalEntry, Goal } from "@/types/schema";
import { getJournals, createJournal, updateJournal, deleteJournal } from "@/services/journal.service";
import { getGoals } from "@/services/goals.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { format } from "date-fns";

const PROMPT_TYPES = [
  { value: "daily", label: "Daily Reflection" },
  { value: "weekly", label: "Weekly Review" },
  { value: "win", label: "Capture a Win" },
  { value: "struggle", label: "Process a Struggle" },
  { value: "insight", label: "Record an Insight" },
  { value: "freeform", label: "Freeform Notes" },
];

const PROMPTS: Record<string, string> = {
  daily: "What worked today? What was hard? What do you want to improve tomorrow?",
  weekly: "What were your biggest wins this week? What patterns did you notice in your behavior? What will you do differently next week?",
  win: "Describe a recent win, big or small. How did it happen? What did you do well?",
  struggle: "What's been challenging lately? What have you tried? What might help?",
  insight: "What's something you've learned or realized recently about yourself or your systems?",
  freeform: "What's on your mind? Let it out freely.",
};

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function JournalForm({ entry, userId, goals, onClose }: { entry?: JournalEntry; userId: string; goals: Goal[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [promptType, setPromptType] = useState(entry?.promptType || "daily");
  const [content, setContent] = useState(entry?.content || "");
  const [goalId, setGoalId] = useState(entry?.goalId || "");

  const mutation = useMutation({
    mutationFn: (data: any) =>
      entry
        ? updateJournal(entry.id, data)
        : createJournal(userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journals", userId] });
      toast({ title: entry ? "Entry updated!" : "Entry saved!" });
      onClose();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Entry Type</Label>
        <Select value={promptType} onValueChange={setPromptType}>
          <SelectTrigger data-testid="select-prompt-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROMPT_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="p-3 rounded-md bg-muted/50">
        <p className="text-xs text-muted-foreground italic leading-relaxed">{PROMPTS[promptType]}</p>
      </div>

      <div className="space-y-2">
        <Label>Your thoughts</Label>
        <Textarea
          placeholder="Start writing..."
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={8}
          className="resize-none"
          data-testid="input-journal-content"
        />
        <p className="text-xs text-muted-foreground text-right">{wordCount} words</p>
      </div>

      <div className="space-y-2">
        <Label>Linked Goal <span className="text-muted-foreground">(optional)</span></Label>
        <Select value={goalId} onValueChange={setGoalId}>
          <SelectTrigger data-testid="select-journal-goal">
            <SelectValue placeholder="Link to a goal..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No goal linked</SelectItem>
            {goals.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => mutation.mutate({
            promptType,
            content,
            goalId: goalId || undefined,
            dateKey: entry?.dateKey || getTodayKey(),
          })}
          disabled={mutation.isPending || content.length < 10}
          data-testid="button-save-journal"
        >
          {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {entry ? "Save Changes" : "Save Entry"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function Journal() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";

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
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const getGoalTitle = (goalId?: string | null) => goals.find(g => g.id === goalId)?.title;

  const grouped: Record<string, JournalEntry[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.dateKey]) grouped[entry.dateKey] = [];
    grouped[entry.dateKey].push(entry);
  }
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Journal</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{entries.length} entries total</p>
        </div>
        <Button onClick={() => { setEditEntry(undefined); setDialogOpen(true); }} data-testid="button-new-entry">
          <Plus className="w-4 h-4 mr-2" />
          New Entry
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Start your journal</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">
              Reflection is the hidden ingredient of lasting change. Spend 5 minutes each day capturing what you're learning.
            </p>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-first-entry">Write Your First Entry</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(dateKey => (
            <div key={dateKey}>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-sm font-semibold text-muted-foreground">
                  {format(new Date(dateKey + "T00:00:00"), "EEEE, MMMM d, yyyy")}
                </p>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-3">
                {grouped[dateKey].map(entry => (
                  <Card key={entry.id} className="hover-elevate" data-testid={`journal-entry-${entry.id}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {PROMPT_TYPES.find(p => p.value === entry.promptType)?.label || entry.promptType}
                          </Badge>
                          {entry.goalId && (
                            <Badge variant="outline" className="text-xs">
                              {getGoalTitle(entry.goalId)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7"
                            onClick={() => { setEditEntry(entry); setDialogOpen(true); }}
                            data-testid={`button-edit-entry-${entry.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7"
                            onClick={() => setDeleteEntry(entry)}
                            data-testid={`button-delete-entry-${entry.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                      <p className="text-xs text-muted-foreground mt-3">
                        {entry.content.trim().split(/\s+/).filter(Boolean).length} words
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-journal-form">
          <DialogHeader>
            <DialogTitle>{editEntry ? "Edit Entry" : "New Journal Entry"}</DialogTitle>
          </DialogHeader>
          <JournalForm
            entry={editEntry}
            userId={userId}
            goals={goals}
            onClose={() => { setDialogOpen(false); setEditEntry(undefined); }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteEntry} onOpenChange={() => setDeleteEntry(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>This journal entry will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteEntry && deleteMutation.mutate(deleteEntry.id)}
              data-testid="button-confirm-delete-entry"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
