import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

/* ── Brand tokens (match index.css exactly) ─────────────────── */
const C = {
  purple:  "hsl(258 84% 62%)",   // #7c3aed-ish
  cyan:    "hsl(200 80% 56%)",   // #22d3ee-ish
  green:   "hsl(150 60% 48%)",   // #34d399-ish
  orange:  "hsl(36  92% 60%)",   // #f59e0b-ish
  pink:    "hsl(340 80% 60%)",   // #ec4899-ish

  purpleHex: "#8b5cf6",
  cyanHex:   "#22d3ee",
  greenHex:  "#34d399",
  orangeHex: "#f59e0b",
  pinkHex:   "#ec4899",

  bg:      "#090b14",   // just below dark --background
  surface: "rgba(255,255,255,0.05)",
  surfaceHover: "rgba(255,255,255,0.09)",
  border:  "rgba(255,255,255,0.10)",
  text:    "rgba(255,255,255,0.95)",
  muted:   "rgba(255,255,255,0.45)",
  dim:     "rgba(255,255,255,0.20)",
};

const FONT = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";

/* ── Particles (canvas) ─────────────────────────────────────── */
type Particle = { x: number; y: number; vx: number; vy: number; r: number; color: string; opacity: number };

function useParticleCanvas(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = [C.purpleHex, C.cyanHex, C.greenHex, C.purpleHex, C.purpleHex];
    const particles: Particle[] = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.8 + 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.55 + 0.1,
    }));

    let raf: number;
    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, [canvasRef]);
}

/* ── Shared style helpers ────────────────────────────────────── */
const glass = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  ...extra,
});

const pill = (color: string): React.CSSProperties => ({
  background: `${color}22`,
  border: `1px solid ${color}44`,
  borderRadius: 999,
  padding: "2px 10px",
  fontSize: 11,
  fontWeight: 600,
  color,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  display: "inline-block",
  fontFamily: FONT,
});

const gradText: React.CSSProperties = {
  background: `linear-gradient(135deg, ${C.purpleHex} 0%, ${C.cyanHex} 100%)`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

/* ── Keyframes (injected once) ───────────────────────────────── */
const KEYFRAMES = `
@keyframes ha2-fadeUp   { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
@keyframes ha2-fadeIn   { from { opacity:0 } to { opacity:1 } }
@keyframes ha2-scaleIn  { from { opacity:0; transform:scale(0.92) } to { opacity:1; transform:scale(1) } }
@keyframes ha2-slideR   { from { opacity:0; transform:translateX(24px) } to { opacity:1; transform:translateX(0) } }
@keyframes ha2-slideL   { from { opacity:0; transform:translateX(-20px) } to { opacity:1; transform:translateX(0) } }
@keyframes ha2-pulse    { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:0.9;transform:scale(1.12)} }
@keyframes ha2-ring     { from{stroke-dashoffset:220} to{stroke-dashoffset:var(--ring-target,60)} }
@keyframes ha2-barGrow  { from{transform:scaleY(0)} to{transform:scaleY(1)} }
@keyframes ha2-check    { 0%{stroke-dashoffset:20} 100%{stroke-dashoffset:0} }
@keyframes ha2-glow     { 0%,100%{box-shadow:0 0 22px ${C.purpleHex}55} 50%{box-shadow:0 0 42px ${C.purpleHex}99, 0 0 80px ${C.cyanHex}33} }
@keyframes ha2-shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }
@keyframes ha2-float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
@keyframes ha2-dot      { 0%,100%{opacity:0.25;transform:scale(0.9)} 50%{opacity:1;transform:scale(1.2)} }
@keyframes ha2-streakIn { from{opacity:0;transform:scale(0.7)} to{opacity:1;transform:scale(1)} }
@keyframes ha2-countUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes ha2-ctaPulse { 0%,100%{box-shadow:0 0 0 0 ${C.purpleHex}66} 60%{box-shadow:0 0 0 16px ${C.purpleHex}00} }
@keyframes ha2-bgBlob   { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,20px) scale(1.1)} }
@keyframes ha2-spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes ha2-progressFill { from{width:0%} to{width:var(--pw,75%)} }
`;

let injected = false;
function injectKeyframes() {
  if (injected) return;
  injected = true;
  const s = document.createElement("style");
  s.textContent = KEYFRAMES;
  document.head.appendChild(s);
}

/* ── Reusable animated helpers ───────────────────────────────── */
function FadeUp({ delay = 0, dur = 0.65, children, style }: {
  delay?: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      animation: `ha2-fadeUp ${dur}s cubic-bezier(0.22,1,0.36,1) ${delay}s both`,
      ...style,
    }}>
      {children}
    </div>
  );
}

