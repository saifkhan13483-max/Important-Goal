/**
 * emailjs.ts — Welcome, drip, and weekly report emails via EmailJS
 *
 * Configure environment variables:
 *   VITE_EMAILJS_SERVICE_ID        — EmailJS Service ID
 *   VITE_EMAILJS_PUBLIC_KEY        — EmailJS Public Key
 *   VITE_EMAILJS_WELCOME_TEMPLATE  — Template ID for newsletter welcome emails
 *   VITE_EMAILJS_SIGNUP_TEMPLATE   — Template ID for new account welcome emails
 *   VITE_EMAILJS_WEEKLY_TEMPLATE   — Template ID for weekly progress reports
 *
 * Template variables:
 *   Newsletter:    {{email}}, {{app_name}}, {{app_url}}
 *   Signup:        {{email}}, {{name}}, {{app_name}}, {{dashboard_url}}, {{first_step_url}}
 *   Weekly report: {{email}}, {{name}}, {{completion_rate}}, {{current_streak}},
 *                  {{best_streak}}, {{checkins_this_week}}, {{active_systems}},
 *                  {{dashboard_url}}, {{app_name}}
 */

import emailjs from "@emailjs/browser";

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID       as string | undefined;
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY       as string | undefined;
const WELCOME_TPL = import.meta.env.VITE_EMAILJS_WELCOME_TEMPLATE as string | undefined;
const SIGNUP_TPL  = import.meta.env.VITE_EMAILJS_SIGNUP_TEMPLATE  as string | undefined;
const WEEKLY_TPL  = import.meta.env.VITE_EMAILJS_WEEKLY_TEMPLATE  as string | undefined;

function isConfigured(): boolean {
  return !!(SERVICE_ID && PUBLIC_KEY);
}

function init() {
  if (isConfigured()) {
    emailjs.init({ publicKey: PUBLIC_KEY! });
  }
}

init();

export async function sendNewsletterWelcome(email: string): Promise<void> {
  if (!isConfigured() || !WELCOME_TPL) return;
  try {
    await emailjs.send(SERVICE_ID!, WELCOME_TPL, {
      email,
      app_name: "Strivo",
      app_url: "https://strivo.life",
    });
  } catch (err) {
    console.warn("[EmailJS] Newsletter welcome send failed:", err);
  }
}

export async function sendSignupWelcome(name: string, email: string): Promise<void> {
  if (!isConfigured() || !SIGNUP_TPL) return;
  try {
    await emailjs.send(SERVICE_ID!, SIGNUP_TPL, {
      email,
      name: name || "there",
      app_name: "Strivo",
      dashboard_url: "https://strivo.life/dashboard",
      first_step_url: "https://strivo.life/systems/new",
    });
  } catch (err) {
    console.warn("[EmailJS] Signup welcome send failed:", err);
  }
}

export interface WeeklyReportData {
  name: string;
  email: string;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
  checkinsThisWeek: number;
  activeSystems: number;
}

export async function sendWeeklyReport(data: WeeklyReportData): Promise<void> {
  if (!isConfigured() || !WEEKLY_TPL) return;
  try {
    await emailjs.send(SERVICE_ID!, WEEKLY_TPL, {
      email: data.email,
      name: data.name || "there",
      completion_rate: `${data.completionRate}%`,
      current_streak: `${data.currentStreak} day${data.currentStreak !== 1 ? "s" : ""}`,
      best_streak: `${data.bestStreak} day${data.bestStreak !== 1 ? "s" : ""}`,
      checkins_this_week: String(data.checkinsThisWeek),
      active_systems: String(data.activeSystems),
      dashboard_url: "https://strivo.life/dashboard",
      app_name: "Strivo",
    });
  } catch (err) {
    console.warn("[EmailJS] Weekly report send failed:", err);
  }
}

export function isWeeklyReportDue(): boolean {
  const lastSent = localStorage.getItem("strivo_weekly_report_sent");
  if (!lastSent) return true;
  const daysSince = (Date.now() - new Date(lastSent).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= 7;
}

export function markWeeklyReportSent(): void {
  localStorage.setItem("strivo_weekly_report_sent", new Date().toISOString());
}
