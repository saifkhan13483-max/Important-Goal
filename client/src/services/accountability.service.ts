import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User } from "@/types/schema";
import { updateUser } from "./user.service";

export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const q = query(collection(db, "users"), where("email", "==", email.toLowerCase().trim()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as User;
  } catch {
    return null;
  }
}

export async function linkAccountabilityPartner(
  userId: string,
  partnerEmail: string,
): Promise<{ success: boolean; message: string; partner?: User }> {
  const partner = await findUserByEmail(partnerEmail);
  if (!partner) {
    return { success: false, message: "No Strivo account found with that email address." };
  }
  if (partner.id === userId) {
    return { success: false, message: "You can't add yourself as your own accountability partner." };
  }

  await updateUser(userId, {
    accountabilityPartnerId: partner.id,
    accountabilityPartnerEmail: partner.email,
    accountabilityPartnerName: partner.name,
  });

  return { success: true, message: `${partner.name} is now your accountability partner!`, partner };
}

export async function unlinkAccountabilityPartner(userId: string): Promise<void> {
  await updateUser(userId, {
    accountabilityPartnerId: null,
    accountabilityPartnerEmail: null,
    accountabilityPartnerName: null,
  });
}

export async function getPartnerPublicStats(partnerId: string): Promise<{
  name: string;
  activeSystems: number;
  todayDone: number;
  todayTotal: number;
  currentStreak: number;
  lastCheckInDate: string | null;
} | null> {
  try {
    const userQ = query(collection(db, "users"), where("__name__", "==", partnerId));
    const userSnap = await getDocs(userQ);
    if (userSnap.empty) return null;
    const data = userSnap.docs[0].data() as User;

    const todayKey = new Date().toISOString().split("T")[0];

    const systemsQ = query(collection(db, "systems"), where("userId", "==", partnerId));
    const systemsSnap = await getDocs(systemsQ);
    const activeSystems = systemsSnap.docs.filter(d => d.data().active !== false).length;

    const checkinsQ = query(collection(db, "checkins"), where("userId", "==", partnerId));
    const checkinsSnap = await getDocs(checkinsQ);
    const allCheckins = checkinsSnap.docs.map(d => d.data());

    const todayCheckins = allCheckins.filter(c => c.dateKey === todayKey);
    const todayDone = todayCheckins.filter(c => c.status === "done").length;

    let currentStreak = 0;
    const doneByDate = new Set(allCheckins.filter(c => c.status === "done").map(c => c.dateKey));
    const cur = new Date();
    for (let i = 0; i < 365; i++) {
      const key = cur.toISOString().split("T")[0];
      if (doneByDate.has(key)) { currentStreak++; cur.setDate(cur.getDate() - 1); }
      else break;
    }

    const sortedDates = [...doneByDate].sort().reverse();
    const lastCheckInDate = sortedDates[0] ?? null;

    return {
      name: data.name,
      activeSystems,
      todayDone,
      todayTotal: activeSystems,
      currentStreak,
      lastCheckInDate,
    };
  } catch {
    return null;
  }
}
