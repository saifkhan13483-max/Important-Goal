/**
 * future-self-audio.tsx
 *
 * All components for the Future Self Audio feature:
 *
 *  - FutureSelfAudioSetup   – record or upload audio (used in onboarding + settings)
 *  - FutureSelfAudioPlayer  – plays audio with autoplay/first-visit logic (dashboard, recovery)
 *  - FutureSelfAudioSettings – playback preference toggles (settings page)
 *
 * Audio is uploaded to Firebase Storage at audio/{userId}/future-self.<ext>
 * The download URL is stored on the Firestore User document (futureAudioUrl)
 * and also cached in localStorage for fast local playback.
 *
 * Legacy: if the user has a base64 blob in localStorage from before the
 * Firebase Storage upgrade, that will be used as a fallback automatically.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Mic, MicOff, Upload, Play, Pause, RotateCcw, Trash2,
  Volume2, VolumeX, SkipForward, CheckCircle2,
  AudioWaveform, CloudUpload, AlertCircle,
} from "lucide-react";
import {
  uploadFutureSelfAudio,
  deleteFutureSelfAudioFromStorage,
  getLocalAudioUrl,
  hasStoredAudio,
} from "@/services/audio.service";

/* ─── localStorage keys (kept for cache / legacy compat) ─────────── */
const LS_AUDIO_URL  = "sf_future_self_audio_url";
const LS_AUDIO_B64  = "sf_future_self_audio";
const LS_AUDIO_TYPE = "sf_future_self_audio_type";
export const LS_LAST_PLAYED = "sf_future_self_last_played";

/** @deprecated use hasStoredAudio() from audio.service instead */
export function hasFutureSelfAudio(firestoreUrl?: string | null): boolean {
  return hasStoredAudio(firestoreUrl);
}

