/**
 * future-self-audio.tsx
 *
 * All components for the Future Self Audio feature:
 *
 *  - FutureSelfAudioSetup   – record or upload audio (used in onboarding + settings)
 *  - FutureSelfAudioPlayer  – plays audio with autoplay/first-visit logic (dashboard, recovery)
 *  - FutureSelfAudioSettings – playback preference toggles (settings page)
 *
 * Audio is stored as a base64 data-URL in localStorage (key: sf_future_self_audio).
 * Playback preferences are stored on the Firestore User document.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Mic, MicOff, Upload, Play, Pause, RotateCcw, Trash2,
  Volume2, VolumeX, SkipForward, CheckCircle2, Loader2,
  AudioWaveform,
} from "lucide-react";

/* ─── localStorage keys ──────────────────────────────────────────────── */
export const LS_AUDIO      = "sf_future_self_audio";
export const LS_AUDIO_TYPE = "sf_future_self_audio_type";
export const LS_LAST_PLAYED = "sf_future_self_last_played";

export function hasFutureSelfAudio(): boolean {
  try {
    return !!localStorage.getItem(LS_AUDIO);
  } catch {
    return false;
  }
}

export function deleteFutureSelfAudio(): void {
  try {
    localStorage.removeItem(LS_AUDIO);
    localStorage.removeItem(LS_AUDIO_TYPE);
    localStorage.removeItem(LS_LAST_PLAYED);
  } catch {}
}

/* ─── Waveform visualizer bar ────────────────────────────────────────── */
function WaveformBars({ active }: { active: boolean }) {
  const bars = 16;
  return (
    <div className="flex items-center gap-0.5 h-8">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full transition-all duration-150",
            active ? "bg-primary" : "bg-muted-foreground/30"
          )}
          style={
            active
              ? {
                  height: `${30 + Math.random() * 70}%`,
                  animation: `waveBar ${0.4 + (i % 4) * 0.15}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.05}s`,
                }
              : { height: "25%" }
          }
        />
      ))}
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

/* ─── Audio player bar ───────────────────────────────────────────────── */
function MiniPlayer({
  src,
  mimeType,
  muted,
}: {
  src: string;
  mimeType: string;
  muted?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = new Audio(src);
    el.muted = !!muted;
    el.preload = "metadata";
    el.onloadedmetadata = () => setDuration(el.duration);
    el.ontimeupdate = () => {
      if (el.duration) setProgress((el.currentTime / el.duration) * 100);
    };
    el.onended = () => { setPlaying(false); setProgress(0); };
    audioRef.current = el;
    return () => { el.pause(); el.src = ""; };
  }, [src, muted]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play().catch(() => {}); setPlaying(true); }
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "--:--";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="w-8 h-8 flex-shrink-0 rounded-full border"
        onClick={toggle}
        data-testid="button-mini-player-toggle"
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </Button>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
        {fmt(duration)}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FutureSelfAudioSetup
   Used in: onboarding step + settings section
   ═══════════════════════════════════════════════════════════════════════ */

interface SetupProps {
  onSaved?: (hasAudio: boolean) => void;
  onSkip?: () => void;
  compact?: boolean;
}

