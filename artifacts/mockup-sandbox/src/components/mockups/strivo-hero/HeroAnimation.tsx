import { useEffect, useRef, useState } from "react";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; opacity: number;
  color: string;
}

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

export function HeroAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [key, setKey] = useState(0);

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

    const particles: Particle[] = Array.from({ length: 90 }, () => ({
      x: Math.random() * (canvas.width || 1280),
      y: Math.random() * (canvas.height || 720),
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      size: Math.random() * 1.8 + 0.3,
      opacity: Math.random() * 0.5 + 0.08,
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
        const hex = Math.floor(p.opacity * 255).toString(16).padStart(2, "0");
        ctx.fillStyle = p.color + hex;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [key]);

  const glass: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: "16px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
  };

  return (
    <div
      key={key}
      style={{
        width: "100%",
        height: "100vh",
        background: "linear-gradient(145deg, #0a0a1a 0%, #0d0920 50%, #1a1040 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800&display=swap');

        @keyframes goalsIn   { from { opacity:0; transform: scale(0.85) translateY(24px); } to { opacity:1; transform: scale(1) translateY(0); } }
        @keyframes goalsOut  { from { opacity:1; transform: scale(1); filter: blur(0); }   to { opacity:0; transform: scale(0.4); filter: blur(12px); } }
        @keyframes fragOut   { from { transform: translate(0,0) rotate(0deg) scale(1); opacity:1; } to { transform: translate(var(--fx),var(--fy)) rotate(var(--fr)) scale(0); opacity:0; } }

        @keyframes sceneIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes sceneOut  { from { opacity:1; } to { opacity:0; } }

        @keyframes dashReveal { from { opacity:0; transform: perspective(1200px) scale(0.88) translateY(28px); filter: blur(12px); } to { opacity:1; transform: perspective(1200px) scale(1) translateY(0); filter: blur(0); } }
        @keyframes dashFloat  { 0%,100% { transform: perspective(1200px) rotateX(3deg) rotateY(-3deg) translateY(0); } 50% { transform: perspective(1200px) rotateX(-3deg) rotateY(3deg) translateY(-10px); } }

        @keyframes slideL    { from { opacity:0; transform: translateX(-36px); }  to { opacity:1; transform: translateX(0); } }
        @keyframes slideR    { from { opacity:0; transform: translateX(36px); }   to { opacity:1; transform: translateX(0); } }
        @keyframes slideU    { from { opacity:0; transform: translateY(28px); }   to { opacity:1; transform: translateY(0); } }

        @keyframes ringFill  { from { stroke-dashoffset: 220; } to { stroke-dashoffset: 59; } }
        @keyframes barFill   { from { opacity:0; transform: scaleX(0); } to { opacity:1; transform: scaleX(1); } }
        @keyframes chartRise { from { opacity:0; transform: scaleY(0); } to { opacity:1; transform: scaleY(1); } }

        @keyframes stepIn    { from { opacity:0; transform: scale(0.75); filter: blur(4px); } to { opacity:1; transform: scale(1); filter: blur(0); } }
        @keyframes pulse     { 0%,100% { transform: scale(1); opacity:0.7; } 50% { transform: scale(1.6); opacity:0; } }
        @keyframes lineGrow  { from { stroke-dashoffset:200; opacity:0; } 20% { opacity:1; } to { stroke-dashoffset:0; opacity:1; } }

        @keyframes bubbleL   { from { opacity:0; transform: translateX(-56px) scale(0.85); } to { opacity:1; transform: translateX(0) scale(1); } }
        @keyframes bubbleR   { from { opacity:0; transform: translateX(56px) scale(0.85); }  to { opacity:1; transform: translateX(0) scale(1); } }
        @keyframes orbitF    { 0%,100% { transform: translateY(0) rotate(0.5deg); } 50% { transform: translateY(-10px) rotate(-0.5deg); } }

        @keyframes logoIn    { from { opacity:0; transform: scale(1.8) rotate(-8deg); filter: blur(20px); } 70% { filter: blur(0); } to { opacity:1; transform: scale(1) rotate(0deg); filter: blur(0); } }
        @keyframes typeOut   { from { max-width:0; } to { max-width: 68ch; } }
        @keyframes ctaIn     { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
        @keyframes ctaGlow   { 0%,100% { box-shadow: 0 0 24px rgba(139,92,246,0.55), 0 0 48px rgba(139,92,246,0.3); } 50% { box-shadow: 0 0 48px rgba(139,92,246,0.85), 0 0 96px rgba(139,92,246,0.5), 0 0 140px rgba(6,182,212,0.35); } }
      `}</style>

      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} />

      {/* Subtle radial glow center */}
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 60% 50% at 50% 50%, rgba(139,92,246,0.06) 0%, transparent 70%)", pointerEvents:"none" }} />

      {/* ══════════════════════════════════════════════════════
          SCENE 1 · 0–5s · "Goals" appears then shatters
          ══════════════════════════════════════════════════════ */}
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
        animation:"sceneIn 0.4s ease 0.1s both, sceneOut 0.7s ease 4.3s both" }}>

        {/* The word */}
        <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <h1 style={{
            margin:0, fontSize:"clamp(72px,11vw,134px)", fontWeight:200, color:"#fff",
            letterSpacing:"0.14em", lineHeight:1,
            textShadow:`0 0 60px rgba(139,92,246,0.45), 0 0 120px rgba(6,182,212,0.2)`,
            animation:"goalsIn 0.9s cubic-bezier(0.16,1,0.3,1) 0.4s both, goalsOut 1.1s cubic-bezier(0.4,0,1,1) 2.6s both",
          }}>
            Goals
          </h1>

          {/* Glass fragments */}
          {FRAGMENTS.map((f, i) => (
            <div key={i} style={{
              position:"absolute", top:"50%", left:"50%",
              width:`${f.w}px`, height:`${f.h}px`,
              background: f.color,
              borderRadius:"1px",
              opacity:0,
              "--fx":`${f.x}px`,
              "--fy":`${f.y}px`,
              "--fr":`${f.rot}deg`,
              animation:`fragOut 1.3s cubic-bezier(0.15,0,0.9,1) ${2.6 + f.delay}s both`,
            } as React.CSSProperties} />
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SCENE 2 · 5–12s · Dashboard UI floats in 3D
          ══════════════════════════════════════════════════════ */}
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
        opacity:0, animation:"sceneIn 1s ease 5s both, sceneOut 0.7s ease 11.3s both" }}>

        <div style={{ width:"min(680px,92vw)",
          animation:"dashReveal 1s cubic-bezier(0.16,1,0.3,1) 5.2s both, dashFloat 7s ease-in-out 6.5s infinite" }}>

          {/* Main glass panel */}
          <div style={{ ...glass, padding:"24px", borderRadius:"22px",
            boxShadow:"0 32px 90px rgba(0,0,0,0.6), 0 0 60px rgba(139,92,246,0.12), inset 0 1px 0 rgba(255,255,255,0.1)" }}>

            {/* Header row */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"18px" }}>
              <div>
                <div style={{ color:"rgba(255,255,255,0.38)", fontSize:"10px", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"4px" }}>Today</div>
                <div style={{ color:"#fff", fontSize:"20px", fontWeight:600, lineHeight:1 }}>Thursday, March 26</div>
              </div>
              <div style={{ background:"linear-gradient(135deg,#8b5cf6,#06b6d4)", borderRadius:"10px", padding:"7px 14px", fontSize:"12px", fontWeight:600, color:"#fff", boxShadow:"0 4px 16px rgba(139,92,246,0.4)" }}>
                2/3 done
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>

              {/* Streak Calendar */}
              <div style={{ ...glass, padding:"14px", opacity:0, animation:"slideL 0.65s cubic-bezier(0.16,1,0.3,1) 5.7s both" }}>
                <div style={{ color:"rgba(255,255,255,0.38)", fontSize:"9.5px", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px" }}>Streak Calendar</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"3px", marginBottom:"10px" }}>
                  {["M","T","W","T","F","S","S"].map((d,i) => (
                    <div key={i} style={{ textAlign:"center", fontSize:"8px", color:"rgba(255,255,255,0.28)" }}>{d}</div>
                  ))}
                  {Array.from({length:35},(_,i) => {
                    const on = [0,1,2,3,5,6,7,8,9,11,12,13,14,16,17,18,20,21,22,23,24,26,27,28,29,30].includes(i);
                    const shade = i > 27 ? PURPLE : i > 20 ? "#7c3aed" : "#6d28d9";
                    return (
                      <div key={i} style={{
                        height:"16px", borderRadius:"3px",
                        background: on ? shade : "rgba(255,255,255,0.05)",
                        opacity: on ? 1 : 0.35,
                        transformOrigin:"left",
                        animation: on ? `barFill 0.25s ease ${6 + i*0.018}s both` : "none",
                      }} />
                    );
                  })}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                  <span style={{ fontSize:"22px", fontWeight:700, color:AMBER }}>12</span>
                  <span style={{ fontSize:"18px" }}>🔥</span>
                  <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.38)" }}>day streak</span>
                </div>
              </div>

              {/* Progress Ring */}
              <div style={{ ...glass, padding:"14px", display:"flex", flexDirection:"column", alignItems:"center",
                opacity:0, animation:"slideR 0.65s cubic-bezier(0.16,1,0.3,1) 6.1s both" }}>
                <div style={{ color:"rgba(255,255,255,0.38)", fontSize:"9.5px", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px", alignSelf:"flex-start" }}>Completion</div>
                <div style={{ position:"relative", width:"82px", height:"82px" }}>
                  <svg width="82" height="82" viewBox="0 0 82 82" style={{ overflow:"visible" }}>
                    <defs>
                      <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={PURPLE} /><stop offset="100%" stopColor={CYAN} />
                      </linearGradient>
                    </defs>
                    <circle cx="41" cy="41" r="33" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7"/>
                    <circle cx="41" cy="41" r="33" fill="none" stroke="url(#rg)" strokeWidth="7"
                      strokeDasharray="207" strokeDashoffset="207" strokeLinecap="round"
                      transform="rotate(-90 41 41)"
                      style={{ animation:"ringFill 1.6s cubic-bezier(0.16,1,0.3,1) 6.4s both",
                        filter:`drop-shadow(0 0 6px ${PURPLE})` }} />
                  </svg>
                  <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontSize:"20px", fontWeight:700, color:"#fff" }}>73%</span>
                  </div>
                </div>
                <div style={{ display:"flex", gap:"12px", marginTop:"10px" }}>
                  {[{l:"AM",v:90,c:PURPLE},{l:"PM",v:60,c:CYAN}].map(r => (
                    <div key={r.l} style={{ textAlign:"center" }}>
                      <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.35)" }}>{r.l}</div>
                      <div style={{ fontSize:"14px", fontWeight:600, color:r.c }}>{r.v}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mood Tracker */}
              <div style={{ ...glass, padding:"14px", gridColumn:"1/-1",
                opacity:0, animation:"slideU 0.65s cubic-bezier(0.16,1,0.3,1) 6.6s both" }}>
                <div style={{ color:"rgba(255,255,255,0.38)", fontSize:"9.5px", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px" }}>Mood & Energy</div>
                <div style={{ display:"flex", gap:"6px", alignItems:"flex-end", height:"46px" }}>
                  {[58,42,72,82,68,92,76].map((h,i) => (
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"4px" }}>
                      <div style={{
                        width:"100%", height:`${h*0.44}px`, borderRadius:"4px 4px 0 0",
                        background: i===5 ? `linear-gradient(180deg,${PURPLE},${CYAN})` : `rgba(139,92,246,0.28)`,
                        transformOrigin:"bottom",
                        animation:`chartRise 0.5s ease ${6.9+i*0.09}s both`, opacity:0,
                      }} />
                      <span style={{ fontSize:"8px", color:"rgba(255,255,255,0.28)" }}>{["M","T","W","T","F","S","S"][i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SCENE 3 · 12–20s · System Builder Neural Flow
          ══════════════════════════════════════════════════════ */}
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        opacity:0, animation:"sceneIn 1s ease 12s both, sceneOut 0.7s ease 19.3s both" }}>

        <div style={{ color:"rgba(255,255,255,0.32)", fontSize:"10px", letterSpacing:"0.22em", textTransform:"uppercase", marginBottom:"36px",
          opacity:0, animation:"slideU 0.6s ease 12.3s both" }}>
          System Builder
        </div>

        <div style={{ position:"relative", display:"flex", alignItems:"center", width:"min(760px,90vw)" }}>
          {/* SVG neural lines */}
          <svg style={{ position:"absolute", top:"28px", left:0, width:"100%", overflow:"visible" }} height="2" preserveAspectRatio="none">
            {[0,1,2,3].map(i => (
              <line key={i}
                x1={`${10 + i*20}%`} y1="0" x2={`${10+(i+1)*20}%`} y2="0"
                stroke="url(#lg2)" strokeWidth="2"
                strokeDasharray="200" strokeDashoffset="200"
                style={{ animation:`lineGrow 0.9s cubic-bezier(0.16,1,0.3,1) ${13.8+i*1.3}s both`,
                  filter:`drop-shadow(0 0 5px ${PURPLE})` }}
              />
            ))}
            <defs>
              <linearGradient id="lg2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={PURPLE}/><stop offset="100%" stopColor={CYAN}/>
              </linearGradient>
            </defs>
          </svg>

          {/* Step nodes */}
          {STEPS.map((s, i) => (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"14px", zIndex:1,
              opacity:0, animation:`stepIn 0.9s cubic-bezier(0.16,1,0.3,1) ${12.6+i*1.4}s both` }}>

              <div style={{ position:"relative" }}>
                {/* Pulse ring */}
                <div style={{ position:"absolute", inset:"-10px", borderRadius:"50%", border:`1.5px solid ${s.color}88`,
                  animation:`pulse 2.4s ease-in-out ${13.2+i*1.4}s infinite` }} />
                {/* Outer glow ring */}
                <div style={{ position:"absolute", inset:"-5px", borderRadius:"50%", border:`1px solid ${s.color}44` }} />
                {/* Main node */}
                <div style={{ width:"58px", height:"58px", borderRadius:"50%",
                  background:`radial-gradient(circle at 35% 35%, ${s.color}ff, ${s.color}99)`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px",
                  boxShadow:`0 0 22px ${s.color}88, 0 0 44px ${s.color}44`,
                  border:`1px solid ${s.color}66` }}>
                  {s.icon}
                </div>
              </div>

              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:"13px", fontWeight:600, color:"#fff", letterSpacing:"0.04em" }}>{s.label}</div>
                <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:s.color, margin:"6px auto 0",
                  boxShadow:`0 0 8px ${s.color}` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Tagline for scene 3 */}
        <div style={{ marginTop:"48px", color:"rgba(255,255,255,0.28)", fontSize:"13px", letterSpacing:"0.06em",
          opacity:0, animation:"slideU 0.7s ease 19s both" }}>
          Every goal becomes a repeatable system
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SCENE 4 · 20–27s · Full Ecosystem orbiting
          ══════════════════════════════════════════════════════ */}
      <div style={{ position:"absolute", inset:0,
        opacity:0, animation:"sceneIn 1s ease 20s both, sceneOut 0.7s ease 26.3s both" }}>

        {/* Central dashboard mini */}
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"min(260px,38vw)",
          animation:"sceneIn 1s ease 20.3s both, orbitF 5s ease-in-out 21s infinite" }}>
          <div style={{ ...glass, padding:"18px", borderRadius:"20px",
            boxShadow:"0 20px 60px rgba(0,0,0,0.55), 0 0 40px rgba(139,92,246,0.18)" }}>
            <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.38)", marginBottom:"10px" }}>Daily Systems</div>
            {[{n:"Morning Run",s:"12d",d:true},{n:"Deep Work",s:"7d",d:true},{n:"Evening Read",s:"4d",d:false}].map((r,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"7px 0",
                borderBottom: i<2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                opacity:0, animation:`slideU 0.5s ease ${20.6+i*0.18}s both` }}>
                <div style={{ width:"18px", height:"18px", borderRadius:"50%", flexShrink:0,
                  background: r.d ? `linear-gradient(135deg,${PURPLE},${CYAN})` : "rgba(255,255,255,0.08)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", color:"#fff" }}>
                  {r.d ? "✓" : ""}
                </div>
                <div style={{ flex:1, fontSize:"12px", color:"rgba(255,255,255,0.82)" }}>{r.n}</div>
                <div style={{ fontSize:"10px", color:AMBER, flexShrink:0 }}>{r.s} 🔥</div>
              </div>
            ))}
            <div style={{ marginTop:"10px", height:"3px", background:"rgba(255,255,255,0.06)", borderRadius:"2px" }}>
              <div style={{ height:"100%", width:"67%", background:`linear-gradient(90deg,${PURPLE},${CYAN})`, borderRadius:"2px",
                transformOrigin:"left", opacity:0, animation:"barFill 0.8s ease 21.2s both" }} />
            </div>
          </div>
        </div>

        {/* AI Coach – left */}
        <div style={{ position:"absolute", left:"4%", top:"50%", transform:"translateY(-50%)", width:"min(196px,26vw)",
          opacity:0, animation:"bubbleL 0.9s cubic-bezier(0.16,1,0.3,1) 21.2s both, orbitF 7s ease-in-out 22.5s infinite" }}>
          <div style={{ background:"rgba(139,92,246,0.12)", backdropFilter:"blur(20px)",
            border:`1px solid rgba(139,92,246,0.28)`, borderRadius:"16px", padding:"14px",
            boxShadow:`0 12px 40px rgba(139,92,246,0.28)` }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
              <div style={{ width:"26px", height:"26px", borderRadius:"50%", background:`linear-gradient(135deg,${PURPLE},${CYAN})`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", flexShrink:0 }}>✦</div>
              <div style={{ fontSize:"12px", fontWeight:600, color:"#fff" }}>AI Coach</div>
            </div>
            <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.65)", lineHeight:1.55 }}>
              "Your morning streak is at an all-time high. Keep the momentum!"
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"5px", marginTop:"8px" }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:CYAN, boxShadow:`0 0 6px ${CYAN}` }} />
              <span style={{ fontSize:"9.5px", color:CYAN }}>Online now</span>
            </div>
          </div>
        </div>

        {/* Workspace – right */}
        <div style={{ position:"absolute", right:"4%", top:"50%", transform:"translateY(-50%)", width:"min(184px,25vw)",
          opacity:0, animation:"bubbleR 0.9s cubic-bezier(0.16,1,0.3,1) 21.7s both, orbitF 8s ease-in-out 23s infinite" }}>
          <div style={{ background:"rgba(6,182,212,0.09)", backdropFilter:"blur(20px)",
            border:`1px solid rgba(6,182,212,0.24)`, borderRadius:"16px", padding:"14px",
            boxShadow:`0 12px 40px rgba(6,182,212,0.2)` }}>
            <div style={{ fontSize:"12px", fontWeight:600, color:"#fff", marginBottom:"10px" }}>🏆 Squad Goals</div>
            <div style={{ display:"flex", marginBottom:"8px" }}>
              {[PURPLE,CYAN,AMBER,"#10b981","#f97316"].map((c,i) => (
                <div key={i} style={{ width:"24px", height:"24px", borderRadius:"50%", background:c,
                  border:"2px solid #0a0a1a", marginLeft: i>0 ? "-6px" : "0",
                  fontSize:"9px", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:600 }}>
                  {["A","B","C","D","E"][i]}
                </div>
              ))}
            </div>
            <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)", marginBottom:"8px" }}>5 members active</div>
            {[{n:"Alex",p:90},{n:"Sam",p:73}].map(m => (
              <div key={m.n} style={{ marginBottom:"5px" }}>
                <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.55)", marginBottom:"2px" }}>{m.n} — {m.p}%</div>
                <div style={{ height:"3px", background:"rgba(255,255,255,0.08)", borderRadius:"2px" }}>
                  <div style={{ height:"100%", width:`${m.p}%`, background:`linear-gradient(90deg,${CYAN},${PURPLE})`, borderRadius:"2px" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics – bottom */}
        <div style={{ position:"absolute", bottom:"8%", left:"50%", transform:"translateX(-50%)", width:"min(270px,38vw)",
          opacity:0, animation:"slideU 0.9s cubic-bezier(0.16,1,0.3,1) 22.2s both, orbitF 6s ease-in-out 23.5s infinite" }}>
          <div style={{ background:"rgba(245,158,11,0.09)", backdropFilter:"blur(20px)",
            border:`1px solid rgba(245,158,11,0.2)`, borderRadius:"16px", padding:"14px",
            boxShadow:`0 12px 40px rgba(245,158,11,0.18)` }}>
            <div style={{ fontSize:"12px", fontWeight:600, color:"#fff", marginBottom:"10px" }}>📈 Analytics</div>
            <div style={{ display:"flex", gap:"3px", alignItems:"flex-end", height:"44px" }}>
              {CHART_BARS.map((h,i) => (
                <div key={i} style={{ flex:1, height:`${h*0.44}px`, borderRadius:"3px 3px 0 0",
                  background: i>=7 ? `linear-gradient(180deg,${AMBER},#f97316)` : "rgba(245,158,11,0.28)",
                  transformOrigin:"bottom", opacity:0,
                  animation:`chartRise 0.45s ease ${22.5+i*0.1}s both` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SCENE 5 · 27–30s · Logo → Tagline → CTA
          ══════════════════════════════════════════════════════ */}
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"20px",
        opacity:0, animation:"sceneIn 0.8s ease 27s both" }}>

        {/* Background bloom */}
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse 55% 45% at 50% 50%, rgba(139,92,246,0.12) 0%, transparent 65%)`, pointerEvents:"none" }} />

        {/* Logo mark */}
        <div style={{ opacity:0, animation:"logoIn 1.1s cubic-bezier(0.16,1,0.3,1) 27.3s both", display:"flex", alignItems:"center", gap:"18px" }}>
          <svg width="60" height="60" viewBox="0 0 60 60" style={{ filter:`drop-shadow(0 0 16px ${PURPLE}88)` }}>
            <defs>
              <linearGradient id="logoG" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={PURPLE}/><stop offset="100%" stopColor={CYAN}/>
              </linearGradient>
            </defs>
            <rect width="60" height="60" rx="14" fill="url(#logoG)"/>
            <text x="50%" y="52%" dominantBaseline="central" textAnchor="middle" fill="#fff" fontSize="34" fontWeight="700" fontFamily="Inter,sans-serif">S</text>
          </svg>
          <span style={{ fontSize:"clamp(40px,6vw,58px)", fontWeight:800, color:"#fff", letterSpacing:"-0.025em",
            background:`linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.85) 100%)`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            Strivo
          </span>
        </div>

        {/* Tagline typewriter */}
        <div style={{ overflow:"hidden", whiteSpace:"nowrap", maxWidth:0,
          opacity:0, animation:"typeOut 2.6s steps(68,end) 28.5s both, sceneIn 0.01s ease 28.5s both" }}>
          <p style={{ margin:0, fontSize:"clamp(12px,1.6vw,17px)", fontWeight:300, letterSpacing:"0.04em",
            color:"rgba(255,255,255,0.52)" }}>
            Turn goals into systems. Systems into habits. Habits into identity.
          </p>
        </div>

        {/* CTA */}
        <button style={{
          marginTop:"8px", padding:"15px 42px", borderRadius:"50px",
          background:`linear-gradient(135deg, ${PURPLE}, ${CYAN})`,
          border:"none", fontSize:"15px", fontWeight:600, color:"#fff",
          cursor:"pointer", letterSpacing:"0.03em",
          opacity:0, animation:`ctaIn 0.8s cubic-bezier(0.16,1,0.3,1) 29.5s both, ctaGlow 2s ease-in-out 30s infinite`,
          boxShadow:`0 0 24px rgba(139,92,246,0.55)`,
        }}>
          Start Free →
        </button>
      </div>

      {/* Replay */}
      <button
        onClick={() => setKey(k => k + 1)}
        style={{ position:"absolute", bottom:"18px", right:"18px", zIndex:99,
          background:"rgba(255,255,255,0.06)", backdropFilter:"blur(12px)",
          border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.7)",
          padding:"7px 16px", borderRadius:"20px", fontSize:"11px", cursor:"pointer",
          transition:"background 0.2s" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
      >
        ↺ Replay
      </button>

      {/* Scene progress indicator */}
      <div style={{ position:"absolute", bottom:"18px", left:"50%", transform:"translateX(-50%)", display:"flex", gap:"6px", zIndex:99 }}>
        {["Goals","Dashboard","System","Ecosystem","Identity"].map((_, i) => (
          <div key={i} style={{ width:"28px", height:"2px", borderRadius:"2px", background:"rgba(255,255,255,0.18)" }}>
            <div style={{ height:"100%", background:`linear-gradient(90deg,${PURPLE},${CYAN})`, borderRadius:"2px", width:0,
              animation:`barFill 0.4s ease ${[0.5,5.5,12.5,20.5,27.5][i]}s both` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