export function deleteFutureSelfAudio(): void {
  try {
    localStorage.removeItem(LS_AUDIO_URL);
    localStorage.removeItem(LS_AUDIO_B64);
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
function MiniPlayer({ src, muted }: { src: string; muted?: boolean }) {
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
  /** Called with the Firebase Storage URL after a successful upload */
  onSaved?: (audioUrl: string) => void;
  onSkip?: () => void;
  compact?: boolean;
  /** Existing Firestore URL (so saved state shows on revisit) */
  existingUrl?: string | null;
}

export function FutureSelfAudioSetup({ onSaved, onSkip, compact = false, existingUrl }: SetupProps) {
  const initialSrc = getLocalAudioUrl(existingUrl);
  const [mode, setMode] = useState<"idle" | "record" | "upload" | "preview" | "uploading" | "saved">(
    initialSrc ? "saved" : "idle"
  );
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [localSrc, setLocalSrc] = useState<string | null>(initialSrc);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => () => { stopTimer(); }, []);

  /* ── Upload to Firebase Storage (real progress via uploadBytesResumable) ── */
  const doUpload = useCallback(async (
    blob: Blob,
    b64ForPreview: string,
    mimeType: string,
  ) => {
    setMode("uploading");
    setUploadProgress(0);
    setUploadError(null);

    try {
      const url = await uploadFutureSelfAudio(
        blob,
        mimeType,
        (pct) => setUploadProgress(pct),
      );

      setUploadProgress(100);
      try { localStorage.setItem(LS_AUDIO_TYPE, mimeType); } catch {}
      setLocalSrc(url);
      setMode("saved");
      setTimeout(() => setUploadProgress(0), 600);
      onSaved?.(url);
    } catch (err: any) {
      setUploadProgress(0);

      // If Firebase Storage is blocked, fall back to localStorage base64
      if (b64ForPreview.startsWith("data:")) {
        try {
          localStorage.setItem(LS_AUDIO_B64, b64ForPreview);
          localStorage.setItem(LS_AUDIO_TYPE, mimeType);
          setLocalSrc(b64ForPreview);
          setMode("saved");
          setUploadError(
            "Saved locally on this device. To sync across devices, configure Firebase Storage rules."
          );
          onSaved?.(b64ForPreview);
          return;
        } catch {}
      }

      const msg = err?.code === "storage/unauthorized"
        ? "Permission denied — Firebase Storage rules need to allow authenticated writes."
        : err?.message?.includes("timed out")
          ? "Upload timed out. Check your connection and try again."
          : (err?.message || "Upload failed. Please try again.");

      setUploadError(msg);
      setMode("preview");
    }
  }, [onSaved]);

  /* ── Recording ──────────────────────────────────────────────────── */
  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      mimeTypeRef.current = mimeType;
      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        blobRef.current = blob;
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result as string;
          setLocalSrc(b64);
          setMode("preview");
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch {
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

  /* ── File upload ─────────────────────────────────────────────────── */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      setError("Please upload an audio file (MP3, WAV, M4A, OGG, etc.)");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Audio file must be under 20 MB.");
      return;
    }
    setError(null);
    mimeTypeRef.current = file.type;

    // Show a b64 preview first, then upload
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      setLocalSrc(b64);
      blobRef.current = new Blob([file], { type: file.type });
      setMode("preview");
    };
    reader.readAsDataURL(file);
  };

  /* ── Save (trigger Firebase upload) ────────────────────────────── */
  const saveAudio = async () => {
    if (!localSrc) return;
    const mime = mimeTypeRef.current;

    let blob = blobRef.current;
    if (!blob && localSrc.startsWith("data:")) {
      const res = await fetch(localSrc);
      blob = await res.blob();
    }
    if (!blob) return;

    doUpload(blob, localSrc, mime);
  };

  /* ── Delete ─────────────────────────────────────────────────────── */
  const deleteAudio = async () => {
    const existing = getLocalAudioUrl(existingUrl);
    if (existing && existing.startsWith("http")) {
      await deleteFutureSelfAudioFromStorage(existing).catch(() => {});
    }
    deleteFutureSelfAudio();
    setLocalSrc(null);
    setMode("idle");
    onSaved?.("");
  };

  const reRecord = () => {
    setLocalSrc(null);
    blobRef.current = null;
    setMode("record");
    startRecording();
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  /* ── Render: idle ───────────────────────────────────────────────── */
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
              <Upload className="w-5 h-5 text-primary" />
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

  /* ── Render: recording ──────────────────────────────────────────── */
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
            {recording
              ? <><MicOff className="w-4 h-4 mr-2" /> Stop recording</>
              : <><Mic className="w-4 h-4 mr-2" /> Start recording</>}
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

  /* ── Render: preview (pre-upload) ───────────────────────────────── */
  if (mode === "preview" && localSrc) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <AudioWaveform className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">Preview your recording</p>
          </div>
          <MiniPlayer src={localSrc} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audio-label" className="text-xs">
            Give it a title <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="audio-label"
            placeholder="e.g. My future self — March 2026"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="text-sm"
            data-testid="input-future-audio-label"
          />
        </div>
        {uploadError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/8 border border-warning/20">
            <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{uploadError}</p>
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          type="button"
          className="w-full gap-2"
          onClick={saveAudio}
          data-testid="button-future-audio-save"
        >
          <CloudUpload className="w-4 h-4" />
          Save to cloud
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
            onClick={() => { setLocalSrc(null); blobRef.current = null; setMode("idle"); }}
            data-testid="button-future-audio-discard"
          >
            Discard
          </Button>
        </div>
      </div>
    );
  }

  /* ── Render: uploading ──────────────────────────────────────────── */
  if (mode === "uploading") {
    return (
      <div className="space-y-4 py-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <CloudUpload className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <p className="text-sm font-semibold">Saving to cloud…</p>
          <p className="text-xs text-muted-foreground">Your recording is being securely stored</p>
        </div>
        <Progress value={uploadProgress} className="h-2" />
        <p className="text-xs text-muted-foreground text-center">{uploadProgress}%</p>
      </div>
    );
  }

  /* ── Render: saved ──────────────────────────────────────────────── */
  if (mode === "saved" && localSrc) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-primary">
              {localSrc.startsWith("http") ? "Recording saved to cloud" : "Recording saved locally"}
            </p>
            {localSrc.startsWith("http") && (
              <span className="ml-auto text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                Synced ✓
              </span>
            )}
          </div>
          <MiniPlayer src={localSrc} />
        </div>
        {uploadError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/8 border border-warning/20">
            <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{uploadError}</p>
          </div>
        )}
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
        {onSaved && (
          <Button
            type="button"
            className="w-full"
            onClick={() => onSaved(localSrc)}
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
  /** Firestore URL — passed from user.futureAudioUrl */
  firestoreUrl?: string | null;
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
  firestoreUrl,
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
  const [audioSrc, setAudioSrc] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const copy = CONTEXT_COPY[context];

  const shouldShow = useCallback(() => {
    const src = getLocalAudioUrl(firestoreUrl);
    if (!src) return false;
    const today = new Date().toISOString().split("T")[0];
    if (context === "firstVisit") {
      if (!playOnFirstVisit) return false;
      const last = localStorage.getItem(LS_LAST_PLAYED);
      return last !== today;
    }
    if (context === "missedDay") return playAfterMissed;
    return true;
  }, [context, playOnFirstVisit, playAfterMissed, firestoreUrl]);

  useEffect(() => {
    if (!shouldShow()) return;

    const src = getLocalAudioUrl(firestoreUrl);
    if (!src) return;

    setVisible(true);
    setAudioSrc(src);

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
      el.play().then(() => setPlaying(true)).catch(() => setAutoplayBlocked(true));
    }

    return () => { el.pause(); el.src = ""; };
  }, [shouldShow, autoplay, mutedPref, firestoreUrl]);

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
          {(autoplayBlocked || !playing) && (
            <p className="text-xs text-muted-foreground mt-0.5">{copy.sub}</p>
          )}
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
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
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
          {muted
            ? <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
            : <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />}
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
