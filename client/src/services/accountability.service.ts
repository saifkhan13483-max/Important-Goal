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
} | null> {
  try {
    const q = query(collection(db, "users"), where("__name__", "==", partnerId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const data = snap.docs[0].data() as User;
    return {
      name: data.name,
      activeSystems: 0,
    };
  } catch {
    return null;
  }
}
