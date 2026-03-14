import {
  collection, getDocs, addDoc, query, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Template } from "@/types/schema";

export const STATIC_TEMPLATES: Template[] = [
  {
    id: "t1",
    title: "Morning Workout Starter",
    category: "fitness",
    description: "A simple system to build a consistent morning exercise habit without overwhelm.",
    identityStatement: "I am someone who moves their body every single morning.",
    triggerStatement: "After I brush my teeth, I will put on my workout clothes.",
    minimumAction: "Do 5 push-ups and a 1-minute stretch.",
    rewardPlan: "Make my favourite coffee as a reward after the workout.",
    fallbackPlan: "If I miss morning, I will do just 10 squats at any point before bed.",
    isPublic: true,
  },
  {
    id: "t2",
    title: "Daily Reading Habit",
    category: "reading",
    description: "Build a consistent reading habit with a low-friction approach.",
    identityStatement: "I am a person who reads every day and keeps learning.",
    triggerStatement: "After lunch, before I check my phone, I will open my book.",
    minimumAction: "Read just one page — even if I'm tired.",
    rewardPlan: "Track my pages in an app and celebrate milestones.",
    fallbackPlan: "Listen to an audiobook version if I cannot read physically.",
    isPublic: true,
  },
  {
    id: "t3",
    title: "Deep Work Session",
    category: "deep-work",
    description: "Protect your most important focused work with a reliable trigger.",
    identityStatement: "I am someone who does focused, meaningful work every day.",
    triggerStatement: "At 9am, I put on headphones and open my top priority task.",
    minimumAction: "Work for at least 25 minutes without checking messages.",
    rewardPlan: "Take a full 5-minute break outdoors after each session.",
    fallbackPlan: "Work for even 10 minutes if energy is low. Progress beats perfection.",
    isPublic: true,
  },
  {
    id: "t4",
    title: "Evening Journaling",
    category: "mindset",
    description: "End each day with intentional reflection to process emotions and grow.",
    identityStatement: "I am a reflective person who learns from every experience.",
    triggerStatement: "After dinner, before watching anything, I open my journal.",
    minimumAction: "Write 3 sentences about what happened today.",
    rewardPlan: "Read back an old entry after writing — feel the progress.",
    fallbackPlan: "Record a 60-second voice memo instead of writing.",
    isPublic: true,
  },
  {
    id: "t5",
    title: "Meditation Practice",
    category: "meditation",
    description: "Start a sustainable meditation habit that actually sticks.",
    identityStatement: "I am someone who takes time to be still and present.",
    triggerStatement: "After I wake up and drink water, I sit in my chair and close my eyes.",
    minimumAction: "Breathe deeply for 2 minutes. Nothing else needed.",
    rewardPlan: "Track my streak and share milestones with a friend.",
    fallbackPlan: "Take 5 deep breaths in the bathroom if I'm rushed.",
    isPublic: true,
  },
  {
    id: "t6",
    title: "Content Creation Sprint",
    category: "content-creation",
    description: "Build a consistent creative output habit for makers and creators.",
    identityStatement: "I am a creator who shows up consistently, even on hard days.",
    triggerStatement: "After my morning coffee, before email, I open my draft.",
    minimumAction: "Write 100 words or record 2 minutes of content.",
    rewardPlan: "Share one finished piece per week and note the responses.",
    fallbackPlan: "Save a single idea or sentence in my notes app — ideas compound.",
    isPublic: true,
  },
  {
    id: "t7",
    title: "Sleep Wind-Down",
    category: "sleep",
    description: "Protect your sleep quality with a calming end-of-day routine.",
    identityStatement: "I am someone who protects their sleep as a form of self-care.",
    triggerStatement: "When the clock hits 10pm, I put my phone face down and dim the lights.",
    minimumAction: "Spend 10 minutes away from all screens before bed.",
    rewardPlan: "Track how rested I feel each morning and celebrate improvement.",
    fallbackPlan: "Use blue light glasses if I need to use screens late.",
    isPublic: true,
  },
  {
    id: "t8",
    title: "Relationship Check-In",
    category: "relationship",
    description: "Nurture important relationships consistently with a simple weekly habit.",
    identityStatement: "I am someone who actively maintains meaningful connections.",
    triggerStatement: "Every Sunday evening, I look at my contacts and pick one person to message.",
    minimumAction: "Send a genuine message to one person — ask how they are.",
    rewardPlan: "Schedule a catch-up call and look forward to it.",
    fallbackPlan: "Leave a voice note if texting feels too formal.",
    isPublic: true,
  },
  {
    id: "t9",
    title: "Exam Preparation",
    category: "exam-prep",
    description: "Build a reliable daily study habit that compounds into exam mastery without burnout.",
    identityStatement: "I am a focused student who prepares consistently and performs with confidence.",
    triggerStatement: "After dinner, I clear my desk, open my notes, and begin with the hardest topic first.",
    minimumAction: "Study actively for 30 minutes — no phone, no music, just deep focus.",
    rewardPlan: "After each session, mark the topic complete and reward with 10 minutes of free time.",
    fallbackPlan: "If I can't do a full session, I will spend 10 minutes reviewing flashcards — any progress counts.",
    isPublic: true,
  },
];

/** Keep backward-compatible sync export for legacy callers */
export function getTemplates(): Template[] {
  return STATIC_TEMPLATES;
}

const col = () => collection(db, "templates");

/**
 * Fetch public templates from Firestore.
 * Falls back to static templates if the collection is empty or on error.
 */
export async function getPublicTemplates(): Promise<Template[]> {
  try {
    const q = query(col(), where("isPublic", "==", true));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const templates = snap.docs.map(d => ({ id: d.id, ...d.data() } as Template));
      return templates.sort((a, b) => (a.category ?? "").localeCompare(b.category ?? ""));
    }
    await seedPublicTemplates();
    const snap2 = await getDocs(q);
    if (!snap2.empty) {
      const templates = snap2.docs.map(d => ({ id: d.id, ...d.data() } as Template));
      return templates.sort((a, b) => (a.category ?? "").localeCompare(b.category ?? ""));
    }
    return STATIC_TEMPLATES;
  } catch {
    return STATIC_TEMPLATES;
  }
}

/**
 * Seed public templates to Firestore if the collection is empty.
 * Safe to call multiple times — only seeds when no templates exist.
 */
export async function seedPublicTemplates(): Promise<void> {
  try {
    const snap = await getDocs(col());
    if (!snap.empty) return;
    await Promise.all(
      STATIC_TEMPLATES.map(({ id: _id, ...rest }) => addDoc(col(), rest)),
    );
  } catch {
    // Silently ignore — static data is the fallback
  }
}
