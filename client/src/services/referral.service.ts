import {
  collection, getDocs, query, where, updateDoc, doc, increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User } from "@/types/schema";
import { updateUser } from "./user.service";

const REFERRAL_FREEZE_REWARD = 1;

function generateCode(uid: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const seed = uid.replace(/[^a-zA-Z0-9]/g, "");
  for (let i = 0; i < 8; i++) {
    const idx = (seed.charCodeAt(i % seed.length) + i * 7) % chars.length;
    code += chars[idx];
  }
  return code;
}

export function getReferralCode(user: User): string {
  return user.referralCode || generateCode(user.id);
}

export async function ensureReferralCode(user: User): Promise<string> {
  if (user.referralCode) return user.referralCode;
  const code = generateCode(user.id);
  await updateUser(user.id, { referralCode: code } as any);
  return code;
}

export async function applyReferralCode(
  newUserId: string,
  code: string,
): Promise<{ success: boolean; referrerId?: string }> {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("referralCode", "==", code.toUpperCase().trim()));
    const snap = await getDocs(q);
    if (snap.empty) return { success: false };

    const referrerDoc = snap.docs[0];
    const referrerId = referrerDoc.id;

    if (referrerId === newUserId) return { success: false };

    await Promise.all([
      updateDoc(doc(db, "users", referrerId), {
        referralCount: increment(1),
        streakFreezes: increment(REFERRAL_FREEZE_REWARD),
      }),
      updateDoc(doc(db, "users", newUserId), {
        referredBy: referrerId,
        streakFreezes: increment(REFERRAL_FREEZE_REWARD),
      }),
    ]);

    return { success: true, referrerId };
  } catch {
    return { success: false };
  }
}

export function getReferralShareUrl(code: string): string {
  return `${window.location.origin}/?ref=${code}`;
}
