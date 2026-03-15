import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/auth.store";
import type { System, Checkin } from "@/types/schema";
import { FutureSelfAudioPlayer, hasFutureSelfAudio } from "@/components/future-self-audio";
import { getSystems } from "@/services/systems.service";
import { getCheckinsByDate, getCheckins, upsertCheckin } from "@/services/checkins.service";
import { computeAnalytics } from "@/services/analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  CheckSquare, Check, Minus, X, Flame, MessageSquare,
  ChevronDown, ChevronUp, History, CalendarDays, Grid3x3, Trophy,
  ArrowRight, ClipboardList, Sparkles, RefreshCw,
} from "lucide-react";
import { format, parseISO, startOfMonth, getDaysInMonth, getDay, subMonths, addMonths } from "date-fns";
import { cn } from "@/lib/utils";

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

/* ─── Confetti for celebration ─────────────────────────────────── */
const CONFETTI_COLORS = [
  "#a78bfa", "#818cf8", "#34d399", "#fbbf24", "#f472b6",
  "#60a5fa", "#fb923c", "#e879f9",
];

function CelebrationOverlay({ show, onDismiss }: { show: boolean; onDismiss: () => void }) {
  const particles = useRef(
    Array.from({ length: 48 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 2.2 + Math.random() * 1.5,
      size: 6 + Math.random() * 8,
      rotate: Math.random() * 360,
      shape: Math.random() > 0.5 ? "circle" : "rect",
    }))
  ).current;

  useEffect(() => {
    if (show) {
      const t = setTimeout(onDismiss, 5000);
      return () => clearTimeout(t);
    }
  }, [show, onDismiss]);

  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onDismiss}
      data-testid="celebration-overlay"
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              top: -20,
              left: `${p.left}%`,
              width: p.size,
              height: p.shape === "rect" ? p.size * 0.45 : p.size,
              borderRadius: p.shape === "circle" ? "50%" : 2,
              background: p.color,
              animation: `ciConfettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
              transform: `rotate(${p.rotate}deg)`,
            }}
          />
        ))}
        <style>{`
          @keyframes ciConfettiFall {
            0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
            80%  { opacity: 1; }
            100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
          }
        `}</style>
      </div>
      <div
        className="relative z-10 bg-background rounded-2xl p-8 text-center shadow-2xl mx-4 max-w-sm w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-5xl mb-4">🔥</div>
        <p className="text-2xl font-bold mb-2">Perfect Day!</p>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          You checked in on every single system today. That kind of consistency is how lasting change is built.
          See you tomorrow!
        </p>
        <Button className="w-full" onClick={onDismiss} data-testid="button-close-celebration">
          <Trophy className="w-4 h-4 mr-2" />
          Keep the momentum going!
        </Button>
      </div>
    </div>
  );
}

const IDENTITY_MESSAGES = [
  (identity: string | null | undefined, _name: string, _streak: number) =>
    identity
      ? `${identity.charAt(0).toUpperCase() + identity.slice(1)}. You just proved it.`
      : `You showed up. You just proved it.`,
  (_identity: string | null | undefined, _name: string, _streak: number) =>
    `Every consistent person did exactly what you just did.`,
  (identity: string | null | undefined, _name: string, _streak: number) =>
    identity
      ? `I AM a person who ${identity}. Today is evidence.`
      : `I AM consistent. Today is evidence.`,
  (_identity: string | null | undefined, name: string, streak: number) =>
    streak > 1
      ? `You kept the ${name} system alive for ${streak} days. That's not luck — that's a system working.`
      : `Day one done. Every streak starts exactly here.`,
  (_identity: string | null | undefined, _name: string, _streak: number) =>
    `Even the minimum version counts. You chose to show up instead of opt out.`,
  (identity: string | null | undefined, _name: string, _streak: number) =>
    identity
      ? `This is what it looks like to become someone who ${identity}.`
      : `This is what consistent people do. One day at a time.`,
];

/* --- Celebration Ritual Modal (Prompt 5) --- */
function CelebrationRitualModal({
  show, systemName, streakDays, identityStatement, onDismiss,
}: {
  show: boolean;
  systemName: string;
  streakDays: number;
  identityStatement?: string | null;
  onDismiss: () => void;
}) {
  const msgIndex = streakDays % IDENTITY_MESSAGES.length;
  const message = IDENTITY_MESSAGES[msgIndex](identityStatement, systemName, streakDays);

  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      data-testid="celebration-ritual-overlay"
    >
      <div
        className="relative bg-background rounded-2xl p-8 text-center shadow-2xl max-w-sm w-full border border-primary/20"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-6xl mb-4" style={{ animation: "bounce 1s infinite" }}>✅</div>
        <div className="space-y-2 mb-6">
          <p className="text-2xl font-extrabold text-foreground">YOU DID IT!</p>
          <p className="text-primary font-semibold text-lg leading-snug">{systemName}</p>
          <p className="text-muted-foreground text-sm">
            Day <span className="font-bold text-foreground text-xl">{streakDays}</span> Complete
          </p>
        </div>
        <div className="bg-primary/8 border border-primary/20 rounded-xl p-4 mb-6">
          <p className="text-sm text-muted-foreground mb-3">Take 3 seconds to feel this:</p>
          <p className="text-base font-bold text-primary leading-snug">
            "{message}"
          </p>
        </div>
        <Button
          className="w-full gradient-brand text-white border-0 font-semibold"
          onClick={onDismiss}
          data-testid="button-dismiss-celebration-ritual"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          I felt it — keep going!
        </Button>
        <p
          className="text-xs text-muted-foreground mt-3 cursor-pointer hover:text-foreground transition-colors"
          onClick={onDismiss}
        >
          Tap to continue
        </p>
      </div>
    </div>
  );
}

/* --- Recovery Flow Modal --- */
const MISS_REASONS = [
  { value: "low-energy",   label: "Low energy or overwhelmed",  emoji: "😔", suggestion: "shrink" },
  { value: "forgot",       label: "I forgot",                   emoji: "💭", suggestion: "trigger" },
  { value: "no-time",      label: "No time",                    emoji: "⏱️",  suggestion: "reduce" },
  { value: "travel",       label: "Travel or unusual day",      emoji: "✈️",  suggestion: "maintenance" },
  { value: "sick",         label: "Sick or unwell",             emoji: "🤒",  suggestion: "maintenance" },
  { value: "overwhelmed",  label: "Emotionally overwhelmed",    emoji: "🌊",  suggestion: "shrink" },
  { value: "other",        label: "Something else",             emoji: "💬",  suggestion: "fallback" },
] as const;

type MissReason = typeof MISS_REASONS[number];

function RecoveryFlowModal({
  show, system, checkinStatus, onDismiss,
}: {
  show: boolean;
  system: System;
  checkinStatus: "skipped" | "partial";
  onDismiss: (intention?: string) => void;
}) {
  const { user } = useAppStore();
  const [step, setStep]           = useState(0);
  const [missReason, setMissReason] = useState<MissReason | null>(null);
  const [intention, setIntention]  = useState<string>("");
  const [customNote, setCustomNote] = useState("");

  useEffect(() => {
    if (show) { setStep(0); setMissReason(null); setIntention(""); setCustomNote(""); }
  }, [show]);

  if (!show) return null;

  const handleMissReason = (reason: MissReason) => {
    setMissReason(reason);
    setStep(2);
  };

  const handleFinish = () => {
    const finalIntention = intention === "custom" ? customNote : intention;
    onDismiss(finalIntention || undefined);
  };

  const totalSteps = checkinStatus === "partial" ? 2 : 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" data-testid="recovery-flow-overlay">
      <div className="relative bg-background rounded-2xl shadow-2xl max-w-sm w-full border" onClick={e => e.stopPropagation()}>
        {checkinStatus === "skipped" && hasFutureSelfAudio() && (
          <div className="px-6 pt-5 pb-0">
            <FutureSelfAudioPlayer
              context="missedDay"
              userName={user?.name}
              playOnFirstVisit={user?.futureAudioPlayOnFirstVisit ?? true}
              playAfterMissed={user?.futureAudioPlayAfterMissed ?? true}
              autoplay={user?.futureAudioAutoplay ?? true}
              muted={user?.futureAudioMuted ?? false}
            />
          </div>
        )}
        <div className="p-6">
          <div className="flex gap-1.5 mb-6">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className={cn("h-1 flex-1 rounded-full transition-all", i <= step ? "bg-primary" : "bg-muted")} />
            ))}
          </div>

          {/* ── PARTIAL: step 0 ── */}
          {checkinStatus === "partial" && step === 0 && (
            <div className="space-y-4">
              <div className="text-4xl text-center">🟡</div>
              <p className="text-lg font-bold text-center">Partial is not failure.</p>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                You kept the system alive. That's the whole point.
              </p>
              {system.minimumAction && (
                <div className="bg-primary/8 border border-primary/20 rounded-xl p-3">
                  <p className="text-xs font-semibold text-primary mb-1">Your minimum action</p>
                  <p className="text-sm text-foreground">"{system.minimumAction}"</p>
                </div>
              )}
              <p className="text-sm font-medium text-center">Want to stay in minimum mode tomorrow?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setIntention("Yes — keep it small tomorrow"); setStep(1); }}
                  className="p-3 rounded-xl border hover:border-chart-3/50 hover:bg-chart-3/5 transition-all text-sm font-medium text-center"
                  data-testid="button-partial-minimum-mode"
                >
                  Yes, keep it small
                </button>
                <button
                  onClick={() => { setIntention("Back to full action tomorrow"); setStep(1); }}
                  className="p-3 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium text-center"
                  data-testid="button-partial-back-to-full"
                >
                  No, full action
                </button>
              </div>
            </div>
          )}

          {/* ── PARTIAL: step 1 (done) ── */}
          {checkinStatus === "partial" && step === 1 && (
            <div className="space-y-4 text-center">
              <div className="text-5xl">🔁</div>
              <p className="text-lg font-bold">System still alive.</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                It's paused, not broken. See you tomorrow.
              </p>
              {intention && (
                <div className="bg-primary/8 border border-primary/20 rounded-xl p-3 text-left">
                  <p className="text-xs font-semibold text-primary mb-1">Tomorrow's plan:</p>
                  <p className="text-sm text-foreground">{intention}</p>
                </div>
              )}
              <Button className="w-full" onClick={handleFinish} data-testid="button-recovery-finish">
                <RefreshCw className="w-4 h-4 mr-2" />
                See you tomorrow
              </Button>
            </div>
          )}

          {/* ── MISSED: step 0 — acknowledge ── */}
          {checkinStatus === "skipped" && step === 0 && (
            <div className="space-y-4">
              <p className="text-lg font-bold">It's paused, not broken.</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                What made today hard? Your answer helps the system adapt.
              </p>
              <div className="space-y-2">
                {MISS_REASONS.map(reason => (
                  <button
                    key={reason.value}
                    onClick={() => handleMissReason(reason)}
                    className="w-full text-left p-3 rounded-xl border hover:border-primary/40 hover:bg-primary/4 transition-all flex items-center gap-3"
                    data-testid={`button-miss-reason-${reason.value}`}
                  >
                    <span className="text-lg">{reason.emoji}</span>
                    <span className="text-sm font-medium">{reason.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── MISSED: step 1 — intermediate (not used directly, skip to step 2) ── */}

          {/* ── MISSED: step 2 — branched suggestion ── */}
          {checkinStatus === "skipped" && step === 2 && missReason && (
            <div className="space-y-4">
              {missReason.suggestion === "shrink" && (
                <>
                  <p className="text-lg font-bold">Hard stretch detected.</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The system adapts. For the next 3 days, only your minimum action counts. No streaks lost. Identity preserved.
                  </p>
                  {system.minimumAction && (
                    <div className="bg-primary/8 border border-primary/20 rounded-xl p-3">
                      <p className="text-xs font-semibold text-primary mb-1">Your minimum for the next 3 days:</p>
                      <p className="text-sm text-foreground font-medium">"{system.minimumAction}"</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground italic">Small is not cheating. Small is what makes the system survivable.</p>
                  <Button className="w-full" onClick={() => { setIntention("Minimum mode for 3 days"); setStep(3); }} data-testid="button-activate-shrink">
                    Shrink system for 3 days <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}

              {missReason.suggestion === "maintenance" && (
                <>
                  <p className="text-lg font-bold">Maintenance mode makes sense.</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your identity stays intact. Streak loss is paused. For 3 days, only the minimum action counts — then you decide whether to return to normal or extend.
                  </p>
                  {system.minimumAction && (
                    <div className="bg-chart-3/8 border border-chart-3/20 rounded-xl p-3">
                      <p className="text-xs font-semibold text-chart-3 mb-1">Minimum action (maintenance mode):</p>
                      <p className="text-sm text-foreground font-medium">"{system.minimumAction}"</p>
                    </div>
                  )}
                  <Button className="w-full" onClick={() => { setIntention("Maintenance mode — minimum only for 3 days"); setStep(3); }} data-testid="button-activate-maintenance">
                    Activate maintenance mode <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}

              {missReason.suggestion === "trigger" && (
                <>
                  <p className="text-lg font-bold">Let's improve the trigger.</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The best habits attach to something you already do. What existing routine could this follow?
                  </p>
                  <Textarea
                    placeholder="e.g. After I brush my teeth, I'll… / When I sit at my desk, I'll…"
                    value={customNote}
                    onChange={e => setCustomNote(e.target.value)}
                    rows={3}
                    className="text-sm"
                    data-testid="input-recovery-trigger-note"
                    autoFocus
                  />
                  <Button
                    className="w-full"
                    onClick={() => { setIntention(customNote.trim() ? `New trigger: ${customNote.trim()}` : "Improve my trigger"); setStep(3); }}
                    data-testid="button-recovery-trigger-next"
                  >
                    Set new trigger <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}

              {missReason.suggestion === "reduce" && (
                <>
                  <p className="text-lg font-bold">Make tomorrow easier to start.</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    What's the absolute smallest version that still counts? Even 30 seconds is better than nothing.
                  </p>
                  {system.minimumAction && (
                    <div className="bg-muted/50 border border-border rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-1">Current minimum:</p>
                      <p className="text-sm text-foreground">"{system.minimumAction}"</p>
                    </div>
                  )}
                  <Textarea
                    placeholder="e.g. Just open the app. Just stand up. Just pick up the book."
                    value={customNote}
                    onChange={e => setCustomNote(e.target.value)}
                    rows={2}
                    className="text-sm"
                    data-testid="input-recovery-reduce-note"
                    autoFocus
                  />
                  <Button
                    className="w-full"
                    onClick={() => { setIntention(customNote.trim() ? `Reduced minimum: ${customNote.trim()}` : "Start even smaller tomorrow"); setStep(3); }}
                    data-testid="button-recovery-reduce-next"
                  >
                    That's my new minimum <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}

              {missReason.suggestion === "fallback" && (
                <>
                  <p className="text-lg font-bold">No worries — let's reset.</p>
                  {system.fallbackPlan && (
                    <div className="bg-chart-4/8 border border-chart-4/20 rounded-xl p-3">
                      <p className="text-xs font-semibold text-chart-4 mb-1">Your recovery plan</p>
                      <p className="text-sm text-foreground leading-relaxed">{system.fallbackPlan}</p>
                    </div>
                  )}
                  {system.minimumAction && (
                    <div className="bg-primary/8 border border-primary/20 rounded-xl p-3">
                      <p className="text-xs font-semibold text-primary mb-1">Tomorrow, even this counts:</p>
                      <p className="text-sm text-foreground">"{system.minimumAction}"</p>
                    </div>
                  )}
                  {!system.fallbackPlan && !system.minimumAction && (
                    <p className="text-sm text-muted-foreground">Missing one day never derailed anyone. Tomorrow is a fresh start.</p>
                  )}
                  <Button className="w-full" onClick={() => { setIntention("Back tomorrow — minimum action"); setStep(3); }} data-testid="button-recovery-fallback-next">
                    Got it — see you tomorrow <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              )}
            </div>
          )}

          {/* ── MISSED: step 3 — final ── */}
          {checkinStatus === "skipped" && step === 3 && (
            <div className="space-y-4 text-center">
              <div className="text-5xl">🔁</div>
              <p className="text-lg font-bold text-foreground">System still alive.</p>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
                <p>It's paused, not broken.</p>
                <p className="font-semibold text-foreground">Showing up tomorrow is what matters.</p>
              </div>
              {intention && (
                <div className="bg-primary/8 border border-primary/20 rounded-xl p-3 text-left">
                  <p className="text-xs font-semibold text-primary mb-1">Your plan:</p>
                  <p className="text-sm text-foreground">{intention}</p>
                </div>
              )}
              <Button className="w-full" onClick={handleFinish} data-testid="button-recovery-finish">
                <RefreshCw className="w-4 h-4 mr-2" />
                I'll be back tomorrow
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Mood emoji picker ─────────────────────────────────────────── */
const MOOD_EMOJIS = [
  { value: 1, emoji: "😞", label: "Rough"  },
  { value: 2, emoji: "😔", label: "Low"    },
  { value: 3, emoji: "😐", label: "Okay"   },
  { value: 4, emoji: "😊", label: "Good"   },
  { value: 5, emoji: "😄", label: "Great"  },
];

function MoodEmojiPicker({
  label, value, onChange, testPrefix,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number) => void;
  testPrefix: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <div className="flex gap-2">
        {MOOD_EMOJIS.map(m => (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            data-testid={`${testPrefix}-${m.value}`}
            title={m.label}
            className={cn(
              "flex flex-col items-center gap-0.5 p-2 rounded-lg border transition-all flex-1",
              value === m.value
                ? "border-primary bg-primary/10 scale-110"
                : "border-border bg-muted/30 hover:border-primary/40 hover:scale-105"
            )}
          >
            <span className="text-lg leading-none">{m.emoji}</span>
            <span className="text-[9px] text-muted-foreground">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Number rating row (kept for Difficulty) ────────────────────── */
function RatingRow({
  label, value, onChange,
}: { label: string; value: number | null | undefined; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "w-7 h-7 rounded text-xs font-medium border transition-all",
              value === n
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/40 border-border text-muted-foreground hover:border-primary/50"
            )}
            data-testid={`rating-${label.toLowerCase().replace(/ /g, "-")}-${n}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Streak milestone set ──────────────────────────────────────── */
