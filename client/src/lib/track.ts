/**
 * track.ts — Lightweight product analytics event tracker
 *
 * Events are stored in Firestore `analyticsEvents` collection (anonymous-safe)
 * and also forwarded to window.gtag if Google Analytics is configured.
 *
 * Usage:
 *   import { track } from "@/lib/track";
 *   track("checkin_completed", { status: "done", systemId: "..." });
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
  | "journal_entry_created";

type EventProps = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

let sessionId: string;
try {
  sessionId = sessionStorage.getItem("sf_session_id") ?? crypto.randomUUID();
  sessionStorage.setItem("sf_session_id", sessionId);
} catch {
  sessionId = "unknown";
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
