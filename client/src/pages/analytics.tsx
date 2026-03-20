import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCountUp } from "@/hooks/use-count-up";
import { useAppStore } from "@/store/auth.store";
import type { System, Goal, Checkin } from "@/types/schema";
import { getSystems } from "@/services/systems.service";
import { getGoals } from "@/services/goals.service";
import { getCheckins } from "@/services/checkins.service";
import { computeAnalytics } from "@/services/analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Area, AreaChart,
} from "recharts";
import {
  Flame, Target, Zap, TrendingUp, BarChart2, Calendar,
  Trophy, AlertCircle, Star, CheckSquare, Lightbulb,
  TrendingDown, Heart, Award, Smile, Dumbbell, Bot, Loader2, Sparkles, Download,
  ChevronRight, FileText, Lock, CheckCircle2, Filter,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateAnalyticsInsights, type AnalyticsInsight } from "@/services/ai.service";
import { cn } from "@/lib/utils";
import { getPlanFeatures } from "@/lib/plan-limits";
import { PlanGate } from "@/components/plan-gate";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

/* ─── CSV export ─────────────────────────────────────────────────── */
function buildCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map(r =>
      headers.map(h => {
        const val = r[h] == null ? "" : String(r[h]);
        return val.includes(",") || val.includes('"') || val.includes("\n")
          ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(",")
    ),
  ];
  return lines.join("\n");
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

type ExportRange = "7d" | "30d" | "90d" | "all";

function filterCheckinsByRange(
  checkins: { dateKey: string; systemId: string; status: string; moodBefore?: number | null; difficulty?: number | null; note?: string | null }[],
  range: ExportRange,
) {
  if (range === "all") return checkins;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  return checkins.filter(c => c.dateKey >= cutoffKey);
}

function exportToCsv(opts: {
  checkins: { dateKey: string; systemId: string; status: string; moodBefore?: number | null; difficulty?: number | null; note?: string | null }[];
  systems: { id: string; title: string; goalId?: string | null; active: boolean }[];
  goals: { id: string; title: string }[];
  systemStats: { systemId: string; title: string; pct: number; totalCheckins: number; missedCount: number }[];
  goalCompletion: { goalId: string; title: string; avgPct: number }[];
  dayOfWeekStats: { day: string; doneCount: number; totalCount: number; doneRate: number }[];
  streaks: Record<string, number>;
  bestStreaks: Record<string, number>;
  consistencyScores: Record<string, number>;
  resilienceScores: Record<string, number>;
  avgCompletion: number;
  topBestStreak: number;
  exportRange: ExportRange;
}) {
  const date = new Date().toISOString().slice(0, 10);
  const rangeLabel = opts.exportRange === "all" ? "All Time" : opts.exportRange === "7d" ? "Last 7 Days" : opts.exportRange === "30d" ? "Last 30 Days" : "Last 90 Days";
  const systemsById = Object.fromEntries(opts.systems.map(s => [s.id, s.title]));
  const goalsById   = Object.fromEntries(opts.goals.map(g => [g.id, g.title]));
  const systemGoalMap = Object.fromEntries(opts.systems.map(s => [s.id, s.goalId ?? ""]));

  const checkinRows = opts.checkins.map(c => ({
    Date: c.dateKey,
    System: systemsById[c.systemId] ?? c.systemId,
    Goal: systemGoalMap[c.systemId] ? (goalsById[systemGoalMap[c.systemId]] ?? "") : "",
    Status: c.status === "done" ? "Done" : c.status === "partial" ? "Partial" : c.status === "missed" ? "Missed" : c.status,
    "Mood (1-5)": c.moodBefore ?? "",
    "Difficulty (1-5)": c.difficulty ?? "",
    Notes: c.note ?? "",
  }));

  const systemRows = opts.systemStats.map(s => ({
    System: s.title,
    "Completion %": s.pct,
    "Total Check-ins": s.totalCheckins,
    Missed: s.missedCount,
    "Current Streak (days)": opts.streaks[s.systemId] ?? 0,
    "Best Streak (days)": opts.bestStreaks[s.systemId] ?? 0,
    "Consistency Score": opts.consistencyScores[s.systemId] ?? 0,
    "Resilience Score": opts.resilienceScores[s.systemId] ?? 0,
  }));

  const goalRows = opts.goalCompletion.map(g => ({
    Goal: g.title,
    "Avg Completion %": g.avgPct,
  }));

  const dowRows = opts.dayOfWeekStats.filter(d => d.totalCount > 0).map(d => ({
    "Day of Week": d.day,
    "Completion %": Math.round(d.doneRate * 100),
    "Check-ins Done": d.doneCount,
    "Total Check-ins": d.totalCount,
  }));

  const sections = [
    `Strivo Progress Report — ${date}`,
    `Date Range,${rangeLabel}`,
    `Total Check-ins in Range,${opts.checkins.length}`,
    `Avg Completion (30d),${opts.avgCompletion}%`,
    `Best Streak,${opts.topBestStreak} days`,
    "",
    "=== CHECK-IN LOG ===",
    buildCsv(checkinRows),
    "",
    "=== SYSTEM PERFORMANCE ===",
    buildCsv(systemRows),
    "",
    "=== GOAL PROGRESS ===",
    buildCsv(goalRows),
    "",
    "=== DAY OF WEEK BREAKDOWN ===",
    buildCsv(dowRows),
  ];

  downloadBlob(sections.join("\n"), `strivo-report-${date}.csv`, "text/csv;charset=utf-8;");
}

/* ─── PDF export ─────────────────────────────────────────────────── */
function pct2bar(pct: number): string {
  const color = pct >= 80 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";
  return `<div style="display:flex;align-items:center;gap:8px">
    <div style="flex:1;background:#f3f4f6;border-radius:4px;height:8px;overflow:hidden">
      <div style="width:${pct}%;height:100%;background:${color};border-radius:4px"></div>
    </div>
    <span style="font-size:12px;font-weight:700;color:${color};min-width:36px;text-align:right">${pct}%</span>
  </div>`;
}

function exportToPdf(opts: {
  userName?: string;
  avgCompletion: number;
  totalCheckins: number;
  topBestStreak: number;
  activeSystems: number;
  totalSystems: number;
  systemStats: { systemId: string; title: string; pct: number; totalCheckins: number; missedCount: number }[];
  goalCompletion: { goalId: string; title: string; avgPct: number }[];
  dayOfWeekStats: { day: string; doneCount: number; totalCount: number; doneRate: number }[];
  streaks: Record<string, number>;
  consistencyScores: Record<string, number>;
  resilienceScores: Record<string, number>;
  streakEntries: { title: string; streak: number }[];
  moodBuckets: { mood: number; count: number; completionPct: number }[];
  hasMoodData: boolean;
  exportRange: ExportRange;
  filteredCheckinCount: number;
}) {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const dateShort = new Date().toISOString().slice(0, 10);
  const rangeLabel = opts.exportRange === "all" ? "All Time" : opts.exportRange === "7d" ? "Last 7 Days" : opts.exportRange === "30d" ? "Last 30 Days" : "Last 90 Days";

  const completionColor = opts.avgCompletion >= 80 ? "#16a34a" : opts.avgCompletion >= 50 ? "#d97706" : "#dc2626";

  const systemRows = opts.systemStats
    .filter(s => s.totalCheckins > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 25)
    .map((s, i) => {
      const rank = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      const rowBg = i % 2 === 0 ? "#fff" : "#fafafa";
      const consistency = opts.consistencyScores[s.systemId] ?? 0;
      const resilience = opts.resilienceScores[s.systemId] ?? 0;
      return `<tr style="background:${rowBg}">
        <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;font-weight:500">${rank} ${s.title}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;min-width:140px">${pct2bar(s.pct)}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#374151">${s.totalCheckins}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:${s.missedCount > 5 ? "#dc2626" : "#374151"}">${s.missedCount}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#7c3aed;font-weight:700">${opts.streaks[s.systemId] ?? 0}d</td>
        <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:${consistency >= 70 ? "#16a34a" : consistency >= 40 ? "#d97706" : "#6b7280"};font-weight:600">${consistency}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:${resilience >= 70 ? "#16a34a" : resilience >= 40 ? "#d97706" : "#6b7280"};font-weight:600">${resilience}</td>
      </tr>`;
    }).join("");

  const goalRows = opts.goalCompletion
    .slice(0, 15)
    .map((g, i) => {
      const rowBg = i % 2 === 0 ? "#fff" : "#fafafa";
      return `<tr style="background:${rowBg}">
        <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;font-weight:500">${g.title}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;min-width:160px">${pct2bar(g.avgPct)}</td>
      </tr>`;
    }).join("");

  const dowCols = opts.dayOfWeekStats.filter(d => d.totalCount > 0).map(d => {
    const rawPct = d.doneRate > 1 ? d.doneRate : d.doneRate * 100;
    const pctVal = Math.min(100, Math.round(rawPct));
    const barH = Math.max(2, Math.round((pctVal / 100) * 13));
    const barColor = pctVal >= 80 ? "#16a34a" : pctVal >= 50 ? "#d97706" : "#dc2626";
    return `<td style="text-align:center;vertical-align:bottom;padding:6px 8px">
      <div style="display:flex;flex-direction:column;align-items:center;gap:5px">
        <span style="font-size:12px;font-weight:700;color:${barColor}">${pctVal}%</span>
        <div style="width:32px;height:${barH}px;background:${barColor};border-radius:5px 5px 0 0;box-shadow:0 2px 4px ${barColor}40"></div>
        <span style="font-size:11px;color:#6b7280;font-weight:500">${d.day.slice(0, 3)}</span>
        <span style="font-size:9px;color:#9ca3af">${d.doneCount}/${d.totalCount}</span>
      </div>
    </td>`;
  }).join("");

  const streakRows = opts.streakEntries.slice(0, 8).map((e, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    const rowBg = i % 2 === 0 ? "#fff" : "#fafafa";
    return `<tr style="background:${rowBg}">
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0">${medal} ${e.title}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;color:#7c3aed">${e.streak} days 🔥</td>
    </tr>`;
  }).join("");

  const moodRows = opts.hasMoodData ? opts.moodBuckets.filter(b => b.count > 0).map(b => {
    const moodLabel = b.mood === 1 ? "😞 Very Low" : b.mood === 2 ? "😕 Low" : b.mood === 3 ? "😐 Neutral" : b.mood === 4 ? "😊 Good" : "😄 Great";
    const rowBg = (b.mood % 2 === 0) ? "#fff" : "#fafafa";
    return `<tr style="background:${rowBg}">
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0">${moodLabel}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#374151">${b.count}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;min-width:140px">${pct2bar(b.completionPct)}</td>
    </tr>`;
  }).join("") : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Strivo Progress Report — ${dateShort}</title>
  <style>
    @page { size: A4; margin: 16mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #111827; background: #fff; font-size: 13px; line-height: 1.5; }
    .page { max-width: 800px; margin: 0 auto; padding: 28px 24px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #7c3aed; margin-bottom: 28px; gap: 16px; flex-wrap: wrap; }
    .logo-mark { display: flex; align-items: center; gap: 12px; }
    .logo-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #7c3aed, #5b21b6); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 18px; flex-shrink: 0; }
    .logo-text { font-size: 24px; font-weight: 800; color: #7c3aed; letter-spacing: -0.5px; line-height: 1; }
    .logo-sub { font-size: 11px; color: #9ca3af; margin-top: 3px; }
    .logo-range { font-size: 10px; color: #7c3aed; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 4px; padding: 2px 7px; display: inline-block; margin-top: 4px; font-weight: 600; }
    .meta { text-align: right; font-size: 12px; color: #6b7280; line-height: 1.8; }
    .meta strong { color: #111827; font-size: 15px; display: block; font-weight: 700; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1.5px solid #e5e7eb; display: flex; align-items: center; gap: 8px; }
    .section-title .dot { width: 10px; height: 10px; border-radius: 50%; background: #7c3aed; display: inline-block; flex-shrink: 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 28px; }
    .stat-card { background: linear-gradient(135deg, #faf5ff, #f5f3ff); border: 1.5px solid #e9d5ff; border-radius: 12px; padding: 14px 12px; text-align: center; }
    .stat-value { font-size: 26px; font-weight: 800; color: #7c3aed; line-height: 1; }
    .stat-label { font-size: 11px; color: #6b7280; margin-top: 5px; font-weight: 500; }
    .stat-sub { font-size: 10px; color: #9ca3af; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f9fafb; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #6b7280; padding: 9px 12px; text-align: left; border-bottom: 1.5px solid #e5e7eb; }
    .table-wrap { border: 1.5px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
    .print-hint { background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1px solid #fcd34d; border-radius: 10px; padding: 11px 16px; font-size: 12px; color: #92400e; margin-bottom: 24px; display: flex; align-items: center; gap: 10px; }
    ul { list-style: none; padding: 0; margin: 0; }
    .dow-wrap { border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 10px 12px 8px; }
    .footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 10px; text-align: center; }
    .badge-green { background: #dcfce7; color: #16a34a; border-radius: 4px; padding: 2px 7px; font-size: 10px; font-weight: 700; }
    .badge-yellow { background: #fef9c3; color: #d97706; border-radius: 4px; padding: 2px 7px; font-size: 10px; font-weight: 700; }
    .badge-red { background: #fee2e2; color: #dc2626; border-radius: 4px; padding: 2px 7px; font-size: 10px; font-weight: 700; }
    @media print {
      .print-hint { display: none !important; }
      body { font-size: 12px; }
      .page { padding: 0; }
      .section { page-break-inside: avoid; }
      .stats-grid { grid-template-columns: repeat(4, 1fr); }
    }
    @media (max-width: 600px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .header { flex-direction: column; }
      .meta { text-align: left; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="print-hint">
      💡 <span><strong>Save as PDF:</strong> Press <kbd>Ctrl+P</kbd> (or <kbd>Cmd+P</kbd> on Mac) &rarr; choose <strong>"Save as PDF"</strong> as destination. Set margins to <strong>None</strong> or <strong>Minimum</strong> for best results.</span>
    </div>

    <div class="header">
      <div class="logo-mark">
        <div class="logo-icon">S</div>
        <div>
          <div class="logo-text">Strivo</div>
          <div class="logo-sub">Progress Report</div>
          <div class="logo-range">${rangeLabel}</div>
        </div>
      </div>
      <div class="meta">
        ${opts.userName ? `<strong>${opts.userName}</strong>` : ""}
        <span>Generated on ${date}</span>
        <span style="display:block;color:#9ca3af;font-size:10px">${opts.filteredCheckinCount} check-ins included</span>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Summary</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value" style="color:${completionColor}">${opts.avgCompletion}%</div>
          <div class="stat-label">Avg Completion</div>
          <div class="stat-sub">last 30 days</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${opts.totalCheckins}</div>
          <div class="stat-label">Total Check-ins</div>
          <div class="stat-sub">all time</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${opts.topBestStreak}d</div>
          <div class="stat-label">Best Streak</div>
          <div class="stat-sub">personal record</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${opts.activeSystems}</div>
          <div class="stat-label">Active Systems</div>
          <div class="stat-sub">of ${opts.totalSystems} total</div>
        </div>
      </div>
    </div>

    ${systemRows ? `
    <!-- System Performance -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> System Performance</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>System</th>
              <th style="min-width:140px">Completion</th>
              <th style="text-align:center">Check-ins</th>
              <th style="text-align:center">Missed</th>
              <th style="text-align:center">Streak</th>
              <th style="text-align:center">Consistency</th>
              <th style="text-align:center">Resilience</th>
            </tr>
          </thead>
          <tbody>${systemRows}</tbody>
        </table>
      </div>
      <p style="font-size:10px;color:#9ca3af;margin-top:8px">Consistency = % of days showed up (last 30). Resilience = habit-building score including comeback rate.</p>
    </div>` : ""}

    ${goalRows ? `
    <!-- Goal Progress -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Goal Progress</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Goal</th>
              <th style="min-width:160px">Avg Completion</th>
            </tr>
          </thead>
          <tbody>${goalRows}</tbody>
        </table>
      </div>
    </div>` : ""}

    ${streakRows ? `
    <!-- Active Streaks Leaderboard -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Active Streaks Leaderboard</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>System</th><th style="text-align:right">Current Streak</th></tr></thead>
          <tbody>${streakRows}</tbody>
        </table>
      </div>
    </div>` : ""}

    ${dowCols ? `
    <!-- Day of Week Breakdown -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Day of Week Breakdown</div>
      <div class="dow-wrap">
        <table><tbody><tr style="vertical-align:bottom">${dowCols}</tr></tbody></table>
      </div>
    </div>` : ""}

    ${moodRows ? `
    <!-- Mood vs. Completion -->
    <div class="section">
      <div class="section-title"><span class="dot"></span> Mood vs. Completion</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Mood</th><th style="text-align:center">Days</th><th style="min-width:140px">Completion Rate</th></tr></thead>
          <tbody>${moodRows}</tbody>
        </table>
      </div>
    </div>` : ""}

    <div class="footer">
      Strivo &mdash; Build something that survives hard days &mdash; Generated ${date}
    </div>
  </div>

  <script>
    window.addEventListener("load", function() {
      setTimeout(function() { window.print(); }, 700);
    });
  <\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    return false;
  }
  setTimeout(() => URL.revokeObjectURL(url), 90000);
  return true;
}

/* ─── Metric card ────────────────────────────────────────────────── */
function MetricCard({ label, value, sub, icon: Icon, color, accentBg }: any) {
  const rawNum = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, ""));
  const suffix = typeof value === "string" ? String(value).replace(/[0-9.]/g, "") : "";
  const isNumeric = !isNaN(rawNum);
  const animated = useCountUp(isNumeric ? rawNum : 0, 800);

  return (
    <Card className="overflow-hidden">
      <div className={cn("h-1 w-full", accentBg ?? "bg-primary/40")} />
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium mb-1 leading-none">{label}</p>
            <p className="text-2xl sm:text-3xl font-extrabold leading-none" data-testid={`metric-${label.toLowerCase().replace(/ /g, "-")}`}>
              {isNumeric ? `${animated}${suffix}` : value}
            </p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1.5">{sub}</p>}
          </div>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Custom chart tooltip ───────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-xl p-3 text-sm shadow-xl">
        <p className="font-semibold mb-1.5 text-foreground">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-xs" style={{ color: p.color }}>
            {p.name}: <strong>{p.value}{p.name === "Completion %" || p.name === "Done %" ? "%" : ""}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/* ─── Section header helper ──────────────────────────────────────── */
function SectionTitle({ icon: Icon, color, title, subtitle }: { icon: any; color: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-0.5">
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight">{title}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground leading-tight">{subtitle}</p>}
      </div>
    </div>
  );
}

type Period = "daily" | "weekly" | "monthly";

/* ─── Main page ─────────────────────────────────────────────────── */
export default function Analytics() {
  const { user } = useAppStore();
  const userId = user?.id ?? "";
  const [period, setPeriod] = useState<Period>("daily");
  const [exportRange, setExportRange] = useState<ExportRange>("all");
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const { toast } = useToast();
  const features = getPlanFeatures(user?.plan);

  const { data: systems = [], isLoading: systemsLoading } = useQuery<System[]>({
    queryKey: ["systems", userId],
    queryFn: () => getSystems(userId),
    enabled: !!userId,
  });

  const { data: goals = [], isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ["goals", userId],
    queryFn: () => getGoals(userId),
    enabled: !!userId,
  });

  const { data: checkins = [], isLoading: checkinsLoading } = useQuery<Checkin[]>({
    queryKey: ["checkins", userId],
    queryFn: () => getCheckins(userId),
    enabled: !!userId,
  });

  const isLoading = systemsLoading || goalsLoading || checkinsLoading;

  const analytics = useMemo(() => computeAnalytics(checkins, systems, goals), [checkins, systems, goals]);

  const {
    streaks, bestStreaks, topBestStreak,
    consistencyScores, weeklyVotes, comebackStreaks, resilienceScores,
    dailyChart, weeklyChart, monthlyChart,
    categoryBreakdown, systemStats, goalCompletion,
    last30Days, dayOfWeekStats, moodBuckets, difficultyBuckets,
    hasMoodData, hasDifficultyData,
  } = analytics;

  const avgCompletion = useMemo(() => {
    const daysWithData = (last30Days as any[]).filter(d => d.total > 0);
    if (daysWithData.length === 0) return 0;
    return Math.round(daysWithData.reduce((sum: number, d: any) => sum + (d.done / d.total) * 100, 0) / daysWithData.length);
  }, [last30Days]);

  const streakEntries = useMemo(() =>
    Object.entries(streaks)
      .filter(([, v]) => (v as number) > 0)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5)
      .map(([id, streak]) => ({
        title: systems.find(s => s.id === id)?.title ?? id,
        streak: streak as number,
      })),
  [streaks, systems]);

  const filteredCheckins = useMemo(
    () => filterCheckinsByRange(checkins, exportRange),
    [checkins, exportRange],
  );

  const handleExportCsv = useCallback(async () => {
    if (checkins.length === 0) {
      toast({ title: "No data to export", description: "Complete some check-ins first to export your data.", variant: "destructive" });
      return;
    }
    setIsExportingCsv(true);
    try {
      await new Promise(r => setTimeout(r, 80));
      exportToCsv({
        checkins: filteredCheckins,
        systems,
        goals,
        systemStats,
        goalCompletion,
        dayOfWeekStats,
        streaks,
        bestStreaks,
        consistencyScores,
        resilienceScores,
        avgCompletion,
        topBestStreak,
        exportRange,
      });
      const rangeLabel = exportRange === "all" ? "all time" : exportRange === "7d" ? "last 7 days" : exportRange === "30d" ? "last 30 days" : "last 90 days";
      toast({ title: "CSV downloaded!", description: `${filteredCheckins.length} check-ins exported (${rangeLabel}).` });
    } catch {
      toast({ title: "Export failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsExportingCsv(false);
    }
  }, [checkins, filteredCheckins, systems, goals, systemStats, goalCompletion, dayOfWeekStats, streaks, bestStreaks, consistencyScores, resilienceScores, avgCompletion, topBestStreak, exportRange, toast]);

  const handleExportPdf = useCallback(async () => {
    if (checkins.length === 0) {
      toast({ title: "No data to export", description: "Complete some check-ins first to export your data.", variant: "destructive" });
      return;
    }
    setIsExportingPdf(true);
    try {
      await new Promise(r => setTimeout(r, 80));
      const success = exportToPdf({
        userName: user?.name,
        avgCompletion,
        totalCheckins: analytics.totalCheckins,
        topBestStreak,
        activeSystems: analytics.activeSystems,
        totalSystems: analytics.totalSystems,
        systemStats,
        goalCompletion,
        dayOfWeekStats,
        streaks,
        consistencyScores,
        resilienceScores,
        streakEntries,
        moodBuckets,
        hasMoodData,
        exportRange,
        filteredCheckinCount: filteredCheckins.length,
      });
      if (!success) {
        toast({ title: "Pop-up blocked", description: "Please allow pop-ups for this site and try again.", variant: "destructive" });
      } else {
        toast({ title: "PDF report opened!", description: "Use your browser's print dialog and choose 'Save as PDF'." });
      }
    } catch {
      toast({ title: "Export failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsExportingPdf(false);
    }
  }, [checkins, filteredCheckins, user, avgCompletion, analytics, topBestStreak, systemStats, goalCompletion, dayOfWeekStats, streaks, consistencyScores, resilienceScores, streakEntries, moodBuckets, hasMoodData, exportRange, toast]);

  const insightCards = useMemo(() => {
    if (checkins.length < 3) return [];
    const cards: { icon: any; text: string; type: "positive" | "neutral" | "tip" }[] = [];

    const topStreakEntry = Object.entries(analytics.bestStreaks)
      .filter(([, v]) => (v as number) > 0)
      .sort((a, b) => (b[1] as number) - (a[1] as number))[0];
    if (topStreakEntry) {
      const sys = systems.find(s => s.id === topStreakEntry[0]);
      const streak = topStreakEntry[1] as number;
      if (streak >= 7) cards.push({ icon: Flame, text: `Your longest streak is ${streak} days on "${sys?.title}". That's real consistency.`, type: "positive" });
    }

    if (avgCompletion >= 80) cards.push({ icon: Trophy, text: `You complete habits ${avgCompletion}% of the time on average. That puts you ahead of most people.`, type: "positive" });
    else if (avgCompletion >= 50) cards.push({ icon: TrendingUp, text: `You're completing about ${avgCompletion}% of habits on average. Getting above 70% is the next milestone.`, type: "neutral" });
    else if (avgCompletion > 0) cards.push({ icon: Heart, text: `Consistency takes time. At ${avgCompletion}% avg, consider simplifying — the minimum should feel almost too easy.`, type: "tip" });

    const topConsistent = [...systemStats].filter(s => s.totalCheckins >= 5).sort((a, b) => b.pct - a.pct)[0];
    if (topConsistent && topConsistent.pct >= 70)
      cards.push({ icon: Award, text: `"${topConsistent.title}" is your most reliable habit at ${topConsistent.pct}% completion. It's becoming automatic.`, type: "positive" });

    const topMissed = [...systemStats].filter(s => s.totalCheckins >= 5 && s.missedCount > 0).sort((a, b) => b.missedCount - a.missedCount)[0];
    if (topMissed && topMissed.pct < 50)
      cards.push({ icon: Lightbulb, text: `"${topMissed.title}" is being missed often. Try a 2-minute version — doing less is better than skipping.`, type: "tip" });

    if (hasMoodData) {
      const highMood = moodBuckets.filter(b => b.mood >= 4 && b.count > 0);
      const lowMood  = moodBuckets.filter(b => b.mood <= 2 && b.count > 0);
      if (highMood.length && lowMood.length) {
        const avgHigh = Math.round(highMood.reduce((s, b) => s + b.completionPct, 0) / highMood.length);
        const avgLow  = Math.round(lowMood.reduce((s, b) => s + b.completionPct, 0) / lowMood.length);
        if (avgHigh > avgLow + 15)
          cards.push({ icon: Smile, text: `On high-mood days you complete ${avgHigh}% vs. ${avgLow}% on low-mood days. Your fallback plan matters most on hard days.`, type: "tip" });
      }
    }

    const total = analytics.totalCheckins;
    if (total >= 100) cards.push({ icon: Star, text: `You've logged ${total} check-ins all time. That's ${total} decisions to show up for yourself. Remarkable.`, type: "positive" });
    else if (total >= 30) cards.push({ icon: TrendingUp, text: `${total} total check-ins so far. Research says 66 days to form a habit — you're building real momentum.`, type: "neutral" });

    return cards.slice(0, 4);
  }, [checkins, systems, systemStats, analytics, avgCompletion, hasMoodData, hasDifficultyData, moodBuckets, difficultyBuckets]);

  const chartData = period === "daily" ? dailyChart : period === "weekly" ? weeklyChart : monthlyChart;

  const topStreaks = Object.entries(streaks)
    .filter(([, v]) => (v as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5);

  const topBestStreakEntries = Object.entries(bestStreaks)
    .filter(([, v]) => (v as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5);

  const categoryData = Object.entries(categoryBreakdown).map(([cat, count]) => ({
    category: cat.charAt(0).toUpperCase() + cat.slice(1),
    Goals: count as number,
  }));

  const mostConsistent = [...systemStats].filter(s => s.totalCheckins >= 3).sort((a, b) => b.pct - a.pct).slice(0, 5);
  const mostMissed     = [...systemStats].filter(s => s.totalCheckins >= 3 && s.missedCount > 0).sort((a, b) => b.missedCount - a.missedCount).slice(0, 5);

  const hasData     = checkins.length > 0;
  const hasDowData  = dayOfWeekStats.some(d => d.totalCount > 0);

  const topSystemForAi = useMemo(() => {
    const top = [...systemStats].filter(s => s.totalCheckins >= 3).sort((a, b) => b.pct - a.pct)[0];
    return top?.title;
  }, [systemStats]);

  const weakestSystemForAi = useMemo(() => {
    const weak = [...systemStats].filter(s => s.totalCheckins >= 3 && s.missedCount > 0).sort((a, b) => b.missedCount - a.missedCount)[0];
    return weak?.pct < 50 ? weak?.title : undefined;
  }, [systemStats]);

  const aiInsightsKey = ["ai-analytics-insights", userId, avgCompletion, topBestStreak, analytics.totalCheckins];

  const {
    data: aiInsights = [],
    isLoading: aiInsightsLoading,
    refetch: refetchAiInsights,
  } = useQuery<AnalyticsInsight[]>({
    queryKey: aiInsightsKey,
    queryFn: () => generateAnalyticsInsights({
      systemNames: systems.filter(s => s.active).map(s => s.title),
      avgCompletion, bestStreak: topBestStreak,
      totalCheckins: analytics.totalCheckins,
      topSystem: topSystemForAi, weakestSystem: weakestSystemForAi,
      userName: user?.name,
    }),
    enabled: !!userId && features.aiAnalyticsInsights && analytics.totalCheckins >= 3 && !isLoading,
    staleTime: 1000 * 60 * 30,
    retry: false,
  });

  const periodLabel: Record<Period, string> = {
    daily: "Last 14 days", weekly: "Last 8 weeks", monthly: "Last 6 months",
  };

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <div className="min-h-screen" aria-busy="true" aria-label="Loading progress insights">
        <span className="sr-only" role="status">Loading your progress data, please wait…</span>
        {/* Hero skeleton */}
        <div className="gradient-brand h-44 sm:h-48" />
        <div className="px-4 sm:px-6 py-5 max-w-5xl mx-auto space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
          <div className="grid md:grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  /* ── Completion rate color helper ── */
  const completionColor = avgCompletion >= 70 ? "text-chart-3" : avgCompletion >= 40 ? "text-chart-4" : "text-destructive";

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden gradient-brand text-white">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10 bg-white rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 opacity-8 bg-white rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative px-4 sm:px-6 py-6 sm:py-8 max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-4 h-4 text-white/70" />
                <p className="text-white/70 text-xs font-medium tracking-wide uppercase">Progress Insights</p>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">Your Progress</h1>
              <p className="text-white/60 text-xs sm:text-sm mt-0.5">Track consistency and growth over time</p>
            </div>
            {features.csvPdfExport ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={isLoading || checkins.length === 0}
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl bg-white/15 border border-white/25 text-sm font-medium hover:bg-white/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-sm flex-shrink-0"
                    data-testid="button-export-menu"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={handleExportCsv} disabled={isExportingCsv} data-testid="button-export-csv">
                    {isExportingCsv ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-2 text-green-600" />}
                    <div>
                      <div className="font-medium">{isExportingCsv ? "Preparing…" : "Export CSV"}</div>
                      <div className="text-[11px] text-muted-foreground">Excel-compatible spreadsheet</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPdf} disabled={isExportingPdf} data-testid="button-export-pdf">
                    {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-2 text-primary" />}
                    <div>
                      <div className="font-medium">{isExportingPdf ? "Preparing…" : "Export PDF"}</div>
                      <div className="text-[11px] text-muted-foreground">Full progress report</div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/pricing">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-sm font-medium hover:bg-white/20 transition-colors backdrop-blur-sm flex-shrink-0 opacity-70"
                  data-testid="button-export-locked"
                  title="Upgrade to Pro to export your data"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                  <span className="hidden sm:inline text-xs opacity-70">(Pro+)</span>
                </button>
              </Link>
            )}
          </div>

          {/* Hero stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: "Avg Completion", value: `${avgCompletion}%`, sub: "last 30 days", icon: TrendingUp },
              { label: "Total Check-ins", value: analytics.totalCheckins, sub: "all time", icon: CheckSquare },
              { label: "Best Streak",     value: `${topBestStreak}d`,  sub: "personal record", icon: Flame },
              { label: "Active Systems",  value: analytics.activeSystems, sub: `of ${analytics.totalSystems} total`, icon: Zap },
            ].map(s => (
              <div key={s.label} className="bg-white/12 rounded-2xl p-3 sm:p-4 backdrop-blur-sm border border-white/15">
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className="w-3 h-3 text-white/60" />
                  <p className="text-white/60 text-[10px] sm:text-xs font-medium leading-none">{s.label}</p>
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-white leading-none">{s.value}</p>
                <p className="text-white/50 text-[10px] mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="px-4 sm:px-6 py-5 max-w-5xl mx-auto space-y-5">

        {/* AI-powered insights — Pro/Elite only */}
        {features.aiAnalyticsInsights && analytics.totalCheckins >= 3 && (
          <Card className="overflow-hidden">
            <div className="h-1 w-full gradient-brand" />
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <SectionTitle icon={Bot} color="bg-primary/10 text-primary" title="AI Insights" subtitle="Personalized analysis of your habits" />
                <button type="button" onClick={() => refetchAiInsights()} disabled={aiInsightsLoading}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border hover:bg-muted/40"
                  data-testid="button-refresh-ai-insights">
                  {aiInsightsLoading ? <><Loader2 className="w-3 h-3 animate-spin" />Analyzing…</> : <><Sparkles className="w-3 h-3" />Refresh</>}
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {aiInsightsLoading ? (
                <div className="grid sm:grid-cols-3 gap-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl border border-border/50 bg-muted/20 animate-pulse" />)}
                </div>
              ) : aiInsights.length > 0 ? (
                <div className="grid sm:grid-cols-3 gap-3">
                  {aiInsights.map((insight, i) => {
                    const styles = {
                      positive: { card: "bg-chart-3/8 border-chart-3/20", icon: "text-chart-3" },
                      neutral:  { card: "bg-primary/8 border-primary/20", icon: "text-primary" },
                      tip:      { card: "bg-chart-4/8 border-chart-4/20", icon: "text-chart-4" },
                    };
                    const s = styles[insight.type];
                    return (
                      <div key={i} className={cn("flex items-start gap-3 p-4 rounded-xl border", s.card)} data-testid={`ai-insight-card-${i}`}>
                        <Bot className={cn("w-3.5 h-3.5 flex-shrink-0 mt-0.5", s.icon)} />
                        <p className="text-xs text-foreground leading-relaxed">{insight.text}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Text-based insight cards */}
        {insightCards.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-3">
            {insightCards.map((card, i) => {
              const styles = {
                positive: { card: "bg-chart-3/8 border-chart-3/20", icon: "bg-chart-3/15 text-chart-3" },
                neutral:  { card: "bg-primary/8 border-primary/20",  icon: "bg-primary/15 text-primary" },
                tip:      { card: "bg-chart-4/8 border-chart-4/20",  icon: "bg-chart-4/15 text-chart-4" },
              };
              const s = styles[card.type];
              return (
                <div key={i} className={cn("flex items-start gap-3 p-4 rounded-2xl border", s.card)} data-testid={`insight-card-${i}`}>
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", s.icon)}>
                    <card.icon className="w-4 h-4" />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{card.text}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!hasData && (
          <Card className="border-primary/20 overflow-hidden">
            <div className="h-1 gradient-brand" />
            <CardContent className="p-10 sm:p-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <BarChart2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">Your progress story starts here</h3>
              <p className="text-muted-foreground text-sm mb-3 max-w-sm mx-auto leading-relaxed">
                Once you start checking in on your systems each day, you'll see charts, streaks, consistency scores, and growth over time.
              </p>
              <p className="text-xs text-muted-foreground mb-6">Even one check-in is enough to start.</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link href="/checkins">
                  <Button className="gap-2 rounded-xl h-10" data-testid="button-analytics-go-checkin">
                    <CheckSquare className="w-4 h-4" />
                    Check in today
                  </Button>
                </Link>
                {systems.length === 0 && (
                  <Link href="/systems/new">
                    <Button variant="outline" className="gap-2 rounded-xl h-10" data-testid="button-analytics-build-system">
                      Build a system first
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard icon={Target}    label="Total Goals"    value={analytics.totalGoals}    sub={`${analytics.activeGoals} active`}    color="bg-primary/10 text-primary"   accentBg="bg-primary/40" />
          <MetricCard icon={Zap}       label="Total Systems"  value={analytics.totalSystems}  sub={`${analytics.activeSystems} active`}  color="bg-chart-2/10 text-chart-2"   accentBg="bg-chart-2/50" />
          <MetricCard icon={Calendar}  label="Total Check-ins" value={analytics.totalCheckins} sub="all time"                            color="bg-chart-3/10 text-chart-3"   accentBg="bg-chart-3/50" />
          <MetricCard icon={TrendingUp} label="Avg Completion" value={`${avgCompletion}%`}     sub="last 30 days"                        color="bg-chart-4/10 text-chart-4"   accentBg="bg-chart-4/50" />
        </div>

        {/* Upgrade prompt for free users */}
        {!features.betterAnalytics && (
          <PlanGate
            requiredPlan="starter"
            featureLabel="Charts & Detailed Insights"
            description="Upgrade to Starter to unlock habit charts, streak tracking, consistency metrics, and per-system breakdowns."
            compact
          />
        )}

        {/* Per-system consistency metrics — Starter+ */}
        {features.betterAnalytics && hasData && systems.filter(s => s.active).length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <SectionTitle icon={TrendingUp} color="bg-chart-2/10 text-chart-2" title="Consistency Metrics" subtitle="Beyond raw streaks — how reliably you show up over time" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {systems.filter(s => s.active).map(sys => {
                  const consistency = consistencyScores[sys.id] ?? 0;
                  const votes      = weeklyVotes[sys.id] ?? 0;
                  const comeback   = comebackStreaks[sys.id] ?? 0;
                  const resilience = resilienceScores[sys.id] ?? 0;
                  const barColor   = consistency >= 70 ? "bg-chart-3" : consistency >= 40 ? "bg-chart-4" : "bg-destructive/60";

                  const last7Days = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(); d.setDate(d.getDate() - (6 - i));
                    const dateKey = d.toISOString().split("T")[0];
                    const checkin = checkins.find(c => c.systemId === sys.id && c.dateKey === dateKey);
                    return {
                      dateKey,
                      label: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
                      status: checkin?.status ?? null,
                    };
                  });

                  const perfectWeek = votes === 7;
                  const graceDayUsed = votes === 6;
                  const fiveOfSeven  = votes >= 5;

                  return (
                    <div key={sys.id} className="p-4 rounded-2xl border border-border/50 bg-muted/20 space-y-3" data-testid={`consistency-row-${sys.id}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">{sys.title}</p>
                        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                          {perfectWeek && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-chart-3/15 text-chart-3" data-testid={`badge-perfect-week-${sys.id}`}>Perfect week 🏆</span>
                          )}
                          {graceDayUsed && !perfectWeek && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-chart-2/15 text-chart-2" data-testid={`badge-grace-day-${sys.id}`}>Grace day used</span>
                          )}
                          {fiveOfSeven && !graceDayUsed && !perfectWeek && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-chart-4/15 text-chart-4" data-testid={`badge-five-of-seven-${sys.id}`}>5/7 ✓</span>
                          )}
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                            resilience >= 70 ? "bg-chart-3/15 text-chart-3" :
                            resilience >= 40 ? "bg-chart-4/15 text-chart-4" :
                            "bg-muted text-muted-foreground")}>
                            Resilience {resilience}
                          </span>
                        </div>
                      </div>

                      {/* 7-dot weekly visualization */}
                      <div className="flex items-center gap-1" data-testid={`weekly-dots-${sys.id}`}>
                        {last7Days.map(day => (
                          <div key={day.dateKey} className="flex flex-col items-center gap-1 flex-1">
                            <div className={cn(
                              "w-full h-6 rounded-lg transition-all",
                              day.status === "done"    ? "bg-chart-3" :
                              day.status === "partial" ? "bg-chart-4/70" :
                              day.status === "missed"  ? "bg-destructive/30" :
                              "bg-muted/50 border border-border/40",
                            )} title={`${day.dateKey}: ${day.status ?? "no check-in"}`} />
                            <span className="text-[9px] text-muted-foreground leading-none font-medium">{day.label}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${consistency}%` }} />
                        </div>
                        <span className="text-xs font-semibold w-24 text-right flex-shrink-0 text-foreground">{consistency}% · {votes}/7 wk</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Last 30 days · Comeback run: <strong className="text-foreground">{comeback} day{comeback !== 1 ? "s" : ""}</strong>
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Resilience score</strong> rewards showing up consistently and for coming back after a miss — not just unbroken streaks. A score of 70+ means you're reliably building this habit.
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Grace day</strong> — missing one day per week (6 of 7) still counts as a strong week. Bouncing back is what matters.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion Rate Chart — Starter+ */}
        {features.betterAnalytics && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <SectionTitle icon={BarChart2} color="bg-primary/10 text-primary" title={`Completion Rate — ${periodLabel[period]}`} />
                <Tabs value={period} onValueChange={v => setPeriod(v as Period)}>
                  <TabsList className="h-8 rounded-xl">
                    <TabsTrigger value="daily"   className="text-xs px-3 rounded-lg" data-testid="tab-period-daily">Daily</TabsTrigger>
                    <TabsTrigger value="weekly"  className="text-xs px-3 rounded-lg" data-testid="tab-period-weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly" className="text-xs px-3 rounded-lg" data-testid="tab-period-monthly">Monthly</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {!hasData || chartData.every((d: any) => d.Total === 0) ? (
                <div className="h-48 flex flex-col items-center justify-center text-center gap-2">
                  <BarChart2 className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">No data yet — start checking in daily!</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={chartData} barGap={2} barCategoryGap="30%">
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", radius: 4 }} />
                    <Bar dataKey="Done"  fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600} animationEasing="ease-out" />
                    <Bar dataKey="Total" fill="hsl(var(--muted))"   radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600} animationBegin={60} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Completion % Trend — Starter+ */}
        {features.betterAnalytics && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <SectionTitle icon={TrendingUp} color="bg-primary/10 text-primary" title={`Completion % Trend — ${periodLabel[period]}`} subtitle="Your completion rate over time" />
            </CardHeader>
            <CardContent className="pt-0">
              {!hasData ? (
                <div className="h-48 flex flex-col items-center justify-center gap-2">
                  <TrendingUp className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">No data yet.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="completionGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone" dataKey="Completion %"
                      stroke="hsl(var(--primary))" strokeWidth={2.5}
                      fill="url(#completionGrad)"
                      dot={{ fill: "hsl(var(--primary))", r: 3, strokeWidth: 0 }}
                      isAnimationActive animationDuration={700} animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Day-of-week Patterns — Starter+ */}
        {features.betterAnalytics && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <SectionTitle icon={Calendar} color="bg-chart-2/10 text-chart-2" title="Day-of-week Patterns" subtitle="Which days you complete habits most consistently" />
            </CardHeader>
            <CardContent className="pt-0">
              {!hasDowData ? (
                <div className="h-32 flex flex-col items-center justify-center gap-2">
                  <Calendar className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">Check in for at least a week to see patterns.</p>
                </div>
              ) : (
                <div className="space-y-2.5" data-testid="dow-patterns">
                  {dayOfWeekStats.map(d => {
                    const pct      = d.doneRate;
                    const barColor = pct >= 70 ? "bg-chart-3" : pct >= 40 ? "bg-chart-4" : "bg-destructive/60";
                    return (
                      <div key={d.day} className="flex items-center gap-3">
                        <span className="text-xs font-semibold w-8 flex-shrink-0 text-muted-foreground">{d.shortDay}</span>
                        <div className="flex-1 h-5 bg-muted/50 rounded-lg overflow-hidden">
                          <div className={cn("h-full rounded-lg transition-all duration-700", barColor)}
                            style={{ width: d.totalCount > 0 ? `${pct}%` : "0%" }} />
                        </div>
                        <span className="text-xs font-bold w-9 text-right flex-shrink-0">
                          {d.totalCount > 0 ? `${pct}%` : "—"}
                        </span>
                        <span className="text-xs text-muted-foreground w-14 flex-shrink-0 hidden sm:block">
                          {d.totalCount > 0 ? `${d.doneCount}/${d.totalCount}` : ""}
                        </span>
                      </div>
                    );
                  })}
                  {(() => {
                    const withData = dayOfWeekStats.filter(d => d.totalCount > 0);
                    if (withData.length < 2) return null;
                    const best  = [...withData].sort((a, b) => b.doneRate - a.doneRate)[0];
                    const worst = [...withData].sort((a, b) => a.doneRate - b.doneRate)[0];
                    if (best.day === worst.day) return null;
                    return (
                      <div className="flex items-start gap-2 pt-3 border-t border-border/50 mt-1">
                        <Lightbulb className="w-3.5 h-3.5 text-chart-4 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Your strongest day is <span className="font-semibold text-foreground">{best.day}</span> ({best.doneRate}%).
                          {worst.doneRate < best.doneRate - 20 && (
                            <> Consider a fallback plan for <span className="font-semibold text-foreground">{worst.day}</span>s ({worst.doneRate}%).</>
                          )}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mood vs Completion + Difficulty vs Completion — Pro/Elite only */}
        {features.moodCorrelation && (hasMoodData || hasDifficultyData) && (
          <div className="grid md:grid-cols-2 gap-4">
            {hasMoodData && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <SectionTitle icon={Smile} color="bg-chart-5/10 text-chart-5" title="Mood vs. Completion" subtitle="How your pre-habit mood affects success" />
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2.5" data-testid="mood-correlation">
                    {moodBuckets.filter(b => b.count > 0).map(b => (
                      <div key={b.mood} className="flex items-center gap-3">
                        <span className="text-xs w-16 flex-shrink-0 text-muted-foreground font-medium">{b.label}</span>
                        <div className="flex-1 h-5 bg-muted/50 rounded-lg overflow-hidden">
                          <div className="h-full bg-chart-5/60 rounded-lg transition-all duration-700" style={{ width: `${b.completionPct}%` }} />
                        </div>
                        <span className="text-xs font-bold w-9 text-right flex-shrink-0">{b.completionPct}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {hasDifficultyData && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <SectionTitle icon={Dumbbell} color="bg-chart-4/10 text-chart-4" title="Difficulty vs. Completion" subtitle="How perceived difficulty affects follow-through" />
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2.5" data-testid="difficulty-correlation">
                    {difficultyBuckets.filter(b => b.count > 0).map(b => (
                      <div key={b.difficulty} className="flex items-center gap-3">
                        <span className="text-xs w-20 flex-shrink-0 text-muted-foreground font-medium">{b.label}</span>
                        <div className="flex-1 h-5 bg-muted/50 rounded-lg overflow-hidden">
                          <div className={cn("h-full rounded-lg transition-all duration-700",
                            b.completionPct >= 70 ? "bg-chart-3/70" : b.completionPct >= 40 ? "bg-chart-4/70" : "bg-destructive/50")}
                            style={{ width: `${b.completionPct}%` }} />
                        </div>
                        <span className="text-xs font-bold w-9 text-right flex-shrink-0">{b.completionPct}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Current + Best-ever streaks — Starter+ */}
        {features.betterAnalytics && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <SectionTitle icon={Flame} color="bg-chart-4/10 text-chart-4" title="Current Streaks" subtitle="Active streaks right now" />
              </CardHeader>
              <CardContent className="pt-0">
                {topStreaks.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-2 text-center">
                    <Flame className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">No active streaks yet. Keep checking in!</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {topStreaks.map(([systemId, streak], idx) => {
                      const sys = systems.find(s => s.id === systemId);
                      const pct = Math.min(100, ((streak as number) / Math.max(...topStreaks.map(([, v]) => v as number), 1)) * 100);
                      return (
                        <div key={systemId} className="space-y-1" data-testid={`streak-current-${systemId}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-bold text-muted-foreground w-4 flex-shrink-0">#{idx + 1}</span>
                              <span className="text-sm truncate">{sys?.title ?? "Unknown"}</span>
                            </div>
                            <div className="flex items-center gap-1 text-chart-4 font-extrabold flex-shrink-0">
                              <Flame className="w-3.5 h-3.5" />
                              {streak as number}d
                            </div>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-chart-4/60 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <SectionTitle icon={Star} color="bg-chart-2/10 text-chart-2" title="Best Streaks (All-time)" subtitle="Your personal records per system" />
              </CardHeader>
              <CardContent className="pt-0">
                {topBestStreakEntries.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-2 text-center">
                    <Star className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">Complete at least one check-in to see best streaks.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {topBestStreakEntries.map(([systemId, best], idx) => {
                      const sys = systems.find(s => s.id === systemId);
                      const current = streaks[systemId] ?? 0;
                      const isActive = current === best && current > 0;
                      return (
                        <div key={systemId} className="flex items-center justify-between gap-3" data-testid={`streak-best-${systemId}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-bold text-muted-foreground w-4 flex-shrink-0">#{idx + 1}</span>
                            <span className="text-sm truncate">{sys?.title ?? "Unknown"}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isActive && (
                              <Badge variant="outline" className="text-chart-3 border-chart-3/30 text-[10px] rounded-full">active 🔥</Badge>
                            )}
                            <div className="flex items-center gap-1 text-chart-2 font-extrabold">
                              <Star className="w-3 h-3" />
                              {best as number}d
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {topBestStreak > 0 && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground">
                          Personal record: <span className="font-bold text-foreground">{topBestStreak} days</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Most consistent + most missed systems — Starter+ */}
        {features.betterAnalytics && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <SectionTitle icon={Trophy} color="bg-chart-3/10 text-chart-3" title="Most Consistent Systems" subtitle="Ranked by completion rate" />
              </CardHeader>
              <CardContent className="pt-0">
                {mostConsistent.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">Check in at least 3 times to see rankings.</p>
                ) : (
                  <div className="space-y-3">
                    {mostConsistent.map((s, i) => (
                      <div key={s.systemId} data-testid={`consistent-system-${s.systemId}`}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-bold text-muted-foreground w-4">#{i + 1}</span>
                            <span className="text-sm truncate">{s.title}</span>
                          </div>
                          <Badge variant="outline" className="text-chart-3 border-chart-3/30 rounded-full text-xs flex-shrink-0">{s.pct}%</Badge>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-chart-3/70 rounded-full transition-all duration-700" style={{ width: `${s.pct}%` }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">{s.doneCount} done / {s.totalCheckins} check-ins</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <SectionTitle icon={AlertCircle} color="bg-destructive/10 text-destructive" title="Most Missed Systems" subtitle="Where to simplify or use fallback plans" />
              </CardHeader>
              <CardContent className="pt-0">
                {mostMissed.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-2 text-center">
                    <Trophy className="w-8 h-8 text-chart-3/40" />
                    <p className="text-muted-foreground text-sm">No missed check-ins yet — keep it up!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mostMissed.map((s, i) => {
                      const missRate = Math.round((s.missedCount / s.totalCheckins) * 100);
                      return (
                        <div key={s.systemId} data-testid={`missed-system-${s.systemId}`}>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-bold text-muted-foreground w-4">#{i + 1}</span>
                              <span className="text-sm truncate">{s.title}</span>
                            </div>
                            <Badge variant="outline" className="text-destructive border-destructive/30 rounded-full text-xs flex-shrink-0">{s.missedCount} missed</Badge>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-destructive/50 rounded-full" style={{ width: `${missRate}%` }} />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">{missRate}% miss rate · {s.totalCheckins} check-ins</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Completion by goal — Starter+ */}
        {features.betterAnalytics && goalCompletion.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <SectionTitle icon={Target} color="bg-primary/10 text-primary" title="Completion by Goal" subtitle="Average completion rate across all systems per goal" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {[...goalCompletion].sort((a, b) => b.avgPct - a.avgPct).map(gc => {
                  const barColor = gc.avgPct >= 80 ? "bg-chart-3/70" : gc.avgPct >= 50 ? "bg-chart-4/70" : "bg-destructive/50";
                  const badgeClass = gc.avgPct >= 80 ? "text-chart-3 border-chart-3/30" : gc.avgPct >= 50 ? "text-chart-4 border-chart-4/30" : "text-destructive border-destructive/30";
                  return (
                    <div key={gc.goalId} data-testid={`goal-completion-${gc.goalId}`}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm font-medium truncate">{gc.title}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">{gc.systemCount} system{gc.systemCount !== 1 ? "s" : ""}</span>
                          <Badge variant="outline" className={cn("rounded-full text-xs", badgeClass)}>{gc.avgPct}%</Badge>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${gc.avgPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goals by Category Chart — Starter+ */}
        {features.betterAnalytics && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <SectionTitle icon={Target} color="bg-primary/10 text-primary" title="Goals by Category" subtitle="How your goals are distributed across areas of life" />
            </CardHeader>
            <CardContent className="pt-0">
              {categoryData.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2 text-center">
                  <Target className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">Create goals to see categories.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(120, categoryData.length * 38)}>
                  <BarChart data={categoryData} layout="vertical" barSize={14}>
                    <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={90} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Bar dataKey="Goals" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={700} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Export Data Panel ── */}
        <Card className="overflow-hidden" data-testid="export-panel">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Download className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Export Your Data</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Download your progress history in CSV or PDF format</p>
                </div>
              </div>
              {features.csvPdfExport && hasData && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <Select value={exportRange} onValueChange={v => setExportRange(v as ExportRange)}>
                    <SelectTrigger className="h-8 w-36 text-xs rounded-lg" data-testid="select-export-range">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {features.csvPdfExport ? (
              <div className="space-y-4">
                {/* Range summary badge */}
                {hasData && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/50 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span>
                      <span className="font-semibold text-foreground">{filteredCheckins.length}</span> check-in{filteredCheckins.length !== 1 ? "s" : ""} selected
                      {exportRange !== "all" && (
                        <span className="ml-1">({exportRange === "7d" ? "last 7 days" : exportRange === "30d" ? "last 30 days" : "last 90 days"})</span>
                      )}
                      {exportRange === "all" && <span className="ml-1">(all time)</span>}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* CSV card */}
                  <div className="group rounded-xl border border-border bg-muted/20 p-4 hover:bg-muted/40 transition-colors flex flex-col">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <Download className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">CSV Spreadsheet</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Open in Excel, Google Sheets, or Numbers</p>
                      </div>
                    </div>
                    <ul className="space-y-1.5 mb-4 text-xs text-muted-foreground flex-1">
                      {[
                        "Full check-in log with dates, mood & notes",
                        "System performance, streaks & resilience",
                        "Goal completion breakdown",
                        "Day-of-week analysis",
                        "Excel-compatible (UTF-8 BOM)",
                      ].map(item => (
                        <li key={item} className="flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 mt-1" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      disabled={!hasData || isExportingCsv}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      data-testid="button-export-csv-panel"
                    >
                      {isExportingCsv ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" />Preparing…</>
                      ) : (
                        <><Download className="w-3.5 h-3.5" />Download CSV</>
                      )}
                    </button>
                  </div>

                  {/* PDF card */}
                  <div className="group rounded-xl border border-border bg-muted/20 p-4 hover:bg-muted/40 transition-colors flex flex-col">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">PDF Progress Report</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Polished report — share or print</p>
                      </div>
                    </div>
                    <ul className="space-y-1.5 mb-4 text-xs text-muted-foreground flex-1">
                      {[
                        "Summary stats with visual progress bars",
                        "System performance + consistency & resilience",
                        "Goal progress tables",
                        "Active streaks leaderboard",
                        "Day-of-week bar chart & mood analysis",
                      ].map(item => (
                        <li key={item} className="flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      disabled={!hasData || isExportingPdf}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      data-testid="button-export-pdf-panel"
                    >
                      {isExportingPdf ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" />Preparing…</>
                      ) : (
                        <><FileText className="w-3.5 h-3.5" />Generate PDF</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Mobile tip */}
                <p className="text-[11px] text-muted-foreground text-center leading-relaxed px-2">
                  PDF opens in a new tab — use your browser's print menu and choose <strong className="text-foreground">Save as PDF</strong>.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 sm:p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="font-semibold text-sm mb-1">Export is a Pro feature</p>
                <p className="text-xs text-muted-foreground mb-5 max-w-xs mx-auto leading-relaxed">
                  Upgrade to Pro or Elite to download your full progress as a CSV spreadsheet or a polished PDF report — with date range filtering, mood analysis, consistency scores, and more.
                </p>
                <Link href="/pricing">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors"
                    data-testid="button-export-upgrade"
                  >
                    Upgrade to Pro
                  </button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom spacer */}
        <div className="h-4" />
      </div>
    </div>
  );
}