const STREAK_MILESTONES = new Set([7, 14, 21, 30, 50, 66, 100]);

/* ─── Status config ─────────────────────────────────────────────── */
const STATUS_CONFIG = {
  done:    { label: "Done",    icon: Check, color: "text-chart-3",     bg: "bg-chart-3/10 border-chart-3/20" },
  partial: { label: "Partial", icon: Minus, color: "text-chart-4",     bg: "bg-chart-4/10 border-chart-4/20" },
  missed:  { label: "Missed",  icon: X,     color: "text-destructive",  bg: "bg-destructive/10 border-destructive/20" },
};

/* ─── Individual check-in card ──────────────────────────────────── */
function SystemCheckinCard({
  system, existingCheckin, userId, streakDays, onPerfectDay, identityStatement,
  consistencyScore, weeklyVotes,
}: {
  system: System;
  existingCheckin?: Checkin;
  userId: string;
  streakDays: number;
  onPerfectDay?: () => void;
  identityStatement?: string | null;
  consistencyScore?: number;
  weeklyVotes?: number;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const today = getTodayKey();

  const [showNote, setShowNote]         = useState(false);
  const [note, setNote]                 = useState(existingCheckin?.note || "");
  const [moodBefore, setMoodBefore]     = useState<number | null>(existingCheckin?.moodBefore ?? null);
  const [moodAfter, setMoodAfter]       = useState<number | null>(existingCheckin?.moodAfter ?? null);
  const [difficulty, setDifficulty]     = useState<number | null>(existingCheckin?.difficulty ?? null);
  const [justDone, setJustDone]         = useState(false);
  const [showRitual, setShowRitual]     = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<"skipped" | "partial">("skipped");
  const pulseDoneTimer                  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = existingCheckin?.status as keyof typeof STATUS_CONFIG | undefined;

  const checkInMutation = useMutation({
    mutationFn: (status: string) =>
      upsertCheckin(userId, system.id, today, {
        status,
        note:       note || undefined,
        moodBefore: moodBefore ?? undefined,
        moodAfter:  moodAfter  ?? undefined,
        difficulty: difficulty ?? undefined,
      }),
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ["checkins-today", userId, today] });
      qc.invalidateQueries({ queryKey: ["checkins", userId] });
      if (status === "done") {
        localStorage.removeItem("sf_missed_yesterday");
        if (pulseDoneTimer.current) clearTimeout(pulseDoneTimer.current);
        setJustDone(true);
        pulseDoneTimer.current = setTimeout(() => setJustDone(false), 600);
        setShowRitual(true);
      } else if (status === "skipped" || status === "partial") {
        localStorage.setItem("sf_missed_yesterday", "true");
        setRecoveryStatus(status as "skipped" | "partial");
        setShowRecovery(true);
      } else {
        toast({ title: "Checked in!" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Couldn't save check-in", description: err?.message ?? "Please try again.", variant: "destructive" });
    },
  });

  const saveNotesMutation = useMutation({
    mutationFn: () => {
      if (!current) throw new Error("no-status");
      return upsertCheckin(userId, system.id, today, {
        status:     current,
        note:       note || undefined,
        moodBefore: moodBefore ?? undefined,
        moodAfter:  moodAfter  ?? undefined,
        difficulty: difficulty ?? undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkins-today", userId, today] });
      qc.invalidateQueries({ queryKey: ["checkins", userId] });
      toast({ title: "Note & ratings saved." });
    },
    onError: (err: any) => {
      if ((err as Error).message === "no-status") {
        toast({
          title:       "Pick a status first",
          description: "Tap Done, Partial, or Missed above — then your note & ratings will be saved together.",
          variant:     "destructive",
        });
      } else {
        toast({ title: "Couldn't save", description: err?.message ?? "Please try again.", variant: "destructive" });
      }
    },
  });

  return (
    <Card
      className={cn(
        "transition-all",
        current === "done" ? "ring-1 ring-chart-3/30" : "",
        justDone ? "animate-pulse-success" : "",
      )}
      data-testid={`checkin-card-${system.id}`}
    >
      <CardContent className="p-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm">{system.title}</p>
              {streakDays > 0 && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-chart-4 text-xs font-semibold rounded px-1",
                    STREAK_MILESTONES.has(streakDays) ? "animate-glow-pulse" : "",
                  )}
                  data-testid={`streak-badge-${system.id}`}
                >
                  <Flame className="w-3 h-3" />
                  {streakDays}d
                  {STREAK_MILESTONES.has(streakDays) && (
                    <Trophy className="w-3 h-3 ml-0.5 text-chart-4" aria-label="Streak milestone reached!" />
                  )}
                </span>
              )}
              {weeklyVotes !== undefined && (
                <span
                  className="text-xs text-muted-foreground font-medium"
                  title="Days done this week"
                  data-testid={`weekly-votes-${system.id}`}
                >
                  {weeklyVotes}/7 this week
                </span>
              )}
              {consistencyScore !== undefined && consistencyScore > 0 && (
                <span
                  className={cn(
                    "text-xs font-medium px-1.5 py-0.5 rounded-full",
                    consistencyScore >= 70 ? "bg-chart-3/15 text-chart-3" :
                    consistencyScore >= 40 ? "bg-chart-4/15 text-chart-4" :
                    "bg-muted text-muted-foreground",
                  )}
                  title="Consistency over last 30 days"
                  data-testid={`consistency-score-${system.id}`}
                >
                  {consistencyScore}% consistent
                </span>
              )}
            </div>
            {system.triggerStatement && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{system.triggerStatement}</p>
            )}
          </div>
          {current && (
            <Badge variant="outline" className={`text-xs flex-shrink-0 ${STATUS_CONFIG[current]?.bg}`}>
              {STATUS_CONFIG[current]?.label}
            </Badge>
          )}
        </div>

        {/* Today's minimum action */}
        {system.minimumAction && (
          <div className="bg-muted/40 rounded-md px-3 py-2 mb-3">
            <p className="text-xs text-muted-foreground font-medium">Today's action</p>
            <p className="text-xs mt-0.5">{system.minimumAction}</p>
          </div>
        )}

        {/* Status buttons */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map(status => {
            const cfg = STATUS_CONFIG[status];
            const Icon = cfg.icon;
            const isSelected = current === status;
            return (
              <Button
                key={status}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => checkInMutation.mutate(status)}
                disabled={checkInMutation.isPending}
                className="gap-1.5"
                data-testid={`button-checkin-${status}-${system.id}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cfg.label}
              </Button>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNote(n => !n)}
            className="gap-1.5 ml-auto"
            data-testid={`button-checkin-note-${system.id}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Note & mood
            {showNote ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>

        {/* Note + mood panel */}
        {showNote && (
          <div className="mt-3 space-y-4 border-t border-border/50 pt-3">
            {/* Helper hint when no status chosen */}
            {!current && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20">
                <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  <strong>Tap Done, Partial, or Missed first</strong> — your note and mood will be saved together with your check-in.
                </p>
              </div>
            )}

            {/* Mood emoji pickers */}
            <div className="space-y-3">
              <MoodEmojiPicker
                label="How were you feeling before?"
                value={moodBefore}
                onChange={setMoodBefore}
                testPrefix={`mood-before-${system.id}`}
              />
              <MoodEmojiPicker
                label="How do you feel now?"
                value={moodAfter}
                onChange={setMoodAfter}
                testPrefix={`mood-after-${system.id}`}
              />
            </div>

            {/* Difficulty rating */}
            <RatingRow label="Difficulty" value={difficulty} onChange={setDifficulty} />

            {/* Note textarea */}
            <Textarea
              placeholder="How did it go? What did you notice?"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="text-sm"
              data-testid={`input-checkin-note-${system.id}`}
            />

            {current ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => saveNotesMutation.mutate()}
                disabled={saveNotesMutation.isPending}
                data-testid={`button-save-note-${system.id}`}
              >
                {saveNotesMutation.isPending ? "Saving…" : "Save note & mood"}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Your note & mood will be saved automatically when you tap Done, Partial, or Missed above.
              </p>
            )}
          </div>
        )}

        {/* Fallback advice when missed */}
        {current === "missed" && system.fallbackPlan && (
          <div className="mt-3 p-3 rounded-md bg-chart-4/10 border border-chart-4/20">
            <p className="text-xs font-medium text-chart-4 mb-0.5">Your fallback plan</p>
            <p className="text-xs text-foreground">{system.fallbackPlan}</p>
          </div>
        )}
      </CardContent>

      <CelebrationRitualModal
        show={showRitual}
        systemName={system.title}
        streakDays={streakDays + 1}
        identityStatement={identityStatement}
        onDismiss={() => { setShowRitual(false); onPerfectDay?.(); }}
      />

      <RecoveryFlowModal
        show={showRecovery}
        system={system}
        checkinStatus={recoveryStatus}
        onDismiss={() => setShowRecovery(false)}
      />
    </Card>
  );
}

/* ─── History day card ──────────────────────────────────────────── */
function HistoryDayCard({
  dateKey, dayCheckins, systems, isToday,
}: {
  dateKey: string;
  dayCheckins: Checkin[];
  systems: System[];
  isToday: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const done  = dayCheckins.filter(c => c.status === "done").length;
  const total = dayCheckins.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const label = isToday
    ? "Today"
    : dateKey === new Date(Date.now() - 86400000).toISOString().split("T")[0]
    ? "Yesterday"
    : format(parseISO(dateKey), "EEEE, MMMM d");

  return (
    <Card data-testid={`history-day-${dateKey}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{label}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{done}/{total} done</span>
            <Badge
              variant="outline"
              className={
                pct === 100 ? "text-chart-3 border-chart-3/30 bg-chart-3/10" :
                pct >= 50   ? "text-chart-4 border-chart-4/30 bg-chart-4/10" :
                "text-destructive border-destructive/30 bg-destructive/10"
              }
            >
              {pct}%
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1"
              onClick={() => setExpanded(e => !e)}
              data-testid={`button-history-view-${dateKey}`}
            >
              {expanded ? (
                <><ChevronUp className="w-3 h-3" /> Hide</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> View</>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="space-y-1.5">
          {dayCheckins.map(c => {
            const sys = systems.find(s => s.id === c.systemId);
            const cfg = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG];
            const Icon = cfg?.icon ?? Check;
            const moodEmojiBefore = MOOD_EMOJIS.find(m => m.value === c.moodBefore);
            const moodEmojiAfter  = MOOD_EMOJIS.find(m => m.value === c.moodAfter);
            return (
              <div
                key={c.id}
                className={cn(
                  "flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0",
                  expanded && "pb-3",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{sys?.title ?? "Unknown system"}</p>

                  {!expanded && c.note && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic">"{c.note}"</p>
                  )}

                  {expanded && (
                    <div className="mt-2 space-y-2">
                      {c.note && (
                        <div className="bg-muted/40 rounded-md px-3 py-2">
                          <p className="text-xs text-muted-foreground font-medium mb-0.5">Note</p>
                          <p className="text-xs leading-relaxed">{c.note}</p>
                        </div>
                      )}
                      {(c.moodBefore || c.moodAfter || c.difficulty) && (
                        <div className="grid grid-cols-3 gap-2">
                          {c.moodBefore != null && (
                            <div className="bg-muted/30 rounded-md px-2 py-1.5 text-center">
                              <p className="text-base">{moodEmojiBefore?.emoji ?? "—"}</p>
                              <p className="text-[10px] text-muted-foreground">Before</p>
                            </div>
                          )}
                          {c.moodAfter != null && (
                            <div className="bg-muted/30 rounded-md px-2 py-1.5 text-center">
                              <p className="text-base">{moodEmojiAfter?.emoji ?? "—"}</p>
                              <p className="text-[10px] text-muted-foreground">After</p>
                            </div>
                          )}
                          {c.difficulty != null && (
                            <div className="bg-muted/30 rounded-md px-2 py-1.5 text-center">
                              <p className="text-base font-bold">{c.difficulty}/5</p>
                              <p className="text-[10px] text-muted-foreground">Difficulty</p>
                            </div>
                          )}
                        </div>
                      )}
                      {!c.note && !c.moodBefore && !c.moodAfter && !c.difficulty && (
                        <p className="text-xs text-muted-foreground italic">No note or mood recorded.</p>
                      )}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className={`text-xs flex-shrink-0 ${cfg?.bg ?? ""}`}>
                  <Icon className="w-3 h-3 mr-1" />
                  {cfg?.label ?? c.status}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Checkin Consistency Banner (Hype Drop) ────────────────────── */
function CheckinConsistencyBanner({
  bestStreak, activeSystems, yesterdayCheckins,
}: {
  bestStreak: number;
  activeSystems: System[];
  yesterdayCheckins: Checkin[];
}) {
  const dismissedKey = `checkin-hype-drop-dismissed-${Math.floor(bestStreak / 7)}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(dismissedKey) === "true"; } catch { return false; }
  });

  const hadStreakBreak = activeSystems.some(s =>
    yesterdayCheckins.find(c => c.systemId === s.id)?.status === "skipped"
  );

  if (dismissed || bestStreak < 1) return null;

  const dismiss = () => {
    try { localStorage.setItem(dismissedKey, "true"); } catch {}
    setDismissed(true);
  };

  const topSystem = activeSystems[0];

  if (hadStreakBreak) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-chart-2/8 border border-chart-2/20" data-testid="checkin-hype-drop-streak-break">
        <span className="text-lg flex-shrink-0">💪</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-1">Streaks break. Systems don't.</p>
          <p className="text-xs text-muted-foreground mb-2">What's your minimum action today? One rep counts. One page counts. One minute counts.</p>
          {topSystem?.minimumAction && (
            <p className="text-xs font-medium text-foreground bg-background/50 rounded px-2 py-1 inline-block">
              Your minimum: {topSystem.minimumAction}
            </p>
          )}
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0" aria-label="Dismiss">×</button>
      </div>
    );
  }

  if (bestStreak >= 1 && bestStreak <= 7) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-chart-3/8 border border-chart-3/20" data-testid="checkin-hype-drop-early">
        <span className="text-lg flex-shrink-0">🚀</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-0.5">Building momentum! Day {bestStreak}.</p>
          <p className="text-xs text-muted-foreground">The first week is the hardest. Your system is doing the heavy lifting — not your motivation. Keep going!</p>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0" aria-label="Dismiss">×</button>
      </div>
    );
  }

  if (bestStreak >= 8 && bestStreak <= 21) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-chart-4/8 border border-chart-4/25" data-testid="checkin-hype-drop-warning">
        <span className="text-lg flex-shrink-0">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-chart-4 mb-1">Week 2–3 Alert: Hype Drop Zone</p>
          <p className="text-xs text-muted-foreground mb-2">Motivation naturally drops here. This is normal — your SYSTEM carries you, not your mood. Keep your minimum action going!</p>
          {topSystem?.minimumAction && (
            <p className="text-xs font-medium text-foreground bg-background/50 rounded px-2 py-1 inline-block">
              Minimum action: {topSystem.minimumAction}
            </p>
          )}
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0" aria-label="Dismiss">×</button>
      </div>
    );
  }

  if (bestStreak >= 22 && bestStreak <= 65) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/8 border border-primary/20" data-testid="checkin-hype-drop-zone">
        <span className="text-lg flex-shrink-0">🧠</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-0.5">You're in the habit-building zone.</p>
          <p className="text-xs text-muted-foreground">Science says 66 days builds automaticity — you're on day {bestStreak}. Your brain is rewiring itself. Stay consistent.</p>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0" aria-label="Dismiss">×</button>
      </div>
    );
  }

  return null;
}