function FadeIn({ delay = 0, dur = 0.5, children, style }: {
  delay?: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{ animation: `ha2-fadeIn ${dur}s ease ${delay}s both`, ...style }}>
      {children}
    </div>
  );
}

/* ── CheckBox component ──────────────────────────────────────── */
function CheckBox({ done, color, delay }: { done: boolean; color: string; delay: number }) {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
      background: done ? `${color}22` : "transparent",
      border: `1.5px solid ${done ? color : C.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: done ? `ha2-scaleIn 0.4s cubic-bezier(0.22,1,0.36,1) ${delay}s both` : undefined,
    }}>
      {done && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l2.5 2.5L9 1" stroke={color} strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={20}
            style={{ animation: `ha2-check 0.3s ease ${delay + 0.1}s both` }}
          />
        </svg>
      )}
    </div>
  );
}

/* ── Progress ring ───────────────────────────────────────────── */
function Ring({ pct, color, size = 52, delay = 0, label }: {
  pct: number; color: string; size?: number; delay?: number; label?: string;
}) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const target = circ - (circ * pct) / 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={`${color}20`} strokeWidth={5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circ}
          style={{
            "--ring-target": target,
            strokeDashoffset: circ,
            animation: `ha2-ring 1.2s cubic-bezier(0.22,1,0.36,1) ${delay}s forwards`,
          } as React.CSSProperties}
        />
      </svg>
      {label && <span style={{ fontFamily: FONT, fontSize: 10, color: C.muted, fontWeight: 500 }}>{label}</span>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCENE 1 — Brand intro: "Build habits that last."
════════════════════════════════════════════════════════════════ */
function Scene1() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>

      {/* Animated blob background */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "10%", left: "20%", width: 340, height: 340,
          background: `radial-gradient(circle, ${C.purpleHex}30 0%, transparent 70%)`,
          borderRadius: "50%", animation: "ha2-bgBlob 8s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "15%", right: "15%", width: 260, height: 260,
          background: `radial-gradient(circle, ${C.cyanHex}20 0%, transparent 70%)`,
          borderRadius: "50%", animation: "ha2-bgBlob 10s ease-in-out 2s infinite" }} />
      </div>

      {/* Logo mark */}
      <FadeIn delay={0.2} dur={0.8}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: `linear-gradient(135deg, ${C.purpleHex}, ${C.cyanHex})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "ha2-glow 3s ease-in-out 0.5s infinite",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 17l4-8 4 5 3-3 4 6" stroke="white" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 22, color: C.text, letterSpacing: "-0.02em" }}>
            Strivo
          </span>
        </div>
      </FadeIn>

      {/* Headline */}
      <FadeUp delay={0.45} dur={0.8}>
        <h1 style={{
          fontFamily: FONT, fontWeight: 800, fontSize: "clamp(2.4rem,5.5vw,3.8rem)",
          lineHeight: 1.05, letterSpacing: "-0.03em", textAlign: "center",
          margin: 0, color: C.text, maxWidth: 560,
        }}>
          Build habits
          <br />
          <span style={{ ...gradText }}>that actually last.</span>
        </h1>
      </FadeUp>

      {/* Sub */}
      <FadeUp delay={0.75} dur={0.7}>
        <p style={{
          fontFamily: FONT, fontSize: 17, lineHeight: 1.55,
          color: C.muted, textAlign: "center", maxWidth: 400, margin: 0,
        }}>
          Minimum actions · Recovery flows · Identity-based progress
        </p>
      </FadeUp>

      {/* Floating stat pills */}
      <FadeIn delay={1.1} dur={0.7}>
        <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { icon: "🔥", label: "47-day streak", color: C.orangeHex },
            { icon: "✓", label: "3 of 4 habits done", color: C.greenHex },
            { icon: "📈", label: "+340k habits tracked", color: C.purpleHex },
          ].map((s, i) => (
            <div key={i} style={{
              ...glass({ padding: "7px 14px" }),
              display: "flex", alignItems: "center", gap: 7,
              animation: `ha2-float 4s ease-in-out ${i * 0.8 + 1.2}s infinite`,
            }}>
              <span style={{ fontSize: 13 }}>{s.icon}</span>
              <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, color: C.text }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </FadeIn>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCENE 2 — Dashboard mockup: Today's habits
════════════════════════════════════════════════════════════════ */
function Scene2() {
  const habits = [
    { name: "Morning run", done: true,  streak: 12, color: C.greenHex,  time: "7:00 AM" },
    { name: "Read 20 pages", done: true,  streak: 47, color: C.purpleHex, time: "8:30 AM" },
    { name: "Meditate 10min", done: false, streak: 8,  color: C.cyanHex,   time: "9:00 AM" },
    { name: "No sugar",       done: true,  streak: 5,  color: C.orangeHex, time: "All day" },
  ];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex",
      alignItems: "center", justifyContent: "center", padding: "0 28px" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>

        {/* Header */}
        <FadeUp delay={0.1}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: C.muted,
                letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                Wednesday · Apr 2
              </div>
              <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>
                Today's Habits
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Ring pct={75} color={C.purpleHex} size={50} delay={0.6} />
              <div>
                <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: C.text, animation: "ha2-countUp 0.7s ease 0.8s both" }}>
                  3/4
                </div>
                <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted }}>done</div>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Habit list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {habits.map((h, i) => (
            <FadeUp key={h.name} delay={0.25 + i * 0.13}>
              <div style={{
                ...glass({ padding: "13px 16px" }),
                display: "flex", alignItems: "center", gap: 13,
                opacity: h.done ? 1 : 0.65,
              }}>
                <CheckBox done={h.done} color={h.color} delay={0.4 + i * 0.13} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: C.text,
                    textDecoration: h.done ? "none" : "none" }}>
                    {h.name}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {h.time}
                  </div>
                </div>
                {/* Streak badge */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: `${h.color}18`, borderRadius: 20,
                  padding: "3px 8px",
                }}>
                  <span style={{ fontSize: 11 }}>🔥</span>
                  <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: h.color }}>
                    {h.streak}d
                  </span>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>

        {/* Minimum action nudge */}
        <FadeIn delay={1.1}>
          <div style={{
            ...glass({ padding: "10px 14px", marginTop: 12,
              background: `${C.cyanHex}12`, borderColor: `${C.cyanHex}30` }),
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.cyanHex}22`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 14 }}>⚡</span>
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.cyanHex }}>
                Minimum: 2-min meditation
              </div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>
                Keeps your streak alive — no pressure
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCENE 3 — Streak & momentum: 47-day streak visualization
════════════════════════════════════════════════════════════════ */
function Scene3() {
  // Build a 7×7 grid (49 days), last 47 are filled
  const days = Array.from({ length: 49 }, (_, i) => {
    const filled = i >= 2;
    const intensity = filled ? (i > 40 ? 1 : i > 30 ? 0.8 : i > 20 ? 0.6 : 0.4) : 0;
    return { filled, intensity };
  });

  return (
    <div style={{ width: "100%", height: "100%", display: "flex",
      alignItems: "center", justifyContent: "center", padding: "0 28px" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>

        {/* Top stat */}
        <FadeUp delay={0.1}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 24 }}>
            <div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted, letterSpacing: "0.08em",
                textTransform: "uppercase", marginBottom: 6 }}>
                Current streak
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{
                  fontFamily: FONT, fontWeight: 800, fontSize: 56, lineHeight: 1,
                  letterSpacing: "-0.04em", ...gradText,
                  animation: "ha2-countUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.3s both",
                }}>47</span>
                <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 20, color: C.muted }}>days</span>
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: FONT, fontSize: 28, animation: "ha2-pulse 2s ease-in-out 0.5s infinite" }}>🔥</div>
            </div>
            <div style={{ flex: 1 }} />
            {/* Mini bars chart */}
            <FadeIn delay={0.6}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 40 }}>
                {[30, 45, 38, 55, 50, 62, 70, 65, 78, 85, 90, 95].map((h, i) => (
                  <div key={i} style={{
                    width: 5, borderRadius: 3,
                    background: i >= 9 ? C.purpleHex : `${C.purpleHex}50`,
                    height: `${h}%`, alignSelf: "flex-end",
                    transformOrigin: "bottom",
                    animation: `ha2-barGrow 0.5s cubic-bezier(0.22,1,0.36,1) ${0.6 + i * 0.04}s both`,
                  }} />
                ))}
              </div>
            </FadeIn>
          </div>
        </FadeUp>

        {/* Habit grid */}
        <FadeIn delay={0.4}>
          <div style={{ ...glass({ padding: 18 }) }}>
            <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: C.muted,
              marginBottom: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Read 20 pages · last 49 days
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
              {days.map((d, i) => (
                <div key={i} style={{
                  aspectRatio: "1",
                  borderRadius: 4,
                  background: d.filled
                    ? `rgba(139, 92, 246, ${d.intensity * 0.85 + 0.1})`
                    : "rgba(255,255,255,0.05)",
                  border: `1px solid ${d.filled ? `${C.purpleHex}40` : C.border}`,
                  animation: d.filled ? `ha2-streakIn 0.3s ease ${0.5 + i * 0.018}s both` : undefined,
                  opacity: d.filled ? 1 : 0.35,
                }} />
              ))}
            </div>
            {/* Legend */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end",
              gap: 6, marginTop: 10 }}>
              <span style={{ fontFamily: FONT, fontSize: 10, color: C.dim }}>Less</span>
              {[0.15, 0.35, 0.6, 0.85, 1].map((o, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: 3,
                  background: `rgba(139,92,246,${o})` }} />
              ))}
              <span style={{ fontFamily: FONT, fontSize: 10, color: C.dim }}>More</span>
            </div>
          </div>
        </FadeIn>

        {/* Achievement badge */}
        <FadeUp delay={1.0}>
          <div style={{
            ...glass({ padding: "10px 16px", marginTop: 12,
              background: `${C.orangeHex}12`, borderColor: `${C.orangeHex}35` }),
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 20, animation: "ha2-pulse 2s ease-in-out 1.2s infinite" }}>🏆</span>
            <div>
              <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text }}>
                7-week milestone unlocked!
              </div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>
                You've crossed the habit formation threshold
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCENE 4 — Recovery flow: "You missed a day."
════════════════════════════════════════════════════════════════ */
function Scene4() {
  const steps = [
    { icon: "😌", title: "One miss is fine", body: "Your streak is still alive. One skip is built into the system." },
    { icon: "⚡", title: "Do the minimum", body: "Just 2 minutes of meditation — enough to count." },
    { icon: "✅", title: "Back on track", body: "You never started over. You just paused." },
  ];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex",
      alignItems: "center", justifyContent: "center", padding: "0 28px" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>

        <FadeUp delay={0.1}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ ...pill(C.orangeHex), marginBottom: 10 }}>Recovery mode</div>
            <h2 style={{ fontFamily: FONT, fontWeight: 800, fontSize: "clamp(1.6rem,3.5vw,2.2rem)",
              lineHeight: 1.15, letterSpacing: "-0.025em", color: C.text, margin: 0 }}>
              Missed a day?
              <br />
              <span style={{ ...gradText }}>That's already handled.</span>
            </h2>
          </div>
        </FadeUp>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {steps.map((s, i) => (
            <FadeUp key={i} delay={0.3 + i * 0.18}>
              <div style={{
                ...glass({ padding: "14px 16px" }),
                display: "flex", gap: 14, alignItems: "flex-start",
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: `${C.purpleHex}20`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, animation: `ha2-float 4s ease-in-out ${i}s infinite`,
                }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 3 }}>
                    {s.title}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                    {s.body}
                  </div>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>

        {/* Streak preserved indicator */}
        <FadeIn delay={1.1}>
          <div style={{
            ...glass({ padding: "12px 16px", marginTop: 14,
              background: `${C.greenHex}10`, borderColor: `${C.greenHex}30` }),
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>🔥</span>
              <div>
                <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.text }}>Streak preserved</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: C.muted }}>47 days · still counting</div>
              </div>
            </div>
            <div style={{ ...pill(C.greenHex) }}>Protected</div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SCENE 5 — CTA: "Identity over outcomes."
════════════════════════════════════════════════════════════════ */
function Scene5({ onCta }: { onCta: () => void }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "0 28px", gap: 20, textAlign: "center" }}>

      {/* Ambient glow */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 500, height: 500,
          background: `radial-gradient(circle, ${C.purpleHex}25 0%, ${C.cyanHex}10 40%, transparent 70%)`,
          borderRadius: "50%",
          animation: "ha2-pulse 4s ease-in-out infinite",
        }} />
      </div>

      <FadeIn delay={0.2} dur={0.6}>
        <div style={{ ...pill(C.purpleHex) }}>Built on Atomic Habits principles</div>
      </FadeIn>

      <FadeUp delay={0.4} dur={0.9}>
        <h1 style={{
          fontFamily: FONT, fontWeight: 800,
          fontSize: "clamp(2.2rem,5vw,3.4rem)",
          lineHeight: 1.1, letterSpacing: "-0.03em",
          color: C.text, margin: 0,
        }}>
          Identity
          <br />
          <span style={{ ...gradText }}>over outcomes.</span>
        </h1>
      </FadeUp>

      <FadeUp delay={0.7} dur={0.7}>
        <p style={{ fontFamily: FONT, fontSize: 16, lineHeight: 1.6, color: C.muted,
          maxWidth: 380, margin: 0 }}>
          Stop chasing motivation. Build the system that builds you — one minimum action at a time.
        </p>
      </FadeUp>

      {/* Social proof row */}
      <FadeIn delay={1.0}>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {[
            { val: "10k+", label: "Active users" },
            { val: "73%", label: "Active after 30d" },
            { val: "4.9★", label: "Avg rating" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 18, ...gradText }}>{s.val}</div>
              <div style={{ fontFamily: FONT, fontSize: 10, color: C.muted, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* CTA button */}
      <FadeUp delay={1.25} dur={0.7}>
        <button
          onClick={onCta}
          data-touch-target="compact"
          style={{
            fontFamily: FONT, fontWeight: 700, fontSize: 15, color: "#fff",
            background: `linear-gradient(135deg, ${C.purpleHex}, ${C.cyanHex})`,
            border: "none", borderRadius: 999,
            padding: "13px 32px",
            cursor: "pointer",
            letterSpacing: "-0.01em",
            animation: "ha2-ctaPulse 2.5s ease-out 1.8s infinite",
            display: "inline-flex", alignItems: "center", gap: 8,
          }}
        >
          Start Free — No card needed
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10M8 3l4 4-4 4" stroke="white" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </FadeUp>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ROOT — HeroAnimation
════════════════════════════════════════════════════════════════ */
const SCENE_DURATION = 6200; // ms per scene
const TRANSITION = 600;       // cross-fade ms
const TOTAL_SCENES = 5;

export function HeroAnimation({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState(0);
  const [fading, setFading] = useState(false);
  const [, navigate] = useLocation();

  useParticleCanvas(canvasRef);

  useEffect(() => {
    injectKeyframes();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setScene((s) => (s + 1) % TOTAL_SCENES);
        setFading(false);
      }, TRANSITION);
    }, SCENE_DURATION);
    return () => clearTimeout(id);
  }, [scene]);

  const scenes = [
    <Scene1 key={`s1-${scene}`} />,
    <Scene2 key={`s2-${scene}`} />,
    <Scene3 key={`s3-${scene}`} />,
    <Scene4 key={`s4-${scene}`} />,
    <Scene5 key={`s5-${scene}`} onCta={() => navigate("/signup")} />,
  ];

  return (
    <div
      className={className}
      style={{ background: C.bg, position: "relative", overflow: "hidden", fontFamily: FONT }}
    >
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
          opacity: 0.6, pointerEvents: "none" }}
      />

      {/* Subtle grid overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.025,
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
        backgroundSize: "30px 30px",
      }} />

      {/* Scene container */}
      <div style={{
        position: "absolute", inset: 0,
        opacity: fading ? 0 : 1,
        transition: `opacity ${TRANSITION}ms cubic-bezier(0.4,0,0.2,1)`,
      }}>
        {scenes[scene]}
      </div>

      {/* Scene dots indicator */}
      <div style={{
        position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 7, zIndex: 10,
      }}>
        {Array.from({ length: TOTAL_SCENES }, (_, i) => (
          <button
            key={i}
            data-touch-target="compact"
            onClick={() => { setFading(true); setTimeout(() => { setScene(i); setFading(false); }, TRANSITION); }}
            style={{
              width: i === scene ? 20 : 6, height: 6,
              borderRadius: 999, border: "none", cursor: "pointer",
              background: i === scene
                ? `linear-gradient(90deg, ${C.purpleHex}, ${C.cyanHex})`
                : "rgba(255,255,255,0.25)",
              transition: "width 0.3s cubic-bezier(0.22,1,0.36,1), background 0.3s ease",
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
