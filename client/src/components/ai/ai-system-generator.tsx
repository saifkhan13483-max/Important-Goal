import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bot, Loader2, Sparkles, Check, AlertCircle } from "lucide-react";
import { generateFullSystem, type GeneratedSystem } from "@/services/ai.service";
import { cn } from "@/lib/utils";

interface AiSystemGeneratorProps {
  open: boolean;
  onClose: () => void;
  onApply: (system: GeneratedSystem) => void;
}

const EXAMPLE_GOALS = [
  "I want to become consistent at daily reading",
  "I want to build a morning exercise habit",
  "I want to meditate every day and reduce stress",
  "I want to write regularly and finish a side project",
];

export function AiSystemGenerator({ open, onClose, onApply }: AiSystemGeneratorProps) {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GeneratedSystem | null>(null);

  const handleGenerate = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const result = await generateFullSystem(goal.trim());
      setPreview(result);
    } catch (err: any) {
      setError(err?.message ?? "AI assistant is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!preview) return;
    onApply(preview);
    onClose();
    setGoal("");
    setPreview(null);
    setError(null);
  };

  const handleClose = () => {
    onClose();
    setGoal("");
    setPreview(null);
    setError(null);
  };

  const previewRows = preview
    ? [
        { label: "Identity", value: preview.identityStatement },
        { label: "Trigger", value: preview.triggerStatement },
        { label: "Minimum Action", value: preview.minimumAction },
        { label: "Reward", value: preview.rewardPlan },
        { label: "Fallback Plan", value: preview.fallbackPlan },
      ].filter((r) => r.value)
    : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg" data-testid="ai-system-generator-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            Generate System with AI
          </DialogTitle>
          <DialogDescription>
            Describe your goal and AI will generate a complete identity-based habit system for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Goal input */}
          <div className="space-y-2">
            <Label htmlFor="ai-goal-input" className="font-semibold text-sm">
              What habit do you want to build?
            </Label>
            <Textarea
              id="ai-goal-input"
              placeholder="e.g. I want to become consistent at daily reading"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              className="resize-none text-sm"
              data-testid="input-ai-goal"
              disabled={loading}
            />
          </div>

          {/* Example chips */}
          {!preview && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Try an example
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_GOALS.map((eg) => (
                  <button
                    key={eg}
                    type="button"
                    onClick={() => setGoal(eg)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-primary/8 hover:border-primary/30 hover:text-primary transition-all text-left"
                    data-testid={`ai-example-${eg.slice(0, 15).replace(/\s/g, "-")}`}
                    disabled={loading}
                  >
                    {eg}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/8 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Preview */}
          {preview && previewRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Check className="w-3 h-3 text-chart-3" />
                Generated system — review before applying
              </p>
              <div className="rounded-xl border border-border/60 divide-y divide-border/40 overflow-hidden">
                {previewRows.map((row) => (
                  <div key={row.label} className="px-4 py-3 bg-card">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">
                      {row.label}
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">{row.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                These will fill your system builder. You can edit every field before saving.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className={cn("flex gap-2", preview ? "justify-between" : "justify-end")}>
            {preview && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setPreview(null); setError(null); }}
                disabled={loading}
                data-testid="button-ai-generator-regenerate"
              >
                Try again
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={loading}
                data-testid="button-ai-generator-cancel"
              >
                Cancel
              </Button>
              {preview ? (
                <Button
                  size="sm"
                  onClick={handleApply}
                  data-testid="button-ai-generator-apply"
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Apply to builder
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={!goal.trim() || loading}
                  data-testid="button-ai-generator-generate"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Generate
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