export function FutureSelfAudioSetup({ onSaved, onSkip, compact = false }: SetupProps) {
  const [mode, setMode] = useState<"idle" | "record" | "upload" | "preview" | "saved">(
    hasFutureSelfAudio() ? "saved" : "idle"
  );
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioType, setAudioType] = useState<string>("audio/webm");
  const [uploading, setUploading] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => {
    if (hasFutureSelfAudio()) {
      const stored = localStorage.getItem(LS_AUDIO);
      const type = localStorage.getItem(LS_AUDIO_TYPE) || "audio/webm";
      if (stored) { setAudioSrc(stored); setAudioType(type); setMode("saved"); }
    }
    return () => { stopTimer(); };
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result as string;
          setAudioSrc(b64);
          setAudioType(mimeType);
          setMode("preview");
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch (err: any) {
      setError("Microphone access was denied. Please allow microphone access and try again.");
    }
  };

  const stopRecording = () => {
    stopTimer();
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      setError("Please upload an audio file (MP3, WAV, M4A, OGG, etc.)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Audio file must be under 10 MB.");
      return;
    }
    setUploading(true);
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      setAudioSrc(b64);
      setAudioType(file.type);
      setMode("preview");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const saveAudio = useCallback(() => {
    if (!audioSrc) return;
    try {
      localStorage.setItem(LS_AUDIO, audioSrc);
      localStorage.setItem(LS_AUDIO_TYPE, audioType);
      setMode("saved");
      onSaved?.(true);
    } catch {
      setError("Could not save audio — your browser storage may be full. Try a shorter recording.");
    }
  }, [audioSrc, audioType, onSaved]);

  const deleteAudio = () => {
    deleteFutureSelfAudio();
    setAudioSrc(null);
    setMode("idle");
    onSaved?.(false);
  };

  const reRecord = () => {
    setAudioSrc(null);
    setMode("record");
    startRecording();
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (mode === "idle") {
    return (
      <div className="space-y-4">
        {!compact && (
          <div className="bg-primary/8 border border-primary/20 rounded-xl p-4">
            <p className="text-sm font-semibold text-primary mb-1">Why this works</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Hearing your own voice describe who you're becoming bypasses the critical mind. It's the fastest way to reconnect with your why — especially on low-motivation days.
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setMode("record"); startRecording(); }}
            data-testid="button-future-audio-record"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Mic className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-semibold">Record now</span>
            <span className="text-xs text-muted-foreground text-center">Use your microphone</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-future-audio-upload"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {uploading ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Upload className="w-5 h-5 text-primary" />}
            </div>
            <span className="text-sm font-semibold">Upload file</span>
            <span className="text-xs text-muted-foreground text-center">MP3, WAV, M4A…</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileUpload}
          data-testid="input-future-audio-file"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        {onSkip && (
          <Button
            type="button"
            variant="ghost"
            className="w-full text-muted-foreground text-sm"
            onClick={onSkip}
            data-testid="button-future-audio-skip"
          >
            Skip for now — I'll add this later
          </Button>
        )}
      </div>
    );
  }

  if (mode === "record") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-4 py-4">
          <div
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center transition-all",
              recording ? "bg-destructive/10 ring-4 ring-destructive/30 animate-pulse" : "bg-primary/10"
            )}
          >
            {recording ? <Mic className="w-8 h-8 text-destructive" /> : <MicOff className="w-8 h-8 text-muted-foreground" />}
          </div>
          {recording && (
            <>
              <p className="text-2xl font-mono font-bold text-destructive">{fmt(recordSeconds)}</p>
              <WaveformBars active={recording} />
              <p className="text-xs text-muted-foreground">Recording… speak naturally</p>
            </>
          )}
          <Button
            type="button"
            variant={recording ? "destructive" : "default"}
            onClick={recording ? stopRecording : startRecording}
            data-testid="button-future-audio-stop"
          >
            {recording ? <><MicOff className="w-4 h-4 mr-2" /> Stop recording</> : <><Mic className="w-4 h-4 mr-2" /> Start recording</>}
          </Button>
        </div>
        {error && <p className="text-xs text-destructive text-center">{error}</p>}
        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground text-sm"
          onClick={() => setMode("idle")}
          data-testid="button-future-audio-cancel"
        >
          Cancel
        </Button>
      </div>
    );
  }

  if (mode === "preview" && audioSrc) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <AudioWaveform className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Preview your recording</p>
          </div>
          <MiniPlayer src={audioSrc} mimeType={audioType} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audio-label" className="text-xs">
            Give it a title <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="audio-label"
            placeholder="e.g. My future self — January 2026"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="text-sm"
            data-testid="input-future-audio-label"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          type="button"
          className="w-full gap-2"
          onClick={saveAudio}
          data-testid="button-future-audio-save"
        >
          <CheckCircle2 className="w-4 h-4" />
          Save this recording
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2 text-sm"
            onClick={reRecord}
            data-testid="button-future-audio-rerecord"
          >
            <RotateCcw className="w-4 h-4" />
            Record again
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="flex-1 text-sm"
            onClick={() => setMode("idle")}
            data-testid="button-future-audio-discard"
          >
            Discard
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "saved" && audioSrc) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-primary">Recording saved</p>
            </div>
          </div>
          <MiniPlayer src={audioSrc} mimeType={audioType} />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border hover:border-primary/40 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
            data-testid="button-future-audio-replace"
          >
            <Upload className="w-3.5 h-3.5" />
            Replace
          </button>
          <button
            type="button"
            onClick={reRecord}
            className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border hover:border-primary/40 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
            data-testid="button-future-audio-rerecord-saved"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Re-record
          </button>
          <button
            type="button"
            onClick={deleteAudio}
            className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border border-destructive/20 hover:border-destructive/50 text-xs font-medium text-destructive/70 hover:text-destructive transition-all"
            data-testid="button-future-audio-delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        {onSaved && (
          <Button
            type="button"
            className="w-full"
            onClick={() => onSaved(true)}
            data-testid="button-future-audio-continue"
          >
            Continue
          </Button>
        )}
      </div>
    );
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════════════════
   FutureSelfAudioSettings
   Used in: Settings page
   ═══════════════════════════════════════════════════════════════════════ */

