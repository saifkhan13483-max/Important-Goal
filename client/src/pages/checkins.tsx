import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { track } from "@/lib/track";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/auth.store";
import type { System, Checkin } from "@/types/schema";
import { FutureSelfAudioPlayer, hasFutureSelfAudio } from "@/components/future-self-audio";
import { getSystems } from "@/services/systems.service";
import { getCheckinsByDate, getCheckins, upsertCheckin } from "@/services/checkins.service";
import { computeAnalytics } from "@/services/analytics.service";
import { computeAchievements } from "@/lib/achievements";
import { addNotification } from "@/services/notifications.service";
import { updateUser } from "@/services/user.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  CheckSquare, Check, Minus, X, Flame, MessageSquare,
  ChevronDown, ChevronUp, History, CalendarDays, Grid3x3, Trophy,
  ArrowRight, ClipboardList, Sparkles, RefreshCw, Zap, Target,
  ChevronLeft, ChevronRight, TrendingUp, Star, Award, Timer,
} from "lucide-react";
import { FocusTimer } from "@/components/focus-timer";
import { format, parseISO, startOfMonth, getDaysInMonth, getDay, subMonths, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

/* ─── Helpers ───────────────────────────────────────────────────── */
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/* ─── Circular Progress Ring ─────────────────────────────────────── */
function CircularProgress({ pct, size = 88 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="white" strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

/* ─── Confetti / Celebration overlay ───────────────────────────── */
const CONFETTI_COLORS = [
  "#a78bfa", "#818cf8", "#34d399", "#fbbf24", "#f472b6",
  "#60a5fa", "#fb923c", "#e879f9",
];

function CelebrationOverlay({ show, onDismiss }: { show: boolean; onDismiss: () => void }) {
  const particles = useRef(
    Array.from({ length: 60 }, (_, i) => ({
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
      const t = setTimeout(onDismiss, 5500);
      return () => clearTimeout(t);
    }
  }, [show, onDismiss]);

  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onDismiss}
      data-testid="celebration-overlay"
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: "absolute", top: -20, left: `${p.left}%`,
              width: p.size, height: p.shape === "rect" ? p.size * 0.45 : p.size,
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
        className="relative z-10 bg-background rounded-3xl p-8 text-center shadow-2xl max-w-xs w-full border border-primary/20"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-20 h-20 rounded-full gradient-brand flex items-center justify-center mx-auto mb-5 shadow-lg">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <p className="text-2xl font-extrabold mb-2">Perfect Day! 🔥</p>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Every system done. That consistency is how lasting change is built.
        </p>
        <Button className="w-full gradient-brand text-white border-0 font-semibold rounded-xl h-11" onClick={onDismiss} data-testid="button-close-celebration">
          <Sparkles className="w-4 h-4 mr-2" />
          Keep the momentum going!
        </Button>
        <p className="text-xs text-muted-foreground mt-3 cursor-pointer" onClick={onDismiss}>Tap anywhere to close</p>
      </div>
    </div>
  );
}

/* ─── Identity messages ─────────────────────────────────────────── */
const IDENTITY_MESSAGES = [
  (identity: string | null | undefined, _name: string, _streak: number) =>
    identity ? `${identity.charAt(0).toUpperCase() + identity.slice(1)}. You just proved it.` : `You showed up. You just proved it.`,
  (_identity: string | null | undefined) => `Every consistent person did exactly what you just did.`,
  (identity: string | null | undefined) =>
    identity ? `I AM a person who ${identity}. Today is evidence.` : `I AM consistent. Today is evidence.`,
  (_identity: string | null | undefined, name: string, streak: number) =>
    streak > 1 ? `You kept the ${name} system alive for ${streak} days. That's not luck — that's a system working.` : `Day one done. Every streak starts exactly here.`,
  () => `Even the minimum version counts. You chose to show up instead of opt out.`,
  (identity: string | null | undefined) =>
    identity ? `This is what it looks like to become someone who ${identity}.` : `This is what consistent people do. One day at a time.`,
];

/* ─── Celebration Ritual Modal ──────────────────────────────────── */
function CelebrationRitualModal({
  show, systemName, streakDays, identityStatement, onDismiss,
}: {
  show: boolean; systemName: string; streakDays: number;
  identityStatement?: string | null; onDismiss: () => void;
}) {
  const msgIndex = streakDays % IDENTITY_MESSAGES.length;
  const message = IDENTITY_MESSAGES[msgIndex](identityStatement, systemName, streakDays);

  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" data-testid="celebration-ritual-overlay">
      <div className="relative bg-background rounded-3xl p-6 sm:p-8 text-center shadow-2xl max-w-sm w-full border border-primary/20" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full bg-chart-3/15 border-2 border-chart-3/30 flex items-center justify-center mx-auto mb-4" style={{ animation: "bounce 1s infinite" }}>
          <span className="text-3xl">✅</span>
        </div>
        <div className="space-y-1 mb-5">
          <p className="text-2xl font-extrabold text-foreground">YOU DID IT!</p>
          <p className="text-primary font-semibold text-base leading-snug">{systemName}</p>
          <p className="text-muted-foreground text-sm">
            Day <span className="font-bold text-foreground text-xl">{streakDays}</span> Complete
          </p>
        </div>
        <div className="bg-primary/8 border border-primary/20 rounded-2xl p-4 mb-5">
          <p className="text-xs text-muted-foreground mb-1.5">Take 3 seconds to feel this:</p>
          <p className="text-sm font-bold text-primary leading-snug">"{message}"</p>
        </div>
        <Button className="w-full gradient-brand text-white border-0 font-semibold rounded-xl h-11" onClick={onDismiss} data-testid="button-dismiss-celebration-ritual">
          <Sparkles className="w-4 h-4 mr-2" />
          I felt it — keep going!
        </Button>
        <p className="text-xs text-muted-foreground mt-3 cursor-pointer hover:text-foreground transition-colors" onClick={onDismiss}>Tap to continue</p>
      </div>
    </div>
  );
}

/* ─── Recovery Flow Modal ───────────────────────────────────────── */
const MISS_REASONS = [
  { value: "low-energy",  label: "Low energy or overwhelmed", emoji: "😔", suggestion: "shrink" },
  { value: "forgot",      label: "I forgot",                  emoji: "💭", suggestion: "trigger" },
  { value: "no-time",     label: "No time",                   emoji: "⏱️", suggestion: "reduce" },
  { value: "travel",      label: "Travel or unusual day",     emoji: "✈️", suggestion: "maintenance" },
  { value: "sick",        label: "Sick or unwell",            emoji: "🤒", suggestion: "maintenance" },
  { value: "overwhelmed", label: "Emotionally overwhelmed",   emoji: "🌊", suggestion: "shrink" },
  { value: "other",       label: "Something else",            emoji: "💬", suggestion: "fallback" },
] as const;

type MissReason = typeof MISS_REASONS[number];

function RecoveryFlowModal({
  show, system, checkinStatus, onDismiss,
}: {
  show: boolean; system: System; checkinStatus: "skipped" | "partial";
  onDismiss: (intention?: string) => void;
}) {
  const { user } = useAppStore();
  const [step, setStep] = useState(0);
  const [missReason, setMissReason] = useState<MissReason | null>(null);
  const [intention, setIntention] = useState<string>("");
  const [customNote, setCustomNote] = useState("");

  useEffect(() => {
    if (show) { setStep(0); setMissReason(null); setIntention(""); setCustomNote(""); }
  }, [show]);

  if (!show) return null;

  const handleMissReason = (reason: MissReason) => { setMissReason(reason); setStep(2); };
  const handleFinish = () => {
    const finalIntention = intention === "custom" ? customNote : intention;
    onDismiss(finalIntention || undefined);
  };

  const totalSteps = checkinStatus === "partial" ? 2 : 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" data-testid="recovery-flow-overlay">
      <div className="relative bg-background rounded-3xl shadow-2xl max-w-sm w-full border max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {checkinStatus === "skipped" && hasFutureSelfAudio(user?.id ?? "", user?.futureAudioUrl) && (
          <div className="px-5 pt-5 pb-0">
            <FutureSelfAudioPlayer
              context="missedDay" firestoreUrl={user?.futureAudioUrl} userName={user?.name}
              playOnFirstVisit={user?.futureAudioPlayOnFirstVisit ?? true}
              playAfterMissed={user?.futureAudioPlayAfterMissed ?? true}
              autoplay={user?.futureAudioAutoplay ?? true}
              muted={user?.futureAudioMuted ?? false}
            />
          </div>
        )}
        <div className="p-5">
          {/* Progress dots */}
          <div className="flex gap-1.5 mb-5">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all duration-300", i <= step ? "bg-primary" : "bg-muted")} />
            ))}
          </div>

          {/* ── PARTIAL: step 0 ── */}
          {checkinStatus === "partial" && step === 0 && (
            <div className="space-y-4">
              <div className="text-5xl text-center">🟡</div>
              <p className="text-xl font-bold text-center">Partial is not failure.</p>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">You kept the system alive. That's the whole point.</p>
              {system.minimumAction && (
                <div className="bg-primary/8 border border-primary/20 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-primary mb-1">Your minimum action</p>
                  <p className="text-sm text-foreground">"{system.minimumAction}"</p>
                </div>
              )}
              <p className="text-sm font-medium text-center">Want to stay in minimum mode tomorrow?</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setIntention("Yes — keep it small tomorrow"); setStep(1); }}
                  className="p-3.5 rounded-2xl border hover:border-chart-3/50 hover:bg-chart-3/5 transition-all text-sm font-medium text-center"
                  data-testid="button-partial-minimum-mode">Yes, keep it small</button>
                <button onClick={() => { setIntention("Back to full action tomorrow"); setStep(1); }}
                  className="p-3.5 rounded-2xl border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium text-center"
                  data-testid="button-partial-back-to-full">No, full action</button>
              </div>
            </div>
          )}

          {/* ── PARTIAL: step 1 ── */}
          {checkinStatus === "partial" && step === 1 && (
            <div className="space-y-4 text-center">
              <div className="text-5xl">🔁</div>
              <p className="text-xl font-bold">System still alive.</p>
              <p className="text-sm text-muted-foreground leading-relaxed">It's paused, not broken. See you tomorrow.</p>
              {intention && (
                <div className="bg-primary/8 border border-primary/20 rounded-2xl p-4 text-left">
                  <p className="text-xs font-semibold text-primary mb-1">Tomorrow's plan:</p>
                  <p className="text-sm text-foreground">{intention}</p>
                </div>
              )}
              <Button className="w-full rounded-xl h-11" onClick={handleFinish} data-testid="button-recovery-finish">
                <RefreshCw className="w-4 h-4 mr-2" />See you tomorrow
              </Button>
            </div>
          )}

          {/* ── MISSED: step 0 — acknowledge ── */}
          {checkinStatus === "skipped" && step === 0 && (
            <div className="space-y-3">
              <p className="text-xl font-bold">It's paused, not broken.</p>
              <p className="text-sm text-muted-foreground leading-relaxed">What made today hard? Your answer helps the system adapt.</p>
              <div className="space-y-2 mt-1">
                {MISS_REASONS.map(reason => (
                  <button key={reason.value} onClick={() => handleMissReason(reason)}
                    className="w-full text-left p-3.5 rounded-2xl border hover:border-primary/40 hover:bg-primary/4 transition-all flex items-center gap-3 active:scale-[0.98]"
                    data-testid={`button-miss-reason-${reason.value}`}>
                    <span className="text-xl">{reason.emoji}</span>
                    <span className="text-sm font-medium">{reason.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── MISSED: step 2 — branched suggestion ── */}
          {checkinStatus === "skipped" && step === 2 && missReason && (
            <div className="space-y-4">
              {missReason.suggestion === "shrink" && (<>
                <p className="text-xl font-bold">Hard stretch detected.</p>
                <p className="text-sm text-muted-foreground leading-relaxed">The system adapts. For the next 3 days, only your minimum action counts. No streaks lost. Identity preserved.</p>
                {system.minimumAction && (
                  <div className="bg-primary/8 border border-primary/20 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-primary mb-1">Your minimum for the next 3 days:</p>
                    <p className="text-sm text-foreground font-medium">"{system.minimumAction}"</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground italic">Small is not cheating. Small is what makes the system survivable.</p>
                <Button className="w-full rounded-xl h-11" onClick={() => { setIntention("Minimum mode for 3 days"); setStep(3); }} data-testid="button-activate-shrink">
                  Shrink system for 3 days <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>)}
              {missReason.suggestion === "maintenance" && (<>
                <p className="text-xl font-bold">Maintenance mode makes sense.</p>
                <p className="text-sm text-muted-foreground leading-relaxed">Your identity stays intact. Streak loss is paused. For 3 days, only the minimum action counts.</p>
                {system.minimumAction && (
                  <div className="bg-chart-3/8 border border-chart-3/20 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-chart-3 mb-1">Minimum action (maintenance mode):</p>
                    <p className="text-sm text-foreground font-medium">"{system.minimumAction}"</p>
                  </div>
                )}
                <Button className="w-full rounded-xl h-11" onClick={() => { setIntention("Maintenance mode — minimum only for 3 days"); setStep(3); }} data-testid="button-activate-maintenance">
                  Activate maintenance mode <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>)}
              {missReason.suggestion === "trigger" && (<>
                <p className="text-xl font-bold">Let's improve the trigger.</p>
                <p className="text-sm text-muted-foreground leading-relaxed">The best habits attach to something you already do. What existing routine could this follow?</p>
                <Textarea placeholder="e.g. After I brush my teeth, I'll… / When I sit at my desk, I'll…"
                  value={customNote} onChange={e => setCustomNote(e.target.value)} rows={3} className="text-sm rounded-xl"
                  data-testid="input-recovery-trigger-note" autoFocus />
                <Button className="w-full rounded-xl h-11"
                  onClick={() => { setIntention(customNote.trim() ? `New trigger: ${customNote.trim()}` : "Improve my trigger"); setStep(3); }}
                  data-testid="button-recovery-trigger-next">
                  Set new trigger <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>)}
              {missReason.suggestion === "reduce" && (<>
                <p className="text-xl font-bold">Make tomorrow easier to start.</p>
                <p className="text-sm text-muted-foreground leading-relaxed">What's the absolute smallest version that still counts? Even 30 seconds is better than nothing.</p>
                {system.minimumAction && (
                  <div className="bg-muted/50 border border-border rounded-2xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Current minimum:</p>
                    <p className="text-sm text-foreground">"{system.minimumAction}"</p>
                  </div>
                )}
                <Textarea placeholder="e.g. Just open the app. Just stand up. Just pick up the book."
                  value={customNote} onChange={e => setCustomNote(e.target.value)} rows={2} className="text-sm rounded-xl"
                  data-testid="input-recovery-reduce-note" autoFocus />
                <Button className="w-full rounded-xl h-11"
                  onClick={() => { setIntention(customNote.trim() ? `Reduced minimum: ${customNote.trim()}` : "Start even smaller tomorrow"); setStep(3); }}
                  data-testid="button-recovery-reduce-next">
                  That's my new minimum <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>)}
              {missReason.suggestion === "fallback" && (<>
                <p className="text-xl font-bold">No worries — let's reset.</p>
                {system.fallbackPlan && (
                  <div className="bg-chart-4/8 border border-chart-4/20 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-chart-4 mb-1">Your recovery plan</p>
                    <p className="text-sm text-foreground leading-relaxed">{system.fallbackPlan}</p>
                  </div>
                )}
                {system.minimumAction && (
                  <div className="bg-primary/8 border border-primary/20 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-primary mb-1">Tomorrow, even this counts:</p>
                    <p className="text-sm text-foreground">"{system.minimumAction}"</p>
                  </div>
                )}
                {!system.fallbackPlan && !system.minimumAction && (
                  <p className="text-sm text-muted-foreground">Missing one day never derailed anyone. Tomorrow is a fresh start.</p>
                )}
                <Button className="w-full rounded-xl h-11" onClick={() => { setIntention("Back tomorrow — minimum action"); setStep(3); }} data-testid="button-recovery-fallback-next">
                  Got it — see you tomorrow <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>)}
            </div>
          )}

          {/* ── MISSED: step 3 — micro-commitment ── */}
          {checkinStatus === "skipped" && step === 3 && (
            <div className="space-y-4">
              <div className="text-5xl text-center">🎯</div>
              <p className="text-xl font-bold text-center">One commitment before you go.</p>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                Name the single thing you'll do tomorrow to restart. Make it so small it almost feels like cheating.
              </p>
              {intention && (
                <div className="bg-primary/8 border border-primary/20 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-primary mb-1">Your recovery plan:</p>
                  <p className="text-sm text-foreground">{intention}</p>
                </div>
              )}
              <Textarea placeholder="e.g. Tomorrow at 7am I'll do just 5 minutes of my habit — nothing more."
                value={customNote} onChange={e => setCustomNote(e.target.value)} rows={3} className="text-sm rounded-xl"
                data-testid="input-recovery-micro-commitment" autoFocus />
              <Button className="w-full rounded-xl h-11"
                onClick={() => { if (customNote.trim()) setIntention(customNote.trim()); handleFinish(); }}
                data-testid="button-recovery-finish">
                <RefreshCw className="w-4 h-4 mr-2" />I commit — see you tomorrow
              </Button>
              <button className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={handleFinish} data-testid="button-recovery-skip-commitment">Skip for now</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Mood emoji picker ─────────────────────────────────────────── */
const MOOD_EMOJIS = [
  { value: 1, emoji: "😞", label: "Rough" },
  { value: 2, emoji: "😔", label: "Low"   },
  { value: 3, emoji: "😐", label: "Okay"  },
  { value: 4, emoji: "😊", label: "Good"  },
  { value: 5, emoji: "😄", label: "Great" },
];

function MoodEmojiPicker({ label, value, onChange, testPrefix }: {
  label: string; value: number | null | undefined;
  onChange: (v: number) => void; testPrefix: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <div className="flex gap-1.5">
        {MOOD_EMOJIS.map(m => (
          <button key={m.value} type="button" onClick={() => onChange(m.value)}
            data-testid={`${testPrefix}-${m.value}`} title={m.label}
            className={cn(
              "flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all flex-1 min-h-[52px]",
              value === m.value ? "border-primary bg-primary/10 scale-110 shadow-sm" : "border-border bg-muted/30 hover:border-primary/40 hover:scale-105"
            )}>
            <span className="text-xl leading-none">{m.emoji}</span>
            <span className="text-[9px] text-muted-foreground font-medium">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Difficulty rating row ─────────────────────────────────────── */
function RatingRow({ label, value, onChange }: { label: string; value: number | null | undefined; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</span>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={cn(
              "w-8 h-8 rounded-lg text-xs font-bold border transition-all",
              value === n ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-muted/40 border-border text-muted-foreground hover:border-primary/50"
            )}
            data-testid={`rating-${label.toLowerCase().replace(/ /g, "-")}-${n}`}>{n}</button>
        ))}
      </div>
    </div>
  );
}

/* ─── Streak milestone set ──────────────────────────────────────── */
const STREAK_MILESTONES = new Set([7, 14, 21, 30, 50, 66, 100]);

/* ─── Status config ─────────────────────────────────────────────── */
const STATUS_CONFIG = {
  done:    { label: "Done",    icon: Check, color: "text-chart-3",    bg: "bg-chart-3/10 border-chart-3/20",         activeBg: "bg-chart-3 text-white border-chart-3" },
  partial: { label: "Partial", icon: Minus, color: "text-chart-4",    bg: "bg-chart-4/10 border-chart-4/20",         activeBg: "bg-chart-4 text-white border-chart-4" },
  missed:  { label: "Missed",  icon: X,     color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", activeBg: "bg-destructive text-white border-destructive" },
};

/* ─── Individual check-in card ──────────────────────────────────── */
function SystemCheckinCard({
  system, existingCheckin, userId, streakDays, onPerfectDay, identityStatement,
  consistencyScore, weeklyVotes, onDone,
}: {
  system: System; existingCheckin?: Checkin; userId: string; streakDays: number;
  onPerfectDay?: () => void; identityStatement?: string | null;
  consistencyScore?: number; weeklyVotes?: number; onDone?: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const today = getTodayKey();

  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(existingCheckin?.note || "");
  const [moodBefore, setMoodBefore] = useState<number | null>(existingCheckin?.moodBefore ?? null);
  const [moodAfter, setMoodAfter] = useState<number | null>(existingCheckin?.moodAfter ?? null);
  const [difficulty, setDifficulty] = useState<number | null>(existingCheckin?.difficulty ?? null);
  const [justDone, setJustDone] = useState(false);
  const [showRitual, setShowRitual] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<"skipped" | "partial">("skipped");
  const pulseDoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = existingCheckin?.status as keyof typeof STATUS_CONFIG | undefined;

  const checkInMutation = useMutation({
    mutationFn: (status: string) =>
      upsertCheckin(userId, system.id, today, {
        status, note: note || undefined,
        moodBefore: moodBefore ?? undefined,
        moodAfter: moodAfter ?? undefined,
        difficulty: difficulty ?? undefined,
      }),
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ["checkins", userId, today] });
      qc.invalidateQueries({ queryKey: ["checkins", userId] });
      if (status === "done") { track("checkin_completed", { status: "done" }); }
      else if (status === "missed") { track("checkin_missed"); }
      if (status === "done") {
        localStorage.removeItem("strivo_missed_yesterday");
        if (pulseDoneTimer.current) clearTimeout(pulseDoneTimer.current);
        setJustDone(true);
        pulseDoneTimer.current = setTimeout(() => setJustDone(false), 600);
        setShowRitual(true);
        onDone?.();
      } else if (status === "skipped" || status === "partial") {
        localStorage.setItem("strivo_missed_yesterday", "true");
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
        status: current, note: note || undefined,
        moodBefore: moodBefore ?? undefined,
        moodAfter: moodAfter ?? undefined,
        difficulty: difficulty ?? undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkins", userId, today] });
      qc.invalidateQueries({ queryKey: ["checkins", userId] });
      toast({ title: "Note & ratings saved." });
    },
    onError: (err: any) => {
      if ((err as Error).message === "no-status") {
        toast({ title: "Pick a status first", description: "Tap Done, Partial, or Missed — then your note will save together.", variant: "destructive" });
      } else {
        toast({ title: "Couldn't save", description: err?.message ?? "Please try again.", variant: "destructive" });
      }
    },
  });

  const statusBarColor = current === "done" ? "bg-chart-3" : current === "partial" ? "bg-chart-4" : current === "missed" ? "bg-destructive" : "bg-transparent";

  return (
    <Card
      className={cn(
        "transition-all border overflow-hidden",
        current === "done" ? "ring-1 ring-chart-3/30 bg-chart-3/3" : "",
        current === "missed" ? "border-destructive/20" : "",
        justDone ? "animate-pulse-success" : "",
      )}
      data-testid={`checkin-card-${system.id}`}
    >
      {/* Status bar on top */}
      <div className={cn("h-1 w-full transition-all duration-500", statusBarColor)} />

      <CardContent className="p-4 sm:p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-semibold text-sm leading-tight">{system.title}</p>
              {streakDays > 0 && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-chart-4 text-xs font-bold bg-chart-4/10 rounded-full px-2 py-0.5",
                    STREAK_MILESTONES.has(streakDays) ? "animate-glow-pulse" : "",
                  )}
                  data-testid={`streak-badge-${system.id}`}
                >
                  <Flame className="w-3 h-3" />
                  {streakDays}d
                  {STREAK_MILESTONES.has(streakDays) && (
                    <Trophy className="w-3 h-3 ml-0.5 text-chart-4" aria-label="Streak milestone!" />
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {weeklyVotes !== undefined && (
                <span className="text-[10px] text-muted-foreground" title="Days done this week" data-testid={`weekly-votes-${system.id}`}>
                  {weeklyVotes}/7 this wk
                </span>
              )}
              {consistencyScore !== undefined && consistencyScore > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                    consistencyScore >= 70 ? "bg-chart-3/15 text-chart-3" :
                    consistencyScore >= 40 ? "bg-chart-4/15 text-chart-4" :
                    "bg-muted text-muted-foreground"
                  )}
                  title="Consistency over last 30 days"
                  data-testid={`consistency-score-${system.id}`}
                >
                  {consistencyScore}% consistent
                </span>
              )}
            </div>
            {system.triggerStatement && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{system.triggerStatement}</p>
            )}
          </div>
          {current && (
            <Badge variant="outline" className={cn("text-xs flex-shrink-0 gap-1 rounded-full", STATUS_CONFIG[current]?.bg)}>
              {(() => { const Icon = STATUS_CONFIG[current]?.icon; return Icon ? <Icon className="w-3 h-3" /> : null; })()}
              {STATUS_CONFIG[current]?.label}
            </Badge>
          )}
        </div>

        {/* Minimum action */}
        {system.minimumAction && (
          <div className="bg-muted/50 border border-border/60 rounded-xl px-3 py-2.5 mb-3 flex items-start gap-2">
            <Target className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">Today's minimum action</p>
              <p className="text-xs leading-relaxed">{system.minimumAction}</p>
            </div>
          </div>
        )}

        {/* Status buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="grid grid-cols-3 gap-2 flex-1">
            {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map(status => {
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              const isSelected = current === status;
              return (
                <button
                  key={status}
                  onClick={() => checkInMutation.mutate(status)}
                  disabled={checkInMutation.isPending}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-semibold transition-all active:scale-95",
                    isSelected ? cfg.activeBg : "bg-background border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    checkInMutation.isPending && "opacity-50 cursor-not-allowed",
                  )}
                  data-testid={`button-checkin-${status}-${system.id}`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setShowNote(n => !n)}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-medium transition-all sm:w-auto active:scale-95",
              showNote ? "bg-muted border-primary/30 text-foreground" : "bg-background border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            )}
            data-testid={`button-checkin-note-${system.id}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Note</span>
            {showNote ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Note + mood panel */}
        {showNote && (
          <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
            {!current && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  <strong>Tap Done, Partial, or Missed first</strong> — your note and mood will be saved together.
                </p>
              </div>
            )}
            <div className="space-y-3">
              <MoodEmojiPicker label="How were you feeling before?" value={moodBefore} onChange={setMoodBefore} testPrefix={`mood-before-${system.id}`} />
              <MoodEmojiPicker label="How do you feel now?" value={moodAfter} onChange={setMoodAfter} testPrefix={`mood-after-${system.id}`} />
            </div>
            <RatingRow label="Difficulty" value={difficulty} onChange={setDifficulty} />
            <Textarea placeholder="How did it go? What did you notice?" value={note} onChange={e => setNote(e.target.value)} rows={2} className="text-sm rounded-xl" data-testid={`input-checkin-note-${system.id}`} />
            {current ? (
              <Button size="sm" variant="outline" onClick={() => saveNotesMutation.mutate()} disabled={saveNotesMutation.isPending} className="rounded-xl" data-testid={`button-save-note-${system.id}`}>
                {saveNotesMutation.isPending ? "Saving…" : "Save note & mood"}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Your note & mood will be saved automatically when you tap Done, Partial, or Missed.</p>
            )}
          </div>
        )}

        {/* Fallback plan when missed */}
        {current === "missed" && system.fallbackPlan && (
          <div className="mt-3 p-3 rounded-xl bg-chart-4/8 border border-chart-4/20">
            <p className="text-xs font-semibold text-chart-4 mb-1">Your fallback plan</p>
            <p className="text-xs text-foreground leading-relaxed">{system.fallbackPlan}</p>
          </div>
        )}
      </CardContent>

      <CelebrationRitualModal show={showRitual} systemName={system.title} streakDays={streakDays + 1}
        identityStatement={identityStatement} onDismiss={() => { setShowRitual(false); onPerfectDay?.(); }} />
      <RecoveryFlowModal show={showRecovery} system={system} checkinStatus={recoveryStatus}
        onDismiss={() => setShowRecovery(false)} />
    </Card>
  );
}

/* ─── Checkin Consistency Banner ─────────────────────────────────── */
function CheckinConsistencyBanner({ bestStreak, activeSystems, yesterdayCheckins }: {
  bestStreak: number; activeSystems: System[]; yesterdayCheckins: Checkin[];
}) {
  const dismissedKey = `checkin-hype-drop-dismissed-${Math.floor(bestStreak / 7)}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(dismissedKey) === "true"; } catch { return false; }
  });

  const hadStreakBreak = activeSystems.some(s =>
    yesterdayCheckins.find(c => c.systemId === s.id)?.status === "skipped"
  );

  if (dismissed || bestStreak < 1) return null;
  const dismiss = () => { try { localStorage.setItem(dismissedKey, "true"); } catch {} setDismissed(true); };
  const topSystem = activeSystems[0];

  if (hadStreakBreak) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-chart-2/8 border border-chart-2/20" data-testid="checkin-hype-drop-streak-break">
        <span className="text-lg flex-shrink-0">💪</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-0.5">Streaks break. Systems don't.</p>
          <p className="text-xs text-muted-foreground mb-2">What's your minimum action today? One rep counts. One page counts. One minute counts.</p>
          {topSystem?.minimumAction && (
            <p className="text-xs font-medium text-foreground bg-background/50 rounded-lg px-2.5 py-1.5 inline-block">
              Your minimum: {topSystem.minimumAction}
            </p>
          )}
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0 text-xl leading-none" aria-label="Dismiss">×</button>
      </div>
    );
  }

  if (bestStreak >= 1 && bestStreak <= 7) return (
    <div className="flex items-start gap-3 p-4 rounded-2xl bg-chart-3/8 border border-chart-3/20" data-testid="checkin-hype-drop-early">
      <span className="text-lg flex-shrink-0">🚀</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold mb-0.5">Building momentum! Day {bestStreak}.</p>
        <p className="text-xs text-muted-foreground">The first week is the hardest. Your system is doing the heavy lifting — not your motivation.</p>
      </div>
      <button onClick={dismiss} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0 text-xl leading-none" aria-label="Dismiss">×</button>
    </div>
  );

  if (bestStreak >= 8 && bestStreak <= 21) return (
    <div className="flex items-start gap-3 p-4 rounded-2xl bg-chart-4/8 border border-chart-4/25" data-testid="checkin-hype-drop-warning">
      <span className="text-lg flex-shrink-0">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-chart-4 mb-0.5">Week 2–3 Alert: Hype Drop Zone</p>
        <p className="text-xs text-muted-foreground">Motivation naturally drops here. Your SYSTEM carries you, not your mood. Keep your minimum action going!</p>
      </div>
      <button onClick={dismiss} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0 text-xl leading-none" aria-label="Dismiss">×</button>
    </div>
  );

  if (bestStreak >= 22 && bestStreak <= 65) return (
    <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/8 border border-primary/20" data-testid="checkin-hype-drop-deep">
      <span className="text-lg flex-shrink-0">🔥</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary mb-0.5">Deep habit territory — {bestStreak} days!</p>
        <p className="text-xs text-muted-foreground">This is where the identity shift happens. You're not building the habit — the habit is building you.</p>
      </div>
      <button onClick={dismiss} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0 text-xl leading-none" aria-label="Dismiss">×</button>
    </div>
  );

  if (bestStreak >= 66) return (
    <div className="flex items-start gap-3 p-4 rounded-2xl gradient-brand text-white" data-testid="checkin-hype-drop-elite">
      <span className="text-lg flex-shrink-0">🏆</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold mb-0.5">Elite territory. {bestStreak} days of showing up.</p>
        <p className="text-xs text-white/80">Scientists say 66 days makes a habit. You've crossed the line. This is who you are now.</p>
      </div>
      <button onClick={dismiss} className="text-white/70 hover:text-white p-1 flex-shrink-0 text-xl leading-none" aria-label="Dismiss">×</button>
    </div>
  );

  return null;
}

/* ─── Calendar View ─────────────────────────────────────────────── */
function CalendarView({ allCheckins, systems }: { allCheckins: Checkin[]; systems: System[] }) {
  const activeSystems = systems.filter(s => s.active);
  const [viewDate, setViewDate] = useState(new Date());
  const monthStart  = startOfMonth(viewDate);
  const daysInMonth = getDaysInMonth(viewDate);
  const startDow    = getDay(monthStart);

  const { globalChain, lastGlobalChain, chainDateSet } = useMemo(() => {
    const chainDateSet = new Set<string>();
    let globalChain = 0, lastGlobalChain = 0;
    let finishedCurrentChain = false;
    const todayStr = getTodayKey();
    for (let i = 0; i < 120; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateKey = toLocalDateKey(d);
      const dayC = allCheckins.filter(c => c.dateKey === dateKey);
      const hasDone = dayC.some(c => c.status === "done" || c.status === "partial");
      if (!finishedCurrentChain) {
        if (hasDone) { globalChain++; chainDateSet.add(dateKey); }
        else if (dateKey === todayStr) { continue; }
        else { finishedCurrentChain = true; }
      } else {
        if (hasDone) lastGlobalChain++;
        else break;
      }
    }
    return { globalChain, lastGlobalChain, chainDateSet };
  }, [allCheckins]);

  const dayMap = useMemo(() => {
    const map: Record<string, { done: number; total: number; status: string }> = {};
    const activeSystemIds = new Set(activeSystems.map(s => s.id));
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayC = allCheckins.filter(c => c.dateKey === dateKey && activeSystemIds.has(c.systemId));
      const done = dayC.filter(c => c.status === "done").length;
      const partial = dayC.filter(c => c.status === "partial").length;
      const total = activeSystems.length;
      let status = "empty";
      if (dayC.length > 0) {
        if (done === total && total > 0) status = "perfect";
        else if (done > 0 || partial > 0) status = "partial";
        else status = "missed";
      }
      map[dateKey] = { done, total, status };
    }
    return map;
  }, [allCheckins, activeSystems, viewDate, daysInMonth]);

  const today = getTodayKey();
  const todayDate = new Date();
  const prevMonth = () => setViewDate(d => subMonths(d, 1));
  const nextMonth = () => setViewDate(d => { const next = addMonths(d, 1); return next > todayDate ? d : next; });
  const canGoNext = addMonths(viewDate, 1) <= todayDate;

  const cellColor = (status: string) => {
    switch (status) {
      case "perfect": return "bg-chart-3 text-white";
      case "partial": return "bg-chart-4/80 text-white";
      case "missed":  return "bg-destructive/40 text-foreground";
      default:        return "bg-muted/30 text-muted-foreground";
    }
  };

  const blanks = Array.from({ length: startDow });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthCheckins = allCheckins.filter(c => c.dateKey.startsWith(format(viewDate, "yyyy-MM")));
  const perfectDays = Object.values(dayMap).filter(d => d.status === "perfect").length;
  const partialDays = Object.values(dayMap).filter(d => d.status === "partial").length;
  const missedDays  = Object.values(dayMap).filter(d => d.status === "missed").length;

  return (
    <div className="space-y-3">
      {/* Chain banners */}
      {globalChain > 0 ? (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-primary/10 border border-primary/25" data-testid="chain-calendar-active-banner">
          <span className="text-xl">🔗</span>
          <div>
            <p className="text-sm font-bold text-primary">Your chain: {globalChain} day{globalChain !== 1 ? "s" : ""}. Don't break it!</p>
            <p className="text-xs text-muted-foreground">Every day you show up strengthens the chain.</p>
          </div>
        </div>
      ) : lastGlobalChain > 0 ? (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-chart-4/10 border border-chart-4/25" data-testid="chain-calendar-broken-banner">
          <span className="text-xl">⛓️</span>
          <div>
            <p className="text-sm font-bold text-chart-4">Chain broken at {lastGlobalChain} day{lastGlobalChain !== 1 ? "s" : ""} — Start a new one today!</p>
            <p className="text-xs text-muted-foreground">Streaks break. Systems don't. Log today to begin again.</p>
          </div>
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Previous month">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold">{format(viewDate, "MMMM yyyy")}</h3>
            <button onClick={nextMonth} disabled={!canGoNext}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
              aria-label="Next month">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d.slice(0, 2)}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1" data-testid="calendar-grid">
            {blanks.map((_, i) => <div key={`blank-${i}`} />)}
            {days.map(d => {
              const dateKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const isFuture = dateKey > today;
              const isToday = dateKey === today;
              const info = dayMap[dateKey];
              return (
                <div key={dateKey} title={info && info.status !== "empty" ? `${info.done}/${info.total} done` : undefined}
                  className={cn(
                    "aspect-square flex items-center justify-center rounded-xl text-xs font-semibold transition-all select-none",
                    isFuture ? "opacity-20 text-muted-foreground" :
                    info ? cellColor(info.status) : "bg-muted/20 text-muted-foreground",
                    isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                    !isToday && chainDateSet.has(dateKey) && "ring-1 ring-primary/50",
                  )}
                  data-testid={`calendar-day-${dateKey}`}
                >
                  {d}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50 flex-wrap justify-center sm:justify-start">
            {[
              { label: "Perfect", color: "bg-chart-3" },
              { label: "Partial", color: "bg-chart-4/80" },
              { label: "Missed",  color: "bg-destructive/40" },
              { label: "No data", color: "bg-muted/30" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={cn("w-3 h-3 rounded-md", item.color)} />
                <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Month stats */}
          {monthCheckins.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-3 gap-3 text-center">
              {[
                { value: perfectDays, label: "Perfect",  color: "text-chart-3" },
                { value: partialDays, label: "Partial",  color: "text-chart-4" },
                { value: missedDays,  label: "Missed",   color: "text-muted-foreground" },
              ].map(s => (
                <div key={s.label} className="bg-muted/30 rounded-xl p-2">
                  <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{s.label} days</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── History day card ──────────────────────────────────────────── */
function HistoryDayCard({ dateKey, dayCheckins, systems, isToday }: {
  dateKey: string; dayCheckins: Checkin[]; systems: System[]; isToday: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const done  = dayCheckins.filter(c => c.status === "done").length;
  const total = dayCheckins.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const label = isToday ? "Today"
    : dateKey === new Date(Date.now() - 86400000).toISOString().split("T")[0] ? "Yesterday"
    : format(parseISO(dateKey), "EEE, MMM d");

  const barColor = pct === 100 ? "bg-chart-3" : pct >= 50 ? "bg-chart-4" : "bg-destructive/60";
  const badgeClass = pct === 100
    ? "text-chart-3 border-chart-3/30 bg-chart-3/10"
    : pct >= 50 ? "text-chart-4 border-chart-4/30 bg-chart-4/10"
    : "text-destructive border-destructive/30 bg-destructive/10";

  return (
    <Card data-testid={`history-day-${dateKey}`} className="overflow-hidden">
      {/* Color stripe */}
      <div className={cn("h-1 w-full", barColor)} style={{ width: `${pct}%`, minWidth: pct > 0 ? "4px" : "0" }} />
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", barColor)} />
            <div>
              <CardTitle className="text-sm font-semibold">{label}</CardTitle>
              <p className="text-[10px] text-muted-foreground">{format(parseISO(dateKey), "MMMM d, yyyy")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", badgeClass)}>{pct}%</Badge>
            <span className="text-xs text-muted-foreground">{done}/{total}</span>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 rounded-lg"
              onClick={() => setExpanded(e => !e)} data-testid={`button-history-view-${dateKey}`}>
              {expanded ? <><ChevronUp className="w-3 h-3" />Hide</> : <><ChevronDown className="w-3 h-3" />Details</>}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3 px-4">
        {/* Compact preview (always visible) */}
        {!expanded && (
          <div className="flex flex-wrap gap-1.5">
            {dayCheckins.map(c => {
              const sys = systems.find(s => s.id === c.systemId);
              const cfg = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG];
              const Icon = cfg?.icon ?? Check;
              return (
                <div key={c.id}
                  className={cn("flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg border", cfg?.bg ?? "bg-muted border-border text-muted-foreground")}>
                  <Icon className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate max-w-[100px]">{sys?.title ?? "Unknown"}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="space-y-2 mt-1">
            {dayCheckins.map(c => {
              const sys = systems.find(s => s.id === c.systemId);
              const cfg = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG];
              const Icon = cfg?.icon ?? Check;
              const moodEmojiBefore = MOOD_EMOJIS.find(m => m.value === c.moodBefore);
              const moodEmojiAfter  = MOOD_EMOJIS.find(m => m.value === c.moodAfter);
              return (
                <div key={c.id} className="p-3 rounded-xl bg-muted/30 border border-border/40">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold">{sys?.title ?? "Unknown system"}</p>
                    <Badge variant="outline" className={cn("text-[10px] gap-1 rounded-full", cfg?.bg ?? "")}>
                      <Icon className="w-2.5 h-2.5" />
                      {cfg?.label ?? c.status}
                    </Badge>
                  </div>
                  {c.note && (
                    <div className="bg-background rounded-lg px-3 py-2 mb-2">
                      <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Note</p>
                      <p className="text-xs leading-relaxed italic">"{c.note}"</p>
                    </div>
                  )}
                  {(c.moodBefore != null || c.moodAfter != null || c.difficulty != null) && (
                    <div className="flex gap-2">
                      {c.moodBefore != null && (
                        <div className="bg-background rounded-lg px-2.5 py-2 text-center flex-1">
                          <p className="text-base">{moodEmojiBefore?.emoji ?? "—"}</p>
                          <p className="text-[10px] text-muted-foreground">Before</p>
                        </div>
                      )}
                      {c.moodAfter != null && (
                        <div className="bg-background rounded-lg px-2.5 py-2 text-center flex-1">
                          <p className="text-base">{moodEmojiAfter?.emoji ?? "—"}</p>
                          <p className="text-[10px] text-muted-foreground">After</p>
                        </div>
                      )}
                      {c.difficulty != null && (
                        <div className="bg-background rounded-lg px-2.5 py-2 text-center flex-1">
                          <p className="text-sm font-bold">{c.difficulty}/5</p>
                          <p className="text-[10px] text-muted-foreground">Difficulty</p>
                        </div>
                      )}
                    </div>
                  )}
                  {!c.note && c.moodBefore == null && c.moodAfter == null && c.difficulty == null && (
                    <p className="text-[10px] text-muted-foreground italic">No note or mood recorded.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
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
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30);
  }, [allCheckins]);

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <History className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-semibold mb-1 text-base">No check-in history yet</h3>
        <p className="text-muted-foreground text-sm">Check in for today to start building your history.</p>
      </div>
    );
  }

  const today = getTodayKey();
  return (
    <div className="space-y-3">
      {grouped.map(([dateKey, dayCheckins]) => (
        <HistoryDayCard key={dateKey} dateKey={dateKey} dayCheckins={dayCheckins} systems={systems} isToday={dateKey === today} />
      ))}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────── */
export default function Checkins() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const today  = getTodayKey();
  const qcMain = useQueryClient();
  const { toast } = useToast();

  const [showCelebration, setShowCelebration] = useState(false);
  const [showFocusTimer, setShowFocusTimer] = useState(false);
  const prevPerfect = useRef(false);

  const { data: systems = [], isLoading: systemsLoading } = useQuery<System[]>({
    queryKey: ["systems", userId],
    queryFn: () => getSystems(userId),
    enabled: !!userId,
  });

  const { data: todayCheckins = [], isLoading: todayLoading } = useQuery<Checkin[]>({
    queryKey: ["checkins", userId, today],
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
  const partialCount  = todayCheckins.filter(c => c.status === "partial").length;
  const missedCount   = todayCheckins.filter(c => c.status === "missed" || c.status === "skipped").length;
  const totalCount    = activeSystems.length;
  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const getCheckin    = (systemId: string) => todayCheckins.find(c => c.systemId === systemId);

  const bestStreak = useMemo(
    () => Math.max(0, ...Object.values(analytics.streaks).map(Number)),
    [analytics.streaks]
  );

  const checkAndUnlockAchievements = useCallback(async () => {
    if (!userId || !user) return;
    try {
      const latestCheckins: Checkin[] = qcMain.getQueryData(["checkins", userId]) ?? allCheckins;
      const latestSystems: System[] = qcMain.getQueryData(["systems", userId]) ?? systems;
      const doneCheckins = latestCheckins.filter(c => c.status === "done");
      const activeSys = latestSystems.filter(s => s.active);
      const maxStreak = Math.max(0, ...Object.values(analytics.streaks).map(Number));
      const maxBestStreak = Math.max(0, ...Object.values(analytics.bestStreaks).map(Number));

      const doneByDay = new Set(doneCheckins.map(c => c.dateKey));
      let perfectDays = 0;
      if (activeSys.length > 0) {
        for (const dateKey of Array.from(doneByDay).sort().reverse().slice(0, 30)) {
          const dayDone = doneCheckins.filter(c => c.dateKey === dateKey).length;
          if (dayDone >= activeSys.length) perfectDays++;
          else break;
        }
      }

      const stats = {
        totalCheckins: latestCheckins.length,
        doneCheckins: doneCheckins.length,
        bestStreak: maxBestStreak,
        currentStreak: maxStreak,
        totalGoals: 0,
        completedGoals: 0,
        totalSystems: latestSystems.length,
        activeSystems: activeSys.length,
        totalJournalEntries: 0,
        totalDaysActive: doneByDay.size,
        referralCount: user.referralCount ?? 0,
        hasAccountabilityPartner: !!user.accountabilityPartnerId,
        consecutivePerfectDays: perfectDays,
        totalAchievements: (user.unlockedAchievements ?? []).length,
      };

      const { newlyUnlocked } = computeAchievements(stats, user.unlockedAchievements ?? []);
      if (newlyUnlocked.length === 0) return;

      const newIds = newlyUnlocked.map(a => a.id);
      const updatedIds = [...(user.unlockedAchievements ?? []), ...newIds];
      await updateUser(userId, { unlockedAchievements: updatedIds });
      qcMain.invalidateQueries({ queryKey: ["user"] });

      for (const achievement of newlyUnlocked) {
        await addNotification(userId, {
          type: "achievement",
          title: `Achievement unlocked: ${achievement.title}`,
          message: `${achievement.icon} ${achievement.description}`,
          href: "/achievements",
        });
        toast({
          title: `🏆 Achievement Unlocked!`,
          description: `${achievement.icon} ${achievement.title} — ${achievement.description}`,
        });
      }
      qcMain.invalidateQueries({ queryKey: ["notifications", userId] });
    } catch {
      // silent — don't interrupt the user experience
    }
  }, [userId, user, allCheckins, systems, analytics, qcMain, toast]);

  const yesterdayCheckins = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return allCheckins.filter(c => c.dateKey === toLocalDateKey(d));
  }, [allCheckins]);

  useEffect(() => {
    const isPerfect = completionPct === 100 && totalCount > 0;
    if (isPerfect && !prevPerfect.current) setShowCelebration(true);
    prevPerfect.current = isPerfect;
  }, [completionPct, totalCount]);

  const isLoading = systemsLoading || todayLoading;

  return (
    <div className="min-h-screen bg-background">
      <CelebrationOverlay show={showCelebration} onDismiss={() => setShowCelebration(false)} />

      {/* Focus Timer dialog */}
      <FocusTimer open={showFocusTimer} onClose={() => setShowFocusTimer(false)} />

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden gradient-brand text-white">
        {/* Decorative blobs */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10 bg-white rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 opacity-8 bg-white rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative px-4 sm:px-6 py-6 sm:py-8 max-w-2xl mx-auto">
          {/* Top row: title + circular progress */}
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CheckSquare className="w-4 h-4 text-white/70 flex-shrink-0" />
                <p className="text-white/70 text-xs font-medium tracking-wide uppercase">Daily Check-ins</p>
                <button
                  onClick={() => setShowFocusTimer(v => !v)}
                  title="Focus Timer"
                  data-testid="button-focus-timer-toggle"
                  className="ml-1 flex items-center gap-1 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-2 py-0.5 text-[10px] font-medium transition-all"
                >
                  <Timer className="w-3 h-3" />
                  Focus
                </button>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight truncate">
                {format(new Date(), "EEEE")}
              </h1>
              <p className="text-white/60 text-xs sm:text-sm mt-0.5">
                {format(new Date(), "MMMM d, yyyy")}
              </p>
            </div>

            {/* Circular progress */}
            {totalCount > 0 && !isLoading && (
              <div className="relative flex-shrink-0" aria-label={`${completionPct}% complete`}>
                <CircularProgress pct={completionPct} size={80} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-xl font-extrabold text-white leading-none" data-testid="metric-completion-pct">{completionPct}<span className="text-sm">%</span></p>
                  <p className="text-white/60 text-[9px] font-medium">Done</p>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {totalCount > 0 && !isLoading && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-white/70 text-xs">{doneCount} of {totalCount} systems done</p>
                {partialCount > 0 && <p className="text-white/60 text-xs">{partialCount} partial</p>}
              </div>
              <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-700 ease-out" style={{ width: `${completionPct}%` }} />
              </div>
            </div>
          )}

          {/* Stats row */}
          {!systemsLoading && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: "Done Today",  value: doneCount,        icon: Check,    testId: "metric-done-today" },
                { label: "Systems",     value: totalCount,        icon: Zap,      testId: "metric-systems" },
                { label: "Best Streak", value: `${bestStreak}d`,  icon: Flame,    testId: "metric-best-streak" },
              ].map(stat => (
                <div key={stat.label} className="bg-white/12 rounded-2xl p-3 backdrop-blur-sm border border-white/15 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <stat.icon className="w-3 h-3 text-white/60" />
                    <p className="text-white/60 text-[10px] sm:text-xs font-medium leading-none">{stat.label}</p>
                  </div>
                  <p className="text-xl sm:text-2xl font-extrabold text-white leading-none" data-testid={stat.testId}>{stat.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="px-4 sm:px-6 py-5 max-w-2xl mx-auto">
        <Tabs defaultValue="today">
          <TabsList className="w-full mb-5 h-11 rounded-2xl p-1">
            <TabsTrigger value="today" className="flex-1 gap-1.5 rounded-xl text-xs sm:text-sm h-full" data-testid="tab-today">
              <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Today</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1 gap-1.5 rounded-xl text-xs sm:text-sm h-full" data-testid="tab-calendar">
              <Grid3x3 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-1.5 rounded-xl text-xs sm:text-sm h-full" data-testid="tab-history">
              <History className="w-3.5 h-3.5 flex-shrink-0" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>

          {/* ─── TODAY TAB ─── */}
          <TabsContent value="today" className="space-y-4">
            {/* Identity statement */}
            {user?.identityStatement && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/8 border border-primary/20" data-testid="identity-banner">
                <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground leading-snug">
                  You are a person who {user.identityStatement}.
                </p>
              </div>
            )}

            {/* Hype Drop Consistency Banner */}
            <CheckinConsistencyBanner bestStreak={bestStreak} activeSystems={activeSystems} yesterdayCheckins={yesterdayCheckins} />

            {/* Perfect day banner */}
            {completionPct === 100 && totalCount > 0 && (
              <div className="p-5 rounded-2xl gradient-brand text-white text-center shadow-lg" data-testid="banner-perfect-day">
                <div className="text-4xl mb-2">🏆</div>
                <p className="font-extrabold text-lg">Perfect Day!</p>
                <p className="text-white/80 text-sm mt-0.5">All systems done. Your streak is growing!</p>
              </div>
            )}

            {/* Quick status summary (when some done) */}
            {!isLoading && totalCount > 0 && (doneCount > 0 || partialCount > 0 || missedCount > 0) && completionPct < 100 && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Done",    count: doneCount,    color: "text-chart-3",    bg: "bg-chart-3/8 border-chart-3/20" },
                  { label: "Partial", count: partialCount, color: "text-chart-4",    bg: "bg-chart-4/8 border-chart-4/20" },
                  { label: "Missed",  count: missedCount,  color: "text-destructive", bg: "bg-destructive/8 border-destructive/20" },
                ].map(s => (
                  <div key={s.label} className={cn("rounded-2xl border p-3 text-center", s.bg)}>
                    <p className={cn("text-xl font-extrabold", s.color)}>{s.count}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* System cards */}
            {isLoading ? (
              <div className="space-y-3" aria-busy="true" aria-label="Loading today's habits">
                <span className="sr-only" role="status">Loading today's habits, please wait…</span>
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}
              </div>
            ) : activeSystems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <CheckSquare className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-base">No active systems</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-xs leading-relaxed">
                  Build your first system to start daily check-ins and track your progress.
                </p>
                <Link href="/systems/new">
                  <Button className="rounded-xl h-11 px-6" data-testid="button-go-build-system">
                    <Zap className="w-4 h-4 mr-2" />
                    Build a System
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
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
                    onDone={checkAndUnlockAchievements}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── CALENDAR TAB ─── */}
          <TabsContent value="calendar">
            {allLoading ? (
              <Skeleton className="h-[420px] rounded-2xl" />
            ) : (
              <CalendarView allCheckins={allCheckins} systems={systems} />
            )}
          </TabsContent>

          {/* ─── HISTORY TAB ─── */}
          <TabsContent value="history">
            {allLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
              </div>
            ) : (
              <HistoryView allCheckins={allCheckins} systems={systems} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
