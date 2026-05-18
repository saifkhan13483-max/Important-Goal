import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User, PublicProfileData } from "@/types/schema";
import { getSystems } from "./systems.service";
import { getCheckins } from "./checkins.service";

export async function getPublicProfile(referralCode: string): Promise<PublicProfileData | null> {
  try {
    const q = query(collection(db, "users"), where("referralCode", "==", referralCode));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    const user = { id: d.id, ...d.data() } as User;
    if (!user.publicProfile) return null;

    const [systems, checkins] = await Promise.all([
      getSystems(user.id),
      getCheckins(user.id),
    ]);

    const doneCheckins = checkins.filter(c => c.status === "done");
    const dateKeys = new Set(doneCheckins.map(c => c.dateKey));
    const sortedDays = [...dateKeys].sort();

    let bestStreak = 0;
    let currentStreak = 0;
    if (sortedDays.length > 0) {
      let s = 1;
      for (let i = 1; i < sortedDays.length; i++) {
        const prev = new Date(sortedDays[i - 1]);
        const curr = new Date(sortedDays[i]);
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          s++;
          if (s > bestStreak) bestStreak = s;
        } else {
          s = 1;
        }
      }
      if (s > bestStreak) bestStreak = s;

      const today = new Date().toISOString().slice(0, 10);
      const lastDay = sortedDays[sortedDays.length - 1];
      if (lastDay === today || lastDay === new Date(Date.now() - 86400000).toISOString().slice(0, 10)) {
        currentStreak = 1;
        for (let i = sortedDays.length - 2; i >= 0; i--) {
          const prev = new Date(sortedDays[i]);
          const curr = new Date(sortedDays[i + 1]);
          const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
          if (diff === 1) currentStreak++;
          else break;
        }
      }
    }

    return {
      userId: user.id,
      name: user.name,
      identityStatement: user.identityStatement,
      focusArea: user.focusArea,
      activeSystems: systems.filter(s => s.active !== false).length,
      bestStreak,
      totalCheckins: doneCheckins.length,
      joinedAt: user.createdAt,
      achievements: user.unlockedAchievements ?? [],
    };
  } catch {
    return null;
  }
}

export function generateReferralCode(userId: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const seed = userId.slice(0, 8);
  for (let i = 0; i < 8; i++) {
    const idx = (seed.charCodeAt(i % seed.length) + i * 17) % chars.length;
    code += chars[idx];
  }
  return code;
}
