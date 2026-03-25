import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Play, Pause, RotateCcw, Timer, X, CheckCircle2 } from "lucide-react";

type TimerMode = "focus" | "short_break" | "long_break";

const MODE_CONFIG: Record<TimerMode, { label: string; seconds: number; color: string; emoji: string }> = {
  focus: { label: "Focus", seconds: 25 * 60, color: "text-primary", emoji: "🎯" },
  short_break: { label: "Short Break", seconds: 5 * 60, color: "text-chart-3", emoji: "☕" },
  long_break: { label: "Long Break", seconds: 15 * 60, color: "text-chart-2", emoji: "🛋️" },
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface FocusTimerProps {
  open: boolean;
  onClose: () => void;
  systemName?: string;
}

export function FocusTimer({ open, onClose, systemName }: FocusTimerProps) {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState(MODE_CONFIG.focus.seconds);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const config = MODE_CONFIG[mode];
  const total = config.seconds;
  const pct = Math.round(((total - timeLeft) / total) * 100);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
  }, []);

  const tick = useCallback(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        stop();
        setFinished(true);
        if (mode === "focus") setSessions(s => s + 1);
        try {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Strivo", {
              body: mode === "focus" ? "Focus session complete! Time for a break." : "Break over. Back to focus!",
              icon: "/favicon.ico",
            });
          }
        } catch {}
        return 0;
      }
      return prev - 1;
    });
  }, [stop, mode]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick]);

  const switchMode = (newMode: TimerMode) => {
    stop();
    setFinished(false);
    setMode(newMode);
    setTimeLeft(MODE_CONFIG[newMode].seconds);
  };

  const reset = () => {
    stop();
    setFinished(false);
    setTimeLeft(total);
  };

  const toggleRunning = () => {
    if (finished) {
      reset();
      return;
    }
    setRunning(r => !r);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { stop(); onClose(); } }}>
      <DialogContent className="max-w-sm" data-testid="focus-timer-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            Focus Timer
            {systemName && <span className="text-muted-foreground font-normal text-sm">— {systemName}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Mode tabs */}
          <div className="flex rounded-xl bg-muted p-1 gap-1">
            {(Object.keys(MODE_CONFIG) as TimerMode[]).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  mode === m ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                data-testid={`timer-mode-${m}`}
              >
                {MODE_CONFIG[m].label}
              </button>
            ))}
          </div>

          {/* Timer display */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="68" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                <circle
                  cx="80" cy="80" r="68"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 68}
                  strokeDashoffset={2 * Math.PI * 68 * (1 - pct / 100)}
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums tracking-tight">{formatTime(timeLeft)}</span>
                <span className="text-xs text-muted-foreground mt-0.5">{config.emoji} {config.label}</span>
              </div>
            </div>

            <Progress value={pct} className="h-1.5 w-full" />

            {finished ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-chart-3" />
                <p className="font-semibold">
                  {mode === "focus" ? "Session complete! 🎉" : "Break over!"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {mode === "focus" ? `${sessions} session${sessions !== 1 ? "s" : ""} completed today` : "Ready to focus again?"}
                </p>
              </div>
            ) : null}

            <div className="flex items-center gap-2 w-full">
              <Button
                variant="outline"
                size="icon"
                onClick={reset}
                className="w-9 h-9"
                title="Reset"
                data-testid="button-timer-reset"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={toggleRunning}
                data-testid="button-timer-toggle"
              >
                {running ? (
                  <><Pause className="w-4 h-4" /> Pause</>
                ) : finished ? (
                  <><RotateCcw className="w-4 h-4" /> Restart</>
                ) : (
                  <><Play className="w-4 h-4" /> {timeLeft === total ? "Start" : "Resume"}</>
                )}
              </Button>
            </div>
          </div>

          {sessions > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              🍅 {sessions} Pomodoro session{sessions !== 1 ? "s" : ""} completed
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
