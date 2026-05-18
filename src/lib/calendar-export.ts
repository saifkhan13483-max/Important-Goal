import type { System } from "@/types/schema";

function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcs(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}@strivo.life`;
}

export function generateCalendarICS(systems: System[]): string {
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Strivo//Habit Systems//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Strivo Habits",
    "X-WR-CALDESC:Your daily habit systems from Strivo",
    "X-WR-TIMEZONE:UTC",
  ];

  const activeSystems = systems.filter(s => s.active !== false);

  for (const system of activeSystems) {
    const timeStr = system.preferredTime || "08:00";
    const [hours, minutes] = timeStr.split(":").map(Number);

    const startDate = new Date(now);
    startDate.setHours(hours, minutes, 0, 0);

    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 30);

    const freq = system.frequency === "weekly" ? "WEEKLY" : "DAILY";
    const summary = escapeIcs(system.title);
    const description = escapeIcs([
      system.minimumAction ? `Minimum action: ${system.minimumAction}` : "",
      system.triggerStatement ? `Trigger: ${system.triggerStatement}` : "",
      system.fallbackPlan ? `Fallback: ${system.fallbackPlan}` : "",
      "",
      "Track in Strivo: https://strivo.life/checkins",
    ].filter(Boolean).join("\\n"));

    lines.push(
      "BEGIN:VEVENT",
      `UID:${generateUID()}`,
      `DTSTART:${icsDate(startDate)}`,
      `DTEND:${icsDate(endDate)}`,
      `RRULE:FREQ=${freq}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT",
      `DTSTAMP:${icsDate(now)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICS(content: string, filename = "strivo-habits.ics"): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
