import { useEffect, useRef, useState } from "react";

const PURPLE = "#8b5cf6";
const CYAN = "#06b6d4";
const AMBER = "#f59e0b";

const FRAGMENTS = Array.from({ length: 48 }, (_, i) => {
  const angle = (i / 48) * Math.PI * 2 + i * 0.41;
  const dist = 120 + (i % 9) * 35;
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    rot: (i * 53) % 360,
    delay: (i % 10) * 0.04,
    w: 3 + (i % 6) * 2.5,
    h: 1.5 + (i % 5) * 1.5,
    color: [PURPLE, CYAN, "#ffffff", "#ffffffcc", AMBER, "#ffffff99"][i % 6],
  };
});

const STEPS = [
  { label: "Identity", icon: "✦", color: "#8b5cf6" },
  { label: "Outcome", icon: "◎", color: "#7c3aed" },
  { label: "Trigger", icon: "⚡", color: "#6d28d9" },
  { label: "Action", icon: "▶", color: "#06b6d4" },
  { label: "Reward", icon: "★", color: AMBER },
];

const CHART_BARS = [38, 52, 45, 68, 62, 82, 88, 75, 85, 95];

export function HeroAnimation({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cycle, setCycle] = useState(0);

  // Auto-loop the full animation every 31s
  useEffect(() => {
    const id = setInterval(() => setCycle((c) => c + 1), 31000);
    return () => clearInterval(id);
  }, []);

  // Floating particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * (canvas.width || 600),
      y: Math.random() * (canvas.height || 500),
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      size: Math.random() * 1.6 + 0.3,
      opacity: Math.random() * 0.45 + 0.07,
      color: [PURPLE, CYAN, "#ffffff", "#ffffff"][Math.floor(Math.random() * 4)],
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle =
          p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, "0");
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [cycle]);

  const glass: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: "16px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
  };

  return (
    <div
      key={cycle}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(145deg, #0a0a1a 0%, #0d0920 50%, #1a1040 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Inter', system-ui, sans-serif",
        borderRadius: "inherit",
      }}
    >
      <style>{`
        @keyframes ha-goalsIn   { from { opacity:0; transform:scale(0.85) translateY(20px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes ha-goalsOut  { from { opacity:1; transform:scale(1); filter:blur(0); } to { opacity:0; transform:scale(0.3); filter:blur(10px); } }
        @keyframes ha-fragOut   { from { transform:translate(0,0) rotate(0deg) scale(1); opacity:1; } to { transform:translate(var(--fx),var(--fy)) rotate(var(--fr)) scale(0); opacity:0; } }
        @keyframes ha-sceneIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes ha-sceneOut  { from { opacity:1; } to { opacity:0; } }
        @keyframes ha-dashReveal{ from { opacity:0; transform:perspective(1000px) scale(0.88) translateY(24px); filter:blur(10px); } to { opacity:1; transform:perspective(1000px) scale(1) translateY(0); filter:blur(0); } }
        @keyframes ha-dashFloat { 0%,100% { transform:perspective(1000px) rotateX(3deg) rotateY(-3deg) translateY(0); } 50% { transform:perspective(1000px) rotateX(-3deg) rotateY(3deg) translateY(-8px); } }
        @keyframes ha-slideL    { from { opacity:0; transform:translateX(-30px); } to { opacity:1; transform:translateX(0); } }
        @keyframes ha-slideR    { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }
        @keyframes ha-slideU    { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ha-ringFill  { from { stroke-dashoffset:220; } to { stroke-dashoffset:59; } }
        @keyframes ha-barFill   { from { opacity:0; transform:scaleX(0); } to { opacity:1; transform:scaleX(1); } }
        @keyframes ha-chartRise { from { opacity:0; transform:scaleY(0); } to { opacity:1; transform:scaleY(1); } }
        @keyframes ha-stepIn    { from { opacity:0; transform:scale(0.75); filter:blur(4px); } to { opacity:1; transform:scale(1); filter:blur(0); } }
        @keyframes ha-pulse     { 0%,100% { transform:scale(1); opacity:0.6; } 50% { transform:scale(1.6); opacity:0; } }
        @keyframes ha-lineGrow  { from { stroke-dashoffset:200; opacity:0; } 20% { opacity:1; } to { stroke-dashoffset:0; opacity:1; } }
        @keyframes ha-bubbleL   { from { opacity:0; transform:translateX(-50px) scale(0.85); } to { opacity:1; transform:translateX(0) scale(1); } }
        @keyframes ha-bubbleR   { from { opacity:0; transform:translateX(50px) scale(0.85); } to { opacity:1; transform:translateX(0) scale(1); } }
        @keyframes ha-orbitF    { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
        @keyframes ha-logoIn    { from { opacity:0; transform:scale(1.7) rotate(-8deg); filter:blur(18px); } 70% { filter:blur(0); } to { opacity:1; transform:scale(1) rotate(0deg); filter:blur(0); } }
        @keyframes ha-typeOut   { from { max-width:0; } to { max-width:60ch; } }
        @keyframes ha-ctaIn     { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ha-ctaGlow   { 0%,100% { box-shadow:0 0 20px rgba(139,92,246,0.5),0 0 40px rgba(139,92,246,0.28); } 50% { box-shadow:0 0 40px rgba(139,92,246,0.8),0 0 80px rgba(139,92,246,0.45),0 0 120px rgba(6,182,212,0.28); } }
      `}</style>

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      {/* Central bloom */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(139,92,246,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* ── SCENE 1: 0–5s · Goals shatters ── */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        animation: "ha-sceneIn 0.4s ease 0.1s both, ha-sceneOut 0.7s ease 4.3s both" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <h2 style={{ margin: 0, fontSize: "clamp(48px,9vw,100px)", fontWeight: 200, color: "#fff",
            letterSpacing: "0.14em", lineHeight: 1,
            textShadow: `0 0 50px rgba(139,92,246,0.45), 0 0 100px rgba(6,182,212,0.2)`,
            animation: "ha-goalsIn 0.9s cubic-bezier(0.16,1,0.3,1) 0.4s both, ha-goalsOut 1.1s cubic-bezier(0.4,0,1,1) 2.6s both" }}>
            Goals
          </h2>
          {FRAGMENTS.map((f, i) => (
            <div key={i} style={{ position: "absolute", top: "50%", left: "50%",
              width: `${f.w}px`, height: `${f.h}px`, background: f.color, borderRadius: "1px", opacity: 0,
              "--fx": `${f.x * 0.7}px`, "--fy": `${f.y * 0.7}px`, "--fr": `${f.rot}deg`,
              animation: `ha-fragOut 1.3s cubic-bezier(0.15,0,0.9,1) ${2.6 + f.delay}s both`,
            } as React.CSSProperties} />
          ))}
        </div>
      </div>

      {/* ── SCENE 2: 5–12s · Dashboard ── */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px",
        opacity: 0, animation: "ha-sceneIn 1s ease 5s both, ha-sceneOut 0.7s ease 11.3s both" }}>
        <div style={{ width: "100%", maxWidth: "480px",
          animation: "ha-dashReveal 1s cubic-bezier(0.16,1,0.3,1) 5.2s both, ha-dashFloat 7s ease-in-out 6.5s infinite" }}>
          <div style={{ ...glass, padding: "18px", borderRadius: "20px",
            boxShadow: "0 24px 70px rgba(0,0,0,0.6), 0 0 50px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.1)" }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.38)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "3px" }}>Today</div>
                <div style={{ color: "#fff", fontSize: "16px", fontWeight: 600 }}>Today's Systems</div>
              </div>
              <div style={{ background: "linear-gradient(135deg,#8b5cf6,#06b6d4)", borderRadius: "9px", padding: "5px 12px", fontSize: "11px", fontWeight: 600, color: "#fff" }}>2/3 done</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {/* Streak Calendar */}
              <div style={{ ...glass, padding: "12px", opacity: 0, animation: "ha-slideL 0.65s cubic-bezier(0.16,1,0.3,1) 5.7s both" }}>
                <div style={{ color: "rgba(255,255,255,0.38)", fontSize: "8.5px", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Streak Calendar</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2.5px", marginBottom: "8px" }}>
                  {["M","T","W","T","F","S","S"].map((d, i) => (
                    <div key={i} style={{ textAlign: "center", fontSize: "7px", color: "rgba(255,255,255,0.28)" }}>{d}</div>
                  ))}
                  {Array.from({ length: 35 }, (_, i) => {
                    const on = [0,1,2,3,5,6,7,8,9,11,12,13,14,16,17,18,20,21,22,23,24,26,27,28,29,30].includes(i);
                    return (
                      <div key={i} style={{ height: "13px", borderRadius: "3px",
                        background: on ? (i > 27 ? PURPLE : i > 20 ? "#7c3aed" : "#6d28d9") : "rgba(255,255,255,0.05)",
                        opacity: on ? 1 : 0.3, transformOrigin: "left",
                        animation: on ? `ha-barFill 0.25s ease ${6 + i * 0.018}s both` : "none" }} />
                    );
                  })}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ fontSize: "18px", fontWeight: 700, color: AMBER }}>12</span>
                  <span style={{ fontSize: "14px" }}>🔥</span>
                  <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.38)" }}>day streak</span>
                </div>
              </div>

              {/* Progress Ring */}
              <div style={{ ...glass, padding: "12px", display: "flex", flexDirection: "column", alignItems: "center",
                opacity: 0, animation: "ha-slideR 0.65s cubic-bezier(0.16,1,0.3,1) 6.1s both" }}>
                <div style={{ color: "rgba(255,255,255,0.38)", fontSize: "8.5px", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", alignSelf: "flex-start" }}>Completion</div>
                <div style={{ position: "relative", width: "70px", height: "70px" }}>
                  <svg width="70" height="70" viewBox="0 0 70 70" style={{ overflow: "visible" }}>
                    <defs>
                      <linearGradient id="ha-rg" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={PURPLE} /><stop offset="100%" stopColor={CYAN} />
                      </linearGradient>
                    </defs>
                    <circle cx="35" cy="35" r="28" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
                    <circle cx="35" cy="35" r="28" fill="none" stroke="url(#ha-rg)" strokeWidth="6"
                      strokeDasharray="176" strokeDashoffset="176" strokeLinecap="round"
                      transform="rotate(-90 35 35)"
                      style={{ animation: "ha-ringFill 1.6s cubic-bezier(0.16,1,0.3,1) 6.4s both",
                        filter: `drop-shadow(0 0 5px ${PURPLE})` }} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "17px", fontWeight: 700, color: "#fff" }}>73%</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  {[{l:"AM",v:90,c:PURPLE},{l:"PM",v:60,c:CYAN}].map(r => (
                    <div key={r.l} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)" }}>{r.l}</div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: r.c }}>{r.v}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mood bars */}
              <div style={{ ...glass, padding: "12px", gridColumn: "1/-1",
                opacity: 0, animation: "ha-slideU 0.65s cubic-bezier(0.16,1,0.3,1) 6.6s both" }}>
                <div style={{ color: "rgba(255,255,255,0.38)", fontSize: "8.5px", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Mood & Energy</div>
                <div style={{ display: "flex", gap: "5px", alignItems: "flex-end", height: "38px" }}>
                  {[58,42,72,82,68,92,76].map((h, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                      <div style={{ width: "100%", height: `${h * 0.36}px`, borderRadius: "3px 3px 0 0",
                        background: i === 5 ? `linear-gradient(180deg,${PURPLE},${CYAN})` : "rgba(139,92,246,0.28)",
                        transformOrigin: "bottom", animation: `ha-chartRise 0.5s ease ${6.9 + i * 0.09}s both`, opacity: 0 }} />
                      <span style={{ fontSize: "7px", color: "rgba(255,255,255,0.28)" }}>{["M","T","W","T","F","S","S"][i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SCENE 3: 12–20s · System Builder ── */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        opacity: 0, animation: "ha-sceneIn 1s ease 12s both, ha-sceneOut 0.7s ease 19.3s both" }}>
        <div style={{ color: "rgba(255,255,255,0.32)", fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "24px",
          opacity: 0, animation: "ha-slideU 0.6s ease 12.3s both" }}>System Builder</div>

        <div style={{ position: "relative", display: "flex", alignItems: "center", width: "min(520px,88%)" }}>
          <svg style={{ position: "absolute", top: "24px", left: 0, width: "100%", overflow: "visible" }} height="2" preserveAspectRatio="none">
            {[0,1,2,3].map(i => (
              <line key={i} x1={`${10+i*20}%`} y1="0" x2={`${10+(i+1)*20}%`} y2="0"
                stroke="url(#ha-lg)" strokeWidth="1.5"
                strokeDasharray="200" strokeDashoffset="200"
                style={{ animation: `ha-lineGrow 0.9s cubic-bezier(0.16,1,0.3,1) ${13.8+i*1.3}s both`,
                  filter: `drop-shadow(0 0 4px ${PURPLE})` }} />
            ))}
            <defs>
              <linearGradient id="ha-lg" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={PURPLE}/><stop offset="100%" stopColor={CYAN}/>
              </linearGradient>
            </defs>
          </svg>

          {STEPS.map((s, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", zIndex: 1,
              opacity: 0, animation: `ha-stepIn 0.9s cubic-bezier(0.16,1,0.3,1) ${12.6+i*1.4}s both` }}>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", inset: "-8px", borderRadius: "50%", border: `1.5px solid ${s.color}88`,
                  animation: `ha-pulse 2.4s ease-in-out ${13.2+i*1.4}s infinite` }} />
                <div style={{ width: "44px", height: "44px", borderRadius: "50%",
                  background: `radial-gradient(circle at 35% 35%, ${s.color}ff, ${s.color}99)`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px",
                  boxShadow: `0 0 18px ${s.color}88, 0 0 36px ${s.color}44`,
                  border: `1px solid ${s.color}66` }}>
                  {s.icon}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "#fff", letterSpacing: "0.03em" }}>{s.label}</div>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: s.color, margin: "4px auto 0", boxShadow: `0 0 6px ${s.color}` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SCENE 4: 20–27s · Ecosystem ── */}
      <div style={{ position: "absolute", inset: 0,
        opacity: 0, animation: "ha-sceneIn 1s ease 20s both, ha-sceneOut 0.7s ease 26.3s both" }}>

        {/* Central mini dashboard */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(200px,38%)",
          animation: "ha-sceneIn 1s ease 20.3s both, ha-orbitF 5s ease-in-out 21s infinite" }}>
          <div style={{ ...glass, padding: "14px", borderRadius: "16px",
            boxShadow: "0 16px 50px rgba(0,0,0,0.55), 0 0 32px rgba(139,92,246,0.16)" }}>
            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.38)", marginBottom: "8px" }}>Daily Systems</div>
            {[{n:"Morning Run",s:"12d",d:true},{n:"Deep Work",s:"7d",d:true},{n:"Evening Read",s:"4d",d:false}].map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 0",
                borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                opacity: 0, animation: `ha-slideU 0.5s ease ${20.6+i*0.18}s both` }}>
                <div style={{ width: "15px", height: "15px", borderRadius: "50%", flexShrink: 0,
                  background: r.d ? `linear-gradient(135deg,${PURPLE},${CYAN})` : "rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "7px", color: "#fff" }}>
                  {r.d ? "✓" : ""}
                </div>
                <div style={{ flex: 1, fontSize: "9px", color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.n}</div>
                <div style={{ fontSize: "8px", color: AMBER, flexShrink: 0 }}>{r.s} 🔥</div>
              </div>
            ))}
            <div style={{ marginTop: "8px", height: "2.5px", background: "rgba(255,255,255,0.06)", borderRadius: "2px" }}>
              <div style={{ height: "100%", width: "67%", background: `linear-gradient(90deg,${PURPLE},${CYAN})`, borderRadius: "2px",
                transformOrigin: "left", opacity: 0, animation: "ha-barFill 0.8s ease 21.2s both" }} />
            </div>
          </div>
        </div>

        {/* AI Coach left */}
        <div style={{ position: "absolute", left: "2%", top: "50%", transform: "translateY(-50%)", width: "min(150px,24%)",
          opacity: 0, animation: "ha-bubbleL 0.9s cubic-bezier(0.16,1,0.3,1) 21.2s both, ha-orbitF 7s ease-in-out 22.5s infinite" }}>
          <div style={{ background: "rgba(139,92,246,0.12)", backdropFilter: "blur(20px)",
            border: `1px solid rgba(139,92,246,0.28)`, borderRadius: "12px", padding: "10px",
            boxShadow: `0 10px 34px rgba(139,92,246,0.26)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "7px" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: `linear-gradient(135deg,${PURPLE},${CYAN})`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", flexShrink: 0 }}>✦</div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "#fff" }}>AI Coach</div>
            </div>
            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
              "Your morning streak is at an all-time high!"
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "6px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: CYAN }} />
              <span style={{ fontSize: "8px", color: CYAN }}>Online</span>
            </div>
          </div>
        </div>

        {/* Workspace right */}
        <div style={{ position: "absolute", right: "2%", top: "50%", transform: "translateY(-50%)", width: "min(145px,23%)",
          opacity: 0, animation: "ha-bubbleR 0.9s cubic-bezier(0.16,1,0.3,1) 21.7s both, ha-orbitF 8s ease-in-out 23s infinite" }}>
          <div style={{ background: "rgba(6,182,212,0.09)", backdropFilter: "blur(20px)",
            border: `1px solid rgba(6,182,212,0.24)`, borderRadius: "12px", padding: "10px",
            boxShadow: `0 10px 34px rgba(6,182,212,0.18)` }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#fff", marginBottom: "8px" }}>🏆 Squad Goals</div>
            <div style={{ display: "flex", marginBottom: "6px" }}>
              {[PURPLE,CYAN,AMBER,"#10b981","#f97316"].map((c, i) => (
                <div key={i} style={{ width: "20px", height: "20px", borderRadius: "50%", background: c,
                  border: "1.5px solid #0a0a1a", marginLeft: i > 0 ? "-5px" : "0",
                  fontSize: "7px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
                  {["A","B","C","D","E"][i]}
                </div>
              ))}
            </div>
            <div style={{ fontSize: "8px", color: "rgba(255,255,255,0.38)" }}>5 members active</div>
          </div>
        </div>

        {/* Analytics bottom */}
        <div style={{ position: "absolute", bottom: "7%", left: "50%", transform: "translateX(-50%)", width: "min(220px,40%)",
          opacity: 0, animation: "ha-slideU 0.9s cubic-bezier(0.16,1,0.3,1) 22.2s both, ha-orbitF 6s ease-in-out 23.5s infinite" }}>
          <div style={{ background: "rgba(245,158,11,0.09)", backdropFilter: "blur(20px)",
            border: `1px solid rgba(245,158,11,0.2)`, borderRadius: "12px", padding: "10px" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#fff", marginBottom: "8px" }}>📈 Analytics</div>
            <div style={{ display: "flex", gap: "3px", alignItems: "flex-end", height: "36px" }}>
              {CHART_BARS.map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h * 0.36}px`, borderRadius: "2px 2px 0 0",
                  background: i >= 7 ? `linear-gradient(180deg,${AMBER},#f97316)` : "rgba(245,158,11,0.28)",
                  transformOrigin: "bottom", opacity: 0, animation: `ha-chartRise 0.45s ease ${22.5+i*0.1}s both` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SCENE 5: 27–30s · Logo + Tagline + CTA ── */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px",
        opacity: 0, animation: "ha-sceneIn 0.8s ease 27s both" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 55% 45% at 50% 50%, rgba(139,92,246,0.1) 0%, transparent 65%)`, pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ opacity: 0, animation: "ha-logoIn 1.1s cubic-bezier(0.16,1,0.3,1) 27.3s both", display: "flex", alignItems: "center", gap: "12px" }}>
          <svg width="44" height="44" viewBox="0 0 44 44" style={{ filter: `drop-shadow(0 0 12px ${PURPLE}88)` }}>
            <defs>
              <linearGradient id="ha-logoG" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={PURPLE}/><stop offset="100%" stopColor={CYAN}/>
              </linearGradient>
            </defs>
            <rect width="44" height="44" rx="10" fill="url(#ha-logoG)"/>
            <text x="50%" y="52%" dominantBaseline="central" textAnchor="middle" fill="#fff" fontSize="24" fontWeight="700" fontFamily="Inter,sans-serif">S</text>
          </svg>
          <span style={{ fontSize: "clamp(28px,4.5vw,40px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.82) 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Strivo
          </span>
        </div>

        {/* Typewriter tagline */}
        <div style={{ overflow: "hidden", whiteSpace: "nowrap", maxWidth: 0,
          opacity: 0, animation: "ha-typeOut 2.6s steps(60,end) 28.5s both, ha-sceneIn 0.01s ease 28.5s both" }}>
          <p style={{ margin: 0, fontSize: "clamp(9px,1.3vw,13px)", fontWeight: 300, letterSpacing: "0.04em",
            color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
            Turn goals into systems. Systems into habits. Habits into identity.
          </p>
        </div>

        {/* CTA */}
        <div style={{ opacity: 0, animation: "ha-ctaIn 0.8s cubic-bezier(0.16,1,0.3,1) 29.5s both, ha-ctaGlow 2s ease-in-out 30s infinite",
          background: `linear-gradient(135deg,${PURPLE},${CYAN})`, borderRadius: "50px",
          padding: "10px 28px", fontSize: "12px", fontWeight: 600, color: "#fff", letterSpacing: "0.03em",
          boxShadow: `0 0 20px rgba(139,92,246,0.5)`, cursor: "pointer" }}>
          Start Free →
        </div>
      </div>
    </div>
  );
}