/* ─── Calendar view ─────────────────────────────────────────────── */
function CalendarView({ allCheckins, systems }: { allCheckins: Checkin[]; systems: System[] }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const activeSystems = systems.filter(s => s.active);

  const monthStart  = startOfMonth(viewDate);
  const daysInMonth = getDaysInMonth(viewDate);
  const startDow    = getDay(monthStart);

  const { globalChain, lastGlobalChain, chainDateSet } = useMemo(() => {
    const chainDateSet = new Set<string>();
    let globalChain = 0;
    let lastGlobalChain = 0;
    let finishedCurrentChain = false;
    const todayStr = new Date().toISOString().split("T")[0];
    for (let i = 0; i < 120; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const dayC = allCheckins.filter(c => c.dateKey === dateKey);
      const hasDone = dayC.some(c => c.status === "done" || c.status === "partial");
      if (!finishedCurrentChain) {
        if (hasDone) {
          globalChain++;
          chainDateSet.add(dateKey);
        } else if (dateKey === todayStr) {
          continue;
        } else {
          finishedCurrentChain = true;
        }
      } else {
        if (hasDone) lastGlobalChain++;
        else break;
      }
    }
    return { globalChain, lastGlobalChain, chainDateSet };
  }, [allCheckins]);

  const dayMap = useMemo(() => {
    const map: Record<string, { done: number; total: number; status: string }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj  = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
      const dateKey  = dateObj.toISOString().split("T")[0];
      const dayC     = allCheckins.filter(c => c.dateKey === dateKey);
      const done     = dayC.filter(c => c.status === "done").length;
      const total    = activeSystems.length;
      let status = "empty";
      if (dayC.length > 0) {
        if (done === total && total > 0) status = "perfect";
        else if (done > 0) status = "partial";
        else status = "missed";
      }
      map[dateKey] = { done, total, status };
    }
    return map;
  }, [allCheckins, activeSystems, viewDate, daysInMonth]);

  const today      = getTodayKey();
  const todayDate  = new Date();
  const prevMonth  = () => setViewDate(d => subMonths(d, 1));
  const nextMonth  = () => setViewDate(d => {
    const next = addMonths(d, 1);
    if (next > todayDate) return d;
    return next;
  });
  const canGoNext = addMonths(viewDate, 1) <= todayDate;

  const cellColor = (status: string) => {
    switch (status) {
      case "perfect": return "bg-chart-3/80 text-white";
      case "partial": return "bg-chart-4/60 text-white";
      case "missed":  return "bg-destructive/30 text-destructive-foreground";
      default:        return "bg-muted/30 text-muted-foreground";
    }
  };

  const blanks = Array.from({ length: startDow });
  const days   = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-3">
      {globalChain > 0 ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/25" data-testid="chain-calendar-active-banner">
          <span className="text-xl">🔗</span>
          <div>
            <p className="text-sm font-bold text-primary">Your chain: {globalChain} day{globalChain !== 1 ? "s" : ""}. Don't break it!</p>
            <p className="text-xs text-muted-foreground">Every day you show up strengthens the chain.</p>
          </div>
        </div>
      ) : lastGlobalChain > 0 ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-chart-4/10 border border-chart-4/25" data-testid="chain-calendar-broken-banner">
          <span className="text-xl">⛓️</span>
          <div>
            <p className="text-sm font-bold text-chart-4">Chain broken at {lastGlobalChain} day{lastGlobalChain !== 1 ? "s" : ""} — Start a new one today!</p>
            <p className="text-xs text-muted-foreground">Streaks break. Systems don't. Log today to begin again.</p>
          </div>
        </div>
      ) : null}
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-muted transition-colors text-sm">
            ←
          </button>
          <h3 className="text-sm font-semibold">{format(viewDate, "MMMM yyyy")}</h3>
          <button
            onClick={nextMonth}
            disabled={!canGoNext}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-sm disabled:opacity-30"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1" data-testid="calendar-grid">
          {blanks.map((_, i) => <div key={`blank-${i}`} />)}
          {days.map(d => {
            const dateObj  = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
            const dateKey  = dateObj.toISOString().split("T")[0];
            const isFuture = dateKey > today;
            const isToday  = dateKey === today;
            const info     = dayMap[dateKey];
            return (
              <div
                key={dateKey}
                title={info && info.status !== "empty" ? `${info.done}/${info.total} done` : undefined}
                className={cn(
                  "aspect-square flex items-center justify-center rounded-md text-xs font-medium transition-all",
                  isFuture
                    ? "opacity-20 text-muted-foreground"
                    : info
                    ? cellColor(info.status)
                    : "bg-muted/20 text-muted-foreground",
                  isToday && "ring-2 ring-primary ring-offset-1",
                  !isToday && chainDateSet.has(dateKey) && "ring-1 ring-primary/60",
                )}
                data-testid={`calendar-day-${dateKey}`}
              >
                {d}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50 flex-wrap">
          {[
            { label: "Perfect", color: "bg-chart-3/80" },
            { label: "Partial", color: "bg-chart-4/60" },
            { label: "Missed",  color: "bg-destructive/30" },
            { label: "No data", color: "bg-muted/30" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={cn("w-3 h-3 rounded-sm", item.color)} />
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>

        {(() => {
          const monthCheckins = allCheckins.filter(c => c.dateKey.startsWith(format(viewDate, "yyyy-MM")));
          const perfectDays   = Object.values(dayMap).filter(d => d.status === "perfect").length;
          const partialDays   = Object.values(dayMap).filter(d => d.status === "partial").length;
          const missedDays    = Object.values(dayMap).filter(d => d.status === "missed").length;
          if (monthCheckins.length === 0) return null;
          return (
            <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-base font-bold text-chart-3">{perfectDays}</p>
                <p className="text-[10px] text-muted-foreground">Perfect days</p>
              </div>
              <div>
                <p className="text-base font-bold text-chart-4">{partialDays}</p>
                <p className="text-[10px] text-muted-foreground">Partial days</p>
              </div>
              <div>
                <p className="text-base font-bold text-muted-foreground">{missedDays}</p>
                <p className="text-[10px] text-muted-foreground">Missed days</p>
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
    </div>
  );
}

/* ─── History view ──────────────────────────────────────────────── */
function HistoryView({ allCheckins, systems }: { allCheckins: Checkin[]; systems: System[] }) {
  const grouped = useMemo(() => {
    const map: Record<string, Checkin[]> = {};
    for (const c of allCheckins) {
      if (!map[c.dateKey]) map[c.dateKey] = [];
      map[c.dateKey].push(c);
    }
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 30);
  }, [allCheckins]);

  if (grouped.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <History className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-1">No check-in history yet</h3>
          <p className="text-muted-foreground text-sm">Check in for today to start building your history.</p>
        </CardContent>
      </Card>
    );
  }

  const today = getTodayKey();
  return (
    <div className="space-y-4">
      {grouped.map(([dateKey, dayCheckins]) => (
        <HistoryDayCard
          key={dateKey}
          dateKey={dateKey}
          dayCheckins={dayCheckins}
          systems={systems}
          isToday={dateKey === today}
        />
      ))}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────── */
export default function Checkins() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const today  = getTodayKey();

  const [showCelebration, setShowCelebration] = useState(false);
  const prevPerfect = useRef(false);

  const { data: systems = [], isLoading: systemsLoading } = useQuery<System[]>({
    queryKey: ["systems", userId],
    queryFn: () => getSystems(userId),
    enabled: !!userId,
  });

  const { data: todayCheckins = [], isLoading: todayLoading } = useQuery<Checkin[]>({
    queryKey: ["checkins-today", userId, today],
    queryFn: () => getCheckinsByDate(userId, today),
    enabled: !!userId,
  });

  const { data: allCheckins = [], isLoading: allLoading } = useQuery<Checkin[]>({
    queryKey: ["checkins", userId],
    queryFn: () => getCheckins(userId),
    enabled: !!userId,
  });

  const analytics     = useMemo(() => computeAnalytics(allCheckins, systems, []), [allCheckins, systems]);
  const activeSystems = systems.filter(s => s.active);
  const doneCount     = todayCheckins.filter(c => c.status === "done").length;
  const totalCount    = activeSystems.length;
  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const getCheckin    = (systemId: string) => todayCheckins.find(c => c.systemId === systemId);

  const bestStreak = useMemo(
    () => Math.max(0, ...Object.values(analytics.streaks).map(Number)),
    [analytics.streaks],
  );
  const yesterdayCheckins = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yk = d.toISOString().split("T")[0];
    return allCheckins.filter(c => c.dateKey === yk);
  }, [allCheckins]);

  /* Show celebration the moment we hit 100% */
  useEffect(() => {
    const isPerfect = completionPct === 100 && totalCount > 0;
    if (isPerfect && !prevPerfect.current) {
      setShowCelebration(true);
    }
    prevPerfect.current = isPerfect;
  }, [completionPct, totalCount]);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <CelebrationOverlay
        show={showCelebration}
        onDismiss={() => setShowCelebration(false)}
      />

      <div>
        <h1 className="text-2xl font-bold">Daily Check-ins</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      <Tabs defaultValue="today">
        <TabsList className="w-full">
          <TabsTrigger value="today" className="flex-1 gap-1.5" data-testid="tab-today">
            <CalendarDays className="w-3.5 h-3.5" />
            Today
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex-1 gap-1.5" data-testid="tab-calendar">
            <Grid3x3 className="w-3.5 h-3.5" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-1.5" data-testid="tab-history">
            <History className="w-3.5 h-3.5" />
            History
          </TabsTrigger>
        </TabsList>

        {/* ─── TODAY TAB ─── */}
        <TabsContent value="today" className="mt-6 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-chart-3" data-testid="metric-done-today">{doneCount}</p>
                <p className="text-xs text-muted-foreground">Done</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary" data-testid="metric-completion-pct">{completionPct}%</p>
                <p className="text-xs text-muted-foreground">Complete</p>
              </CardContent>
            </Card>
          </div>

          {/* Identity Statement banner */}
          {user?.identityStatement && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/8 border border-primary/20" data-testid="identity-banner">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-sm font-semibold text-foreground">
                Remember: You are a person who {user.identityStatement}.
              </p>
            </div>
          )}

          {/* Hype Drop Consistency Banner */}
          <CheckinConsistencyBanner
            bestStreak={bestStreak}
            activeSystems={activeSystems}
            yesterdayCheckins={yesterdayCheckins}
          />

          {/* Perfect day banner (inline, shown even after celebrating) */}
          {completionPct === 100 && totalCount > 0 && (
            <div className="p-4 rounded-xl gradient-brand text-white text-center" data-testid="banner-perfect-day">
              <Flame className="w-8 h-8 mx-auto mb-2" />
              <p className="font-bold text-lg">Perfect day!</p>
              <p className="text-white/80 text-sm">All systems done. Your streak is growing! 🔥</p>
            </div>
          )}

          {/* System cards */}
          {systemsLoading || todayLoading ? (
            <div
              className="space-y-4"
              aria-busy="true"
              aria-label="Loading today's habits"
            >
              <span className="sr-only" role="status">Loading today's habits, please wait…</span>
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
            </div>
          ) : activeSystems.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <CheckSquare className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">No active systems</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  A <strong>system</strong> is a simple, repeatable action tied to your goal.
                  Build your first one to start tracking your progress.
                </p>
                <Button asChild>
                  <a href="/systems/new" data-testid="button-go-build-system">Build a System</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeSystems.map(system => (
                <SystemCheckinCard
                  key={system.id}
                  system={system}
                  existingCheckin={getCheckin(system.id)}
                  userId={userId}
                  streakDays={analytics.streaks[system.id] ?? 0}
                  onPerfectDay={() => setShowCelebration(true)}
                  identityStatement={user?.identityStatement}
                  consistencyScore={analytics.consistencyScores[system.id]}
                  weeklyVotes={analytics.weeklyVotes[system.id]}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── CALENDAR TAB ─── */}
        <TabsContent value="calendar" className="mt-6">
          {allLoading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : (
            <CalendarView allCheckins={allCheckins} systems={systems} />
          )}
        </TabsContent>

        {/* ─── HISTORY TAB ─── */}
        <TabsContent value="history" className="mt-6">
          {allLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : (
            <HistoryView allCheckins={allCheckins} systems={systems} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
