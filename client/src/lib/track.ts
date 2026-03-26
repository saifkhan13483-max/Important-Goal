/**
 * track.ts — Lightweight product analytics event tracker
 *
 * Events are stored in Firestore `analyticsEvents` collection (anonymous-safe)
 * and also forwarded to Google Analytics if VITE_GA_MEASUREMENT_ID is set.
 *
 * Usage:
 *   import { track } from "@/lib/track";
 *   track("checkin_completed", { status: "done", systemId: "..." });
 *
 * To enable Google Analytics:
 *   Set VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX in your environment variables.
 */

import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type EventName =
  | "page_view"
  | "signup_started"
  | "signup_completed"
  | "login"
  | "goal_created"
  | "system_created"
  | "checkin_completed"
  | "checkin_missed"
  | "onboarding_completed"
  | "template_used"
  | "ai_coach_opened"
  | "streak_shared"
  | "upgrade_clicked"
  | "newsletter_subscribed"
  | "journal_entry_created"
  | "hero_cta_click"
  | "sticky_cta_click";

type EventProps = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

let sessionId: string;
try {
  sessionId = sessionStorage.getItem("strivo_session_id") ?? crypto.randomUUID();
  sessionStorage.setItem("strivo_session_id", sessionId);
} catch {
  sessionId = "unknown";
}

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
let gaLoaded = false;

function loadGA(id: string) {
  if (gaLoaded || typeof window === "undefined") return;
  gaLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer!.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", id, { page_path: window.location.pathname, send_page_view: true });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);
}

if (GA_ID && !GA_ID.includes("X")) {
  loadGA(GA_ID);
}

export function track(event: EventName, props: EventProps = {}): void {
  const payload = {
    event,
    sessionId,
    timestamp: new Date().toISOString(),
    path: typeof window !== "undefined" ? window.location.pathname : "/",
    ...props,
  };

  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, props);
  }

  addDoc(collection(db, "analyticsEvents"), payload).catch(() => {});
}