interface AudioPrefs {
  playOnFirstVisit: boolean;
  playAfterMissed: boolean;
  autoplay: boolean;
  muted: boolean;
}

interface SettingsProps {
  prefs: AudioPrefs;
  onChange: (prefs: AudioPrefs) => void;
}

export function FutureSelfAudioSettings({ prefs, onChange }: SettingsProps) {
  const set = (key: keyof AudioPrefs, val: boolean) =>
    onChange({ ...prefs, [key]: val });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label className="text-sm font-medium">Play on first visit of the day</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Hear your message each morning when you open the app</p>
        </div>
        <Switch
          checked={prefs.playOnFirstVisit}
          onCheckedChange={v => set("playOnFirstVisit", v)}
          data-testid="switch-future-audio-first-visit"
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label className="text-sm font-medium">Play after missed days</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Replays during recovery flow to reconnect with your why</p>
        </div>
        <Switch
          checked={prefs.playAfterMissed}
          onCheckedChange={v => set("playAfterMissed", v)}
          data-testid="switch-future-audio-after-missed"
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label className="text-sm font-medium">Autoplay if browser allows</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Starts automatically; falls back to a manual play button</p>
        </div>
        <Switch
          checked={prefs.autoplay}
          onCheckedChange={v => set("autoplay", v)}
          data-testid="switch-future-audio-autoplay"
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label className="text-sm font-medium">Mute by default</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Audio starts muted — tap the volume icon to hear it</p>
        </div>
        <Switch
          checked={prefs.muted}
          onCheckedChange={v => set("muted", v)}
          data-testid="switch-future-audio-muted"
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FutureSelfAudioPlayer
   Used in: Dashboard (first visit of day), Recovery flow (missed day)
   Context: "firstVisit" | "missedDay" | "hypeWarning" | "manual"
   ═══════════════════════════════════════════════════════════════════════ */

interface PlayerProps {
  context: "firstVisit" | "missedDay" | "hypeWarning" | "manual";
  userName?: string;
  playOnFirstVisit?: boolean;
  playAfterMissed?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  onDismiss?: () => void;
}

const CONTEXT_COPY = {
  firstVisit: {
    label: "Your future self is calling.",
    sub: "Press play to reconnect with who you're becoming.",
    badge: "Daily reminder",
  },
  missedDay: {
    label: "Remember who you're building toward.",
    sub: "You missed a day. That's okay. This message is from you, to you.",
    badge: "Recovery moment",
  },
  hypeWarning: {
    label: "The hype is fading. That's normal.",
    sub: "Your future self recorded this for exactly this moment.",
    badge: "Identity check-in",
  },
  manual: {
    label: "Future Self Audio",
    sub: "A message from who you're becoming.",
    badge: "Your recording",
  },
};

export function FutureSelfAudioPlayer({
  context,
  userName,
  playOnFirstVisit = true,
  playAfterMissed = true,
  autoplay = true,
  muted: mutedPref = false,
  onDismiss,
}: PlayerProps) {
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(mutedPref);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const copy = CONTEXT_COPY[context];

  const shouldShow = useCallback(() => {
    if (!hasFutureSelfAudio()) return false;
    const today = new Date().toISOString().split("T")[0];
    if (context === "firstVisit") {
      if (!playOnFirstVisit) return false;
      const last = localStorage.getItem(LS_LAST_PLAYED);
      return last !== today;
    }
    if (context === "missedDay") return playAfterMissed;
    return true;
  }, [context, playOnFirstVisit, playAfterMissed]);

  useEffect(() => {
    if (!shouldShow()) return;
    setVisible(true);

    const src = localStorage.getItem(LS_AUDIO) || "";
    const el = new Audio(src);
    el.muted = mutedPref;
    el.preload = "auto";

    el.onloadedmetadata = () => setDuration(el.duration);
    el.ontimeupdate = () => {
      if (el.duration) setProgress((el.currentTime / el.duration) * 100);
    };
    el.onended = () => {
      setPlaying(false);
      setProgress(0);
      const today = new Date().toISOString().split("T")[0];
      localStorage.setItem(LS_LAST_PLAYED, today);
    };
    audioRef.current = el;

    if (autoplay) {
      el.play().then(() => {
        setPlaying(true);
      }).catch(() => {
        setAutoplayBlocked(true);
      });
    }

    return () => { el.pause(); el.src = ""; };
  }, [shouldShow, autoplay, mutedPref]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else {
      el.play().then(() => { setPlaying(true); setAutoplayBlocked(false); }).catch(() => {});
    }
  };

  const toggleMute = () => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = !muted;
    setMuted(m => !m);
  };

  const skipForToday = () => {
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem(LS_LAST_PLAYED, today);
    audioRef.current?.pause();
    setDismissed(true);
    onDismiss?.();
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "--:--";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!visible || dismissed) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 space-y-3 transition-all",
        context === "missedDay"
          ? "border-warning/30 bg-warning/5"
          : "border-primary/20 bg-primary/5"
      )}
      data-testid="future-self-audio-player"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
              context === "missedDay" ? "bg-warning/15" : "bg-primary/15"
            )}
          >
            <AudioWaveform
              className={cn("w-4.5 h-4.5", context === "missedDay" ? "text-warning" : "text-primary")}
            />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-0.5">
              {copy.badge}
            </p>
            <p className="text-sm font-bold leading-snug">
              {userName ? `${userName.split(" ")[0]}, ` : ""}{copy.label}
            </p>
            {autoplayBlocked && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Tap play to hear your message.
              </p>
            )}
            {!autoplayBlocked && !playing && (
              <p className="text-xs text-muted-foreground mt-0.5">{copy.sub}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          className={cn(
            "w-9 h-9 rounded-full flex-shrink-0",
            context === "missedDay" ? "bg-warning/80 hover:bg-warning text-white" : ""
          )}
          onClick={togglePlay}
          data-testid="button-future-audio-play"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>

        <div className="flex-1 space-y-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer">
            <div
              className={cn("h-full rounded-full transition-all", context === "missedDay" ? "bg-warning/70" : "bg-primary/70")}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-muted-foreground font-mono">
              {playing ? fmt((progress / 100) * duration) : "0:00"}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">{fmt(duration)}</span>
          </div>
        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-8 h-8 flex-shrink-0"
          onClick={toggleMute}
          data-testid="button-future-audio-mute"
        >
          {muted ? <VolumeX className="w-3.5 h-3.5 text-muted-foreground" /> : <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />}
        </Button>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-1 text-xs text-muted-foreground gap-1.5 h-7"
          onClick={skipForToday}
          data-testid="button-future-audio-skip-today"
        >
          <SkipForward className="w-3 h-3" />
          Skip for today
        </Button>
        <WaveformBars active={playing} />
      </div>
    </div>
  );
}
