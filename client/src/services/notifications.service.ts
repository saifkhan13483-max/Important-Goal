import {
  collection, doc, addDoc, getDocs, updateDoc, query, where, orderBy, limit, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppNotification } from "@/types/schema";

const col = () => collection(db, "notifications");

export async function getNotifications(userId: string, maxCount = 30): Promise<AppNotification[]> {
  try {
    const q = query(col(), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(maxCount));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
  } catch {
    return [];
  }
}

export async function addNotification(
  userId: string,
  data: Omit<AppNotification, "id" | "userId" | "read" | "createdAt">,
): Promise<void> {
  try {
    await addDoc(col(), {
      ...data,
      userId,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // silent
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "notifications", notificationId), { read: true });
  } catch {
    // silent
  }
}

export async function markAllRead(userId: string): Promise<void> {
  try {
    const q = query(col(), where("userId", "==", userId), where("read", "==", false));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  } catch {
    // silent
  }
}
