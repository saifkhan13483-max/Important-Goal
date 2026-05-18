import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CompletionRingProps {
  done: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: boolean;
}

export function CompletionRing({
  done,
  total,
  size = 80,
  strokeWidth = 6,
  className,
  label = true,
}: CompletionRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? Math.min(done / total, 1) : 0;

  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimatedPct(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  const offset = circumference * (1 - animatedPct);
  const isComplete = done >= total && total > 0;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      aria-label={`${done} of ${total} complete`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={
            isComplete
              ? "hsl(var(--success))"
              : "hsl(var(--primary))"
          }
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1), stroke 0.3s ease",
          }}
        />
      </svg>
      {label && (
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span
            className={cn(
              "font-bold tabular-nums",
              size >= 80 ? "text-lg" : "text-sm",
              isComplete ? "text-success" : "text-foreground"
            )}
          >
            {done}
          </span>
          <span className="text-[10px] text-muted-foreground">/{total}</span>
        </div>
      )}
    </div>
  );
}
